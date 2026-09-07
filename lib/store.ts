import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { actions, clarifications, dictionaryEntries, memories, memoryDecisions, memorySources, settings, shortcuts, transcripts } from "@/db/schema";
import { extractCandidates, retrievalScore } from "@/lib/memory-engine";

export type TranscriptInput = {
  rawText: string;
  formattedText?: string;
  app: string;
  project: string;
  occurredAt?: string;
};

const seedRecords: TranscriptInput[] = [
  { rawText: "we finally decided to launch atlas with the guided onboarding flow", formattedText: "We finally decided to launch Atlas with the guided onboarding flow.", app: "Slack", project: "Atlas", occurredAt: "2026-09-02T09:15:00Z" },
  { rawText: "rohan leads the backend rollout for atlas", formattedText: "Rohan leads the backend rollout for Atlas.", app: "Meeting", project: "Atlas", occurredAt: "2026-09-02T10:10:00Z" },
  { rawText: "i will send the revised rollout brief by friday", formattedText: "I will send the revised rollout brief by Friday.", app: "Gmail", project: "Atlas", occurredAt: "2026-09-02T14:30:00Z" },
  { rawText: "the atlas product review is due friday", formattedText: "The Atlas product review is due Friday.", app: "Calendar", project: "Atlas", occurredAt: "2026-09-03T08:20:00Z" },
  { rawText: "i prefer project updates to start with decisions and blockers", formattedText: "I prefer project updates to start with decisions and blockers.", app: "Docs", project: "Work style", occurredAt: "2026-09-03T11:40:00Z" },
  { rawText: "maybe we could use a blue icon not sure yet", formattedText: "Maybe we could use a blue icon; I’m not sure yet.", app: "Figma", project: "Atlas", occurredAt: "2026-09-03T16:05:00Z" },
  { rawText: "we finally decided the beta will stay invite only", formattedText: "We finally decided the beta will stay invite-only.", app: "Meeting", project: "Atlas", occurredAt: "2026-09-04T09:00:00Z" },
  { rawText: "i will prepare the beta invite list before the product review", formattedText: "I will prepare the beta invite list before the product review.", app: "Slack", project: "Atlas", occurredAt: "2026-09-04T09:12:00Z" },
];

function inferExpiry(text: string, occurredAt?: string) {
  const base = occurredAt ? new Date(occurredAt) : new Date();
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return new Date(`${iso[1]}T23:59:59Z`).toISOString();
  const names = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const found = names.findIndex((day) => new RegExp(`\\b${day}\\b`, "i").test(text));
  if (found >= 0) {
    const daysAhead = (found - base.getUTCDay() + 7) % 7 || 7;
    const result = new Date(base);
    result.setUTCDate(result.getUTCDate() + daysAhead);
    result.setUTCHours(23, 59, 59, 999);
    return result.toISOString();
  }
  return null;
}

function retentionScore(memory: { importance:number; confidence:number; useCount:number; createdAt:string; lastUsedAt:string|null }) {
  const reference = memory.lastUsedAt || memory.createdAt;
  const ageDays = Math.max(0, (Date.now() - new Date(reference).getTime()) / 86_400_000);
  const recency = Math.max(0, 1 - ageDays / 180);
  const reuse = Math.min(1, memory.useCount / 5);
  const userImportance = Math.min(1, memory.importance / 3);
  const relevance = memory.confidence;
  return Number((recency * 0.35 + reuse * 0.3 + userImportance * 0.25 + relevance * 0.1).toFixed(3));
}

export async function ingestTranscript(input: TranscriptInput) {
  const db = getDb();
  const [dictionary, shortcutRows] = await Promise.all([db.select().from(dictionaryEntries), db.select().from(shortcuts)]);
  const baseText = input.formattedText?.trim() || input.rawText.trim();
  const shortcutExpanded = shortcutRows.reduce((text, entry) => text.replace(new RegExp(`\\b${entry.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), entry.expansion), baseText);
  const formattedText = dictionary.reduce((text, entry) => text.replace(new RegExp(`\\b${entry.heardAs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), entry.writeAs), shortcutExpanded);
  const [transcript] = await db.insert(transcripts).values({
    rawText: input.rawText.trim(), formattedText, app: input.app, project: input.project,
    occurredAt: input.occurredAt || new Date().toISOString(),
  }).returning();

  const [currentSettings] = await db.select().from(settings).limit(1);
  if (currentSettings && !currentSettings.memoryConsent) {
    const decisions = [{ outcome: "ignored_no_consent", reason: "Semantic memory is paused by the user" }];
    await db.insert(memoryDecisions).values({ transcriptId: transcript.id, outcome: decisions[0].outcome, reason: decisions[0].reason });
    return { transcript, decisions };
  }

  const candidates = extractCandidates(formattedText, input.project).map((candidate) => candidate.kind === "deadline" ? { ...candidate, expiresAt: inferExpiry(formattedText, input.occurredAt) } : candidate);
  const decisions: Array<{ outcome: string; memoryId?: number; reason: string }> = [];

  for (const candidate of candidates) {
    if (candidate.confidence < 0.7) {
      decisions.push({ outcome: "rejected", reason: candidate.reason });
      continue;
    }

    const [existing] = await db.select().from(memories).where(and(eq(memories.subject, candidate.subject), eq(memories.status, "active"))).orderBy(desc(memories.updatedAt)).limit(1);
    const isCorrection = /\b(?:correction|actually|moved to|not .+, (?:it is|it's)|instead)\b/i.test(formattedText);

    if (existing && existing.value.toLowerCase() !== candidate.value.toLowerCase()) {
      if (isCorrection) {
        await db.update(memories).set({ status: "superseded", updatedAt: new Date().toISOString() }).where(eq(memories.id, existing.id));
      } else {
        const [pending] = await db.insert(memories).values({ ...candidate, project: input.project, status: "pending" }).returning();
        await db.insert(memorySources).values({ memoryId: pending.id, transcriptId: transcript.id, relation: "conflicts", excerpt: formattedText });
        await db.insert(clarifications).values({ subject: candidate.subject, question: `I found two different versions of ${candidate.subject.toLowerCase()}. Which should I keep?`, memoryIds: JSON.stringify([existing.id, pending.id]) });
        decisions.push({ outcome: "needs_clarification", memoryId: pending.id, reason: "Conflicts with an active memory" });
        continue;
      }
    }

    const [memory] = await db.insert(memories).values({ ...candidate, project: input.project, status: "active" }).returning();
    await db.insert(memorySources).values({ memoryId: memory.id, transcriptId: transcript.id, relation: isCorrection ? "supersedes" : "created", excerpt: formattedText });
    decisions.push({ outcome: isCorrection ? "superseded_and_created" : "created", memoryId: memory.id, reason: candidate.reason });
  }

  if (!decisions.length) decisions.push({ outcome: "ignored", reason: "No durable fact, decision, commitment, deadline, or explicit preference cue was detected" });
  for (const decision of decisions) await db.insert(memoryDecisions).values({ transcriptId: transcript.id, memoryId: decision.memoryId, outcome: decision.outcome, reason: decision.reason });
  return { transcript, decisions };
}

export async function ensureSeeded() {
  const db = getDb();
  const existingSettings = await db.select().from(settings).limit(1);
  if (existingSettings.length) return;
  await db.insert(settings).values({ id: 1, memoryConsent: true, authorityLevel: "confirm" });
  for (const record of seedRecords) await ingestTranscript(record);
}

export async function getState() {
  await ensureSeeded();
  const db = getDb();
  const now = new Date().toISOString();
  const activeRows = await db.select().from(memories).where(eq(memories.status, "active"));
  for (const memory of activeRows) {
    const score = retentionScore(memory);
    const ageDays = (Date.now() - new Date(memory.createdAt).getTime()) / 86_400_000;
    if ((memory.expiresAt && memory.expiresAt < now) || (ageDays > 180 && score < 0.35)) await db.update(memories).set({ status: "inactive", updatedAt: now }).where(eq(memories.id, memory.id));
  }
  const inactiveRows = await db.select().from(memories).where(eq(memories.status, "inactive"));
  for (const memory of inactiveRows) {
    const inactiveDays = (Date.now() - new Date(memory.updatedAt).getTime()) / 86_400_000;
    if (inactiveDays > 30) {
      await db.update(memories).set({ status: "archived", value: "Minimal retired record", updatedAt: now }).where(eq(memories.id, memory.id));
      await db.delete(memorySources).where(eq(memorySources.memoryId, memory.id));
    }
  }
  const [memoryRows, transcriptRows, sourceRows, decisionRows, clarificationRows, actionRows, settingRows, dictionaryRows, shortcutRows] = await Promise.all([
    db.select().from(memories).orderBy(desc(memories.updatedAt)),
    db.select().from(transcripts).orderBy(desc(transcripts.occurredAt)),
    db.select().from(memorySources).orderBy(desc(memorySources.id)),
    db.select().from(memoryDecisions).orderBy(desc(memoryDecisions.id)),
    db.select().from(clarifications).orderBy(desc(clarifications.id)),
    db.select().from(actions).orderBy(desc(actions.id)),
    db.select().from(settings).limit(1),
    db.select().from(dictionaryEntries).orderBy(desc(dictionaryEntries.id)),
    db.select().from(shortcuts).orderBy(desc(shortcuts.id)),
  ]);
  const enrichedMemories = memoryRows.map((memory) => ({
    ...memory,
    retentionScore: retentionScore(memory),
    sources: sourceRows.filter((source) => source.memoryId === memory.id).map((source) => ({
      ...source,
      transcript: transcriptRows.find((transcript) => transcript.id === source.transcriptId),
    })),
  }));
  return { memories: enrichedMemories, transcripts: transcriptRows, decisions: decisionRows, clarifications: clarificationRows, actions: actionRows, settings: settingRows[0], dictionary: dictionaryRows, shortcuts: shortcutRows };
}

export async function answerQuestion(question: string) {
  const state = await getState();
  const ranked = state.memories
    .map((memory) => ({ memory, score: retrievalScore(question, memory) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (!ranked.length) {
    return { answer: "I couldn’t find enough supported information in your work history to answer that.", abstained: true, sources: [], action: null };
  }

  const top = ranked.map(({ memory }) => memory);
  const decisions = top.filter((item) => item.kind === "decision");
  const commitments = top.filter((item) => item.kind === "commitment");
  const deadlines = top.filter((item) => item.kind === "deadline");
  const facts = top.filter((item) => item.kind === "fact");
  const parts: string[] = [];
  if (decisions.length) parts.push(`The recorded decision is: ${decisions.map((item) => item.value).join(" Also, ")}`);
  if (commitments.length) parts.push(`Your recorded commitment is to ${commitments.map((item) => item.value).join("; ")}`);
  if (deadlines.length) parts.push(`The relevant timing record says: ${deadlines[0].value}`);
  if (facts.length) parts.push(`Relevant ownership: ${facts.map((item) => item.value).join("; ")}`);
  if (!parts.length) parts.push(top.map((item) => item.value).join(" "));

  for (const { memory } of ranked) {
    await getDb().update(memories).set({ useCount: memory.useCount + 1, lastUsedAt: new Date().toISOString() }).where(eq(memories.id, memory.id));
  }

  let createdAction = null;
  if (/\b(?:prepare|draft|create)\b/i.test(question)) {
    const title = `Draft update for ${top[0].project}`;
    const payload = `Decisions and blockers\n\n${parts.join("\n\n")}`;
    const actionStatus = state.settings.authorityLevel === "suggest" ? "suggested" : state.settings.authorityLevel === "autonomous" ? "confirmed" : "awaiting_confirmation";
    [createdAction] = await getDb().insert(actions).values({ kind: "draft_update", title, payload, authority: state.settings.authorityLevel, status: actionStatus }).returning();
  }

  return { answer: parts.join("\n\n"), abstained: false, sources: top, action: createdAction };
}

export async function resetAndSeed() {
  const db = getDb();
  await db.delete(memorySources);
  await db.delete(memoryDecisions);
  await db.delete(clarifications);
  await db.delete(actions);
  await db.delete(memories);
  await db.delete(transcripts);
  await db.delete(settings);
  await db.delete(dictionaryEntries);
  await db.delete(shortcuts);
  await ensureSeeded();
  return getState();
}

export async function addDictionaryEntry(input: { heardAs?: string; writeAs?: string }) {
  const heardAs = input.heardAs?.trim(); const writeAs = input.writeAs?.trim();
  if (!heardAs || !writeAs) throw new Error("Both the spoken term and the preferred spelling are required.");
  await getDb().insert(dictionaryEntries).values({ heardAs, writeAs });
  return getState();
}

export async function removeDictionaryEntry(id: number) { await getDb().delete(dictionaryEntries).where(eq(dictionaryEntries.id, id)); return getState(); }
export async function addShortcut(input: { phrase?: string; expansion?: string }) {
  const phrase = input.phrase?.trim(); const expansion = input.expansion?.trim();
  if (!phrase || !expansion) throw new Error("Both the shortcut and its expansion are required.");
  await getDb().insert(shortcuts).values({ phrase, expansion }); return getState();
}
export async function removeShortcut(id: number) { await getDb().delete(shortcuts).where(eq(shortcuts.id, id)); return getState(); }

export async function resolveClarification(clarificationId: number, selectedMemoryId: number) {
  const db = getDb();
  const [clarification] = await db.select().from(clarifications).where(eq(clarifications.id, clarificationId)).limit(1);
  if (!clarification || clarification.status !== "open") throw new Error("This clarification is no longer open.");
  const memoryIds = JSON.parse(clarification.memoryIds) as number[];
  if (!memoryIds.includes(selectedMemoryId)) throw new Error("The selected memory is not part of this clarification.");
  const now = new Date().toISOString();
  for (const memoryId of memoryIds) {
    await db.update(memories).set({ status: memoryId === selectedMemoryId ? "active" : "superseded", updatedAt: now }).where(eq(memories.id, memoryId));
  }
  await db.update(clarifications).set({ status: "resolved" }).where(eq(clarifications.id, clarificationId));
  return getState();
}

export async function retireMemory(memoryId: number) {
  const [memory] = await getDb().select().from(memories).where(eq(memories.id, memoryId)).limit(1);
  if (!memory) throw new Error("Memory not found.");
  await getDb().update(memories).set({ status: "inactive", updatedAt: new Date().toISOString() }).where(eq(memories.id, memoryId));
  return getState();
}

export async function updateSettings(input: { memoryConsent?: boolean; authorityLevel?: string }) {
  const allowed = ["suggest", "confirm", "autonomous"];
  if (input.authorityLevel && !allowed.includes(input.authorityLevel)) throw new Error("Unknown authority level.");
  await getDb().update(settings).set({ ...(typeof input.memoryConsent === "boolean" ? { memoryConsent: input.memoryConsent } : {}), ...(input.authorityLevel ? { authorityLevel: input.authorityLevel } : {}), updatedAt: new Date().toISOString() }).where(eq(settings.id, 1));
  return getState();
}

export async function decideAction(actionId: number, decision: "confirmed" | "dismissed") {
  const [action] = await getDb().select().from(actions).where(eq(actions.id, actionId)).limit(1);
  if (!action) throw new Error("Action not found.");
  await getDb().update(actions).set({ status: decision }).where(eq(actions.id, actionId));
  return getState();
}

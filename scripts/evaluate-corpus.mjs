import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { extractCandidates, retrievalScore } from "../lib/memory-engine.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rows = (await readFile(path.join(root, "data", "corpus.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
const started = performance.now();
const traces = [];
let tp = 0, fp = 0, fn = 0, correctKind = 0, abstentionCorrect = 0;
let extractionMs = 0, retrievalMs = 0, databaseBytes = 0;

for (const row of rows) {
  const extractionStarted = performance.now();
  const candidates = extractCandidates(row.formatted_output, row.project);
  extractionMs += performance.now() - extractionStarted;
  const accepted = candidates.filter((candidate) => candidate.confidence >= 0.7);
  const expectedAccepted = row.expected.outcome === "created";
  const actualAccepted = accepted.length > 0;
  if (expectedAccepted && actualAccepted) tp++;
  if (!expectedAccepted && actualAccepted) fp++;
  if (expectedAccepted && !actualAccepted) fn++;
  if (expectedAccepted && accepted[0]?.kind === row.expected.kind) correctKind++;
  const retrievalStarted = performance.now();
  const score = accepted[0] ? retrievalScore(row.expected.query, { ...accepted[0], project: row.project, status: "active" }) : 0;
  retrievalMs += performance.now() - retrievalStarted;
  const abstained = score === 0;
  if ((!expectedAccepted && abstained) || (expectedAccepted && !abstained)) abstentionCorrect++;
  traces.push({
    id: row.id,
    original_input: row.raw_asr,
    formatted_input: row.formatted_output,
    metadata: { app: row.app, project: row.project, occurred_at: row.occurred_at },
    expected_memory_decision: row.expected,
    actual_memory_decision: actualAccepted ? { outcome: "created", kind: accepted[0].kind, confidence: accepted[0].confidence } : { outcome: candidates.length ? "rejected" : "ignored", kind: candidates[0]?.kind ?? null, confidence: candidates[0]?.confidence ?? null },
    provenance: actualAccepted ? { source_record_id: row.id, excerpt: row.formatted_output, relation: "created" } : null,
    hey_kivi_behavior: { query: row.expected.query, outcome: abstained ? "abstained" : "answered", retrieval_score: score },
    reason: accepted[0]?.reason ?? candidates[0]?.reason ?? "No durable memory cue detected",
    passed: expectedAccepted === actualAccepted && (!expectedAccepted || accepted[0]?.kind === row.expected.kind) && ((!expectedAccepted && abstained) || (expectedAccepted && !abstained)),
  });
  databaseBytes += Buffer.byteLength(JSON.stringify({ transcript: row, memories: accepted, provenance: actualAccepted ? row.formatted_output : null }));
}

const precision = tp / (tp + fp || 1), recall = tp / (tp + fn || 1);
const summary = {
  generated_at: new Date().toISOString(),
  corpus_size: rows.length,
  accepted_expected: rows.filter((r) => r.expected.outcome === "created").length,
  ignored_or_rejected_expected: rows.filter((r) => r.expected.outcome !== "created").length,
  passed: traces.filter((t) => t.passed).length,
  failed: traces.filter((t) => !t.passed).length,
  metrics: {
    extraction_precision: Number(precision.toFixed(4)),
    extraction_recall: Number(recall.toFixed(4)),
    extraction_f1: Number(((2 * precision * recall) / (precision + recall || 1)).toFixed(4)),
    kind_accuracy: Number((correctKind / (rows.filter((r) => r.expected.outcome === "created").length || 1)).toFixed(4)),
    answer_or_abstention_accuracy: Number((abstentionCorrect / rows.length).toFixed(4)),
  },
  runtime_ms: Number((performance.now() - started).toFixed(2)),
  latency_ms: { extraction_total: Number(extractionMs.toFixed(2)), retrieval_total: Number(retrievalMs.toFixed(2)), end_to_end_total: Number((performance.now() - started).toFixed(2)) },
  database_growth: { bytes: databaseBytes, kibibytes: Number((databaseBytes / 1024).toFixed(2)), measurement: "Serialized equivalent of transcripts, accepted memories, and provenance" },
  model_usage: { calls: 0, input_tokens: 0, output_tokens: 0, explanation: "Deterministic baseline uses no model API" },
  estimated_model_cost_usd: 0,
  notes: ["Deterministic baseline; no model API or hidden judge used.", "Every trace retains original input, decision, provenance, retrieval behavior, and reason."],
};

await mkdir(path.join(root, "public"), { recursive: true });
await writeFile(path.join(root, "data", "evaluation-traces.jsonl"), `${traces.map((trace) => JSON.stringify(trace)).join("\n")}\n`);
await writeFile(path.join(root, "data", "evaluation-results.json"), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(path.join(root, "public", "evaluation-results.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

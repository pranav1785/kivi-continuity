export type CandidateMemory = {
  kind: "decision" | "commitment" | "deadline" | "fact" | "preference";
  subject: string;
  value: string;
  confidence: number;
  importance: number;
  expiresAt?: string | null;
  reason: string;
};

const normalize = (value: string) => value.trim().replace(/\s+/g, " ");

export function extractCandidates(text: string, project: string): CandidateMemory[] {
  const clean = normalize(text);
  const lower = clean.toLowerCase();
  const results: CandidateMemory[] = [];

  const decision = clean.match(/(?:we (?:finally )?(?:decided|agreed|selected|chose)(?: that| to)?|final decision(?: is|:)?)[\s:—-]+(.+)/i);
  if (decision) results.push({ kind: "decision", subject: `${project} decision`, value: normalize(decision[1]), confidence: 0.96, importance: 3, reason: "Explicit decision language" });

  const commitment = clean.match(/(?:i will|i'll|i committed to|my action is to)\s+(.+)/i);
  if (commitment) results.push({ kind: "commitment", subject: `${project} commitment`, value: normalize(commitment[1]), confidence: 0.94, importance: 3, reason: "Explicit first-person commitment" });

  const deadlineCue = /\b(?:due|deadline|review|launch|submit|presentation)\b/i.test(clean);
  const date = clean.match(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\b/i);
  if (deadlineCue && date) results.push({ kind: "deadline", subject: `${project} deadline`, value: clean, confidence: 0.9, importance: 3, expiresAt: null, reason: "Date paired with deadline or milestone language" });

  const preference = clean.match(/(?:i (?:always )?prefer|please always|my preference is)\s+(.+)/i);
  if (preference) results.push({ kind: "preference", subject: `${project} working preference`, value: normalize(preference[1]), confidence: 0.9, importance: 2, reason: "Explicit durable preference" });

  const relation = clean.match(/([A-Z][a-z]+)\s+(?:is leading|leads|owns|is responsible for)\s+(.+)/);
  if (relation) results.push({ kind: "fact", subject: `${project} ownership`, value: `${relation[1]} — ${normalize(relation[2])}`, confidence: 0.88, importance: 2, reason: "Named ownership relationship" });

  if (/\b(?:maybe|might|not sure|could perhaps|just thinking)\b/i.test(lower)) {
    return results.map((item) => ({ ...item, confidence: Math.min(item.confidence, 0.54), reason: `${item.reason}; uncertainty language detected` }));
  }

  return results;
}

export function retrievalScore(query: string, memory: { subject: string; value: string; project: string; status: string }) {
  if (memory.status !== "active") return 0;
  const tokens = new Set(query.toLowerCase().match(/[a-z0-9]+/g)?.filter((token) => token.length > 2) ?? []);
  const haystack = `${memory.subject} ${memory.value} ${memory.project}`.toLowerCase();
  let score = 0;
  for (const token of tokens) if (haystack.includes(token)) score += 1;
  if (/what did we (?:decide|agree)/i.test(query) && memory.subject.includes("decision")) score += 4;
  if (/what (?:did i|am i) (?:promise|commit|responsible)/i.test(query) && memory.subject.includes("commitment")) score += 4;
  if (/when|deadline|due/i.test(query) && memory.subject.includes("deadline")) score += 4;
  // A lone shared token (often only the project name) is not enough evidence
  // to answer a factual question. Require either semantic intent or at least
  // two lexical matches so unsupported questions correctly abstain.
  return score >= 2 ? score : 0;
}

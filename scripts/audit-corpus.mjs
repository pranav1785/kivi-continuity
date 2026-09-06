import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { extractCandidates, retrievalScore } from "../lib/memory-engine.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rows = (await readFile(path.join(root, "data", "corpus.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
if (rows.length !== 500) throw new Error(`Expected 500 synthetic records, received ${rows.length}`);

const ids = new Set();
const counts = { created: 0, rejected: 0, ignored: 0, kinds: {} };
for (const row of rows) {
  if (ids.has(row.id)) throw new Error(`Duplicate record id: ${row.id}`);
  ids.add(row.id);
  for (const key of ["raw_asr", "formatted_output", "app", "project", "occurred_at"]) if (!row[key]) throw new Error(`${row.id} is missing ${key}`);
  if (!row.expected?.outcome || !row.expected.query) throw new Error(`${row.id} is missing expected outcome or query`);
  counts[row.expected.outcome]++;
  if (row.expected.kind) counts.kinds[row.expected.kind] = (counts.kinds[row.expected.kind] ?? 0) + 1;

  const accepted = extractCandidates(row.formatted_output, row.project).filter((candidate) => candidate.confidence >= 0.7);
  if (row.expected.outcome === "created") {
    if (accepted[0]?.kind !== row.expected.kind) throw new Error(`${row.id} expected ${row.expected.kind}, received ${accepted[0]?.kind ?? "no memory"}`);
    const score = retrievalScore(row.expected.query, { ...accepted[0], project: row.project, status: "active" });
    if (score === 0) throw new Error(`${row.id} cannot be retrieved by its expected query`);
  } else if (accepted.length) {
    throw new Error(`${row.id} should ${row.expected.outcome}, but created ${accepted[0].kind}`);
  }
}

if (counts.created !== 300 || counts.rejected !== 50 || counts.ignored !== 150) throw new Error(`Unexpected outcome distribution: ${JSON.stringify(counts)}`);
console.log(JSON.stringify({ corpus_size: rows.length, outcome_counts: counts, status: "all labels and expected behaviors verified" }, null, 2));

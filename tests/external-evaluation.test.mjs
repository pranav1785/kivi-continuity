import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("DialogSum external evaluation includes the complete 500-record validation split", async () => {
  const traces = (await readFile("data/dialogsum-traces.jsonl", "utf8")).trim().split("\n").map(JSON.parse);
  const summary = JSON.parse(await readFile("data/dialogsum-results.json", "utf8"));
  assert.equal(summary.dataset, "DialogSum");
  assert.equal(summary.sample_size, 500);
  assert.equal(traces.length, 500);
  assert.equal(summary.records_with_memory_cues + summary.records_without_memory_cues, 500);
  for (const trace of traces) {
    assert.ok(trace.transcript_like_input);
    assert.ok(trace.reference_summary);
    assert.ok(Array.isArray(trace.candidates));
  }
});

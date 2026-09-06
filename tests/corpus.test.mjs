import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("evaluation corpus and traces are complete", async () => {
  const corpus = (await readFile("data/corpus.jsonl", "utf8")).trim().split("\n").map(JSON.parse);
  const traces = (await readFile("data/evaluation-traces.jsonl", "utf8")).trim().split("\n").map(JSON.parse);
  const summary = JSON.parse(await readFile("data/evaluation-results.json", "utf8"));
  assert.equal(corpus.length, 500);
  assert.equal(traces.length, 500);
  assert.equal(summary.corpus_size, 500);
  assert.equal(summary.passed + summary.failed, 500);
  for (const trace of traces) {
    assert.ok(trace.original_input);
    assert.ok(trace.actual_memory_decision);
    assert.ok(trace.hey_kivi_behavior);
    assert.ok(trace.reason);
  }
});


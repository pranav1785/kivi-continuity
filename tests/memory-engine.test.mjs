import test from "node:test";
import assert from "node:assert/strict";
import { retrievalScore } from "../lib/memory-engine.ts";

const decision = {
  subject: "Atlas decision",
  value: "Launch Atlas with guided onboarding",
  project: "Atlas",
  status: "active",
};

test("retrieval abstains when only the project name matches", () => {
  assert.equal(retrievalScore("What is the Atlas budget?", decision), 0);
});

test("retrieval supports a matching decision question", () => {
  assert.ok(retrievalScore("What did we decide about Atlas?", decision) > 0);
});

test("retrieval never uses inactive memory", () => {
  assert.equal(retrievalScore("What did we decide about Atlas?", { ...decision, status: "inactive" }), 0);
});

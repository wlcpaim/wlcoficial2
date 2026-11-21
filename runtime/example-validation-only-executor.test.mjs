import test from "node:test";
import assert from "node:assert/strict";
import { executeApprovedJob } from "./example-validation-only-executor.mjs";

test("validation-only executor checkpoints each approved step and performs no mutations", async () => {
  const saved = [];
  const plan = { plan: { kind: "wlc_engineering_plan", schemaVersion: 1, steps: [
    { id: "inspect", title: "Inspect", acceptanceCriteria: ["identified"] },
    { id: "validate", title: "Validate", acceptanceCriteria: ["checked"] },
  ] } };
  const result = await executeApprovedJob({
    plan, checkpoint: null, assertLease() {},
    async saveCheckpoint(item) { saved.push(item); },
  });
  assert.equal(result.mutationsPerformed, 0);
  assert.equal(result.stepsInspected, 2);
  assert.deepEqual(saved.map((x) => x.sequence), [1, 2]);
});

test("validation-only executor resumes after the latest checkpoint", async () => {
  const saved = [];
  const plan = { plan: { kind: "wlc_engineering_plan", schemaVersion: 1, steps: [
    { id: "inspect", title: "Inspect", acceptanceCriteria: [] },
    { id: "validate", title: "Validate", acceptanceCriteria: [] },
  ] } };
  await executeApprovedJob({
    plan, checkpoint: { sequence: 1 }, assertLease() {},
    async saveCheckpoint(item) { saved.push(item); },
  });
  assert.deepEqual(saved.map((x) => x.sequence), [2]);
});

test("rejects unsupported plan schema", async () => {
  await assert.rejects(executeApprovedJob({
    plan: { plan: { kind: "other", schemaVersion: 99, steps: [] } },
    checkpoint: null, saveCheckpoint() {}, assertLease() {},
  }), /Unsupported plan schema/);
});

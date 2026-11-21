import { describe, expect, it } from "vitest";
import {
  addSessionLesson, beginRepairAttempt, createCheckpoint, createSession, createTaskPlan,
  readyTasks, recordValidation, evaluateValidationGate, recordValidationGate, validateFileBatch, validateFilePath, validateTaskGraph,
  type DevTask,
} from "../lib/wlc-autonomous-development-core";

describe("WLC Autonomous Development Core v0.7", () => {
  it("creates sequential tasks with dependency gates", () => {
    const tasks = createTaskPlan("Build app");
    expect(validateTaskGraph(tasks).valid).toBe(true);
    expect(readyTasks(tasks).map(t => t.id)).toEqual(["task-2"]);
    tasks[0]!.status = "completed";
    expect(readyTasks(tasks).map(t => t.id)).toEqual(["task-2"]);
  });
  it("rejects cycles and missing dependencies", () => {
    const tasks: DevTask[] = [
      { id:"a", title:"A", description:"", dependsOn:["b"], acceptanceCriteria:[], status:"queued", attempts:0 },
      { id:"b", title:"B", description:"", dependsOn:["a"], acceptanceCriteria:[], status:"queued", attempts:0 },
    ];
    expect(validateTaskGraph(tasks).valid).toBe(false);
  });
  it("blocks path traversal and validates multi-file batches", () => {
    expect(validateFilePath("../secrets")).toBeTruthy();
    expect(validateFilePath("src/app.ts")).toBeNull();
    expect(validateFileBatch([{path:"src/a.ts",content:"",operation:"create"},{path:"src/a.ts",content:"",operation:"update"}]).valid).toBe(false);
  });
  it("checkpoint is immutable snapshot", () => {
    const state = { count: 1 };
    const cp = createCheckpoint(state, "before edit");
    state.count = 2;
    expect(cp.state.count).toBe(1);
  });
  it("keeps lessons session-scoped and bounds repair", () => {
    const s = createSession("fix tests", undefined, 1);
    addSessionLesson(s, "type error", "Check import types.");
    addSessionLesson(s, "type error", "Check import types.");
    expect(s.lessons[0]!.occurrences).toBe(2);
    recordValidation(s, [{kind:"test",passed:false,summary:"fail"}]);
    expect(s.status).toBe("repairing");
    expect(beginRepairAttempt(s)).toBe(true);
    expect(beginRepairAttempt(s)).toBe(false);
  });

  describe("evidence-based Validation Gate", () => {
    const pass = (name: string) => ({ name, status: "passed" as const, exitCode: 0, evidence: "Vitest: 6 tests passed" });
    it("passes only when all required checks have verified evidence", () => {
      const gate = evaluateValidationGate({ requiredChecks: ["test", "build"], results: [pass("test"), { ...pass("build"), evidence: "Build completed successfully" }] });
      expect(gate.passed).toBe(true);
      expect(gate.reasons).toEqual([]);
    });
    it("blocks when a required check is missing", () => {
      const gate = evaluateValidationGate({ requiredChecks: ["test", "build"], results: [pass("test")] });
      expect(gate.passed).toBe(false);
      expect(gate.missing).toEqual(["build"]);
    });
    it("blocks failed or not-run checks", () => {
      const gate = evaluateValidationGate({ requiredChecks: ["test"], results: [{ name: "test", status: "failed", exitCode: 1, evidence: "test failure" }] });
      expect(gate.passed).toBe(false);
      expect(gate.failed).toContain("test");
    });
    it("blocks a passing status with a nonzero exit code", () => {
      const gate = evaluateValidationGate({ requiredChecks: ["build"], results: [{ ...pass("build"), exitCode: 2 }] });
      expect(gate.passed).toBe(false);
    });
    it("blocks missing evidence and duplicate result ambiguity", () => {
      const noEvidence = evaluateValidationGate({ requiredChecks: ["lint"], results: [{ ...pass("lint"), evidence: "  " }] });
      const duplicate = evaluateValidationGate({ requiredChecks: ["lint"], results: [pass("lint"), pass("lint")] });
      expect(noEvidence.passed).toBe(false);
      expect(duplicate.passed).toBe(false);
    });
    it("only the evidence gate can complete a session", () => {
      const session = createSession("release", undefined, 1);
      recordValidation(session, [{ kind: "build", passed: true, summary: "Build says success" }]);
      expect(session.status).toBe("validating");
      const gate = evaluateValidationGate({ requiredChecks: ["build"], results: [{ name: "build", status: "passed", exitCode: 0, evidence: "actual process exit 0 and captured output" }] });
      recordValidationGate(session, gate, []);
      expect(session.status).toBe("completed");
    });
    it("blocks empty required checks and does not complete the session", () => {
      const gate = evaluateValidationGate({ requiredChecks: [], results: [pass("test")] });
      const session = createSession("release", undefined, 0);
      recordValidationGate(session, gate, []);
      expect(gate.passed).toBe(false);
      expect(session.status).toBe("failed");
    });
  });
});

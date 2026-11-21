import { describe, expect, it } from "vitest";
import {
  receiveRequest,
  planExecution,
  requestApproval,
  approve,
  startExecution,
  enterValidation,
  completeFromValidation,
  pause,
  resume,
  fail,
  cancel,
  createAndQueue,
  getReadyTasks,
  canTransition,
} from "../lib/orchestrator/orchestrator.server";
import {
  enforceNoExecutionWithoutPlan,
  enforceCompletionRequiresValidation,
  enforceResumeRequiresCheckpointIntegrity,
  enforceWorkspaceBoundary,
} from "../lib/orchestrator/orchestrator.schemas";
import type { OrchestratorExecution } from "../lib/orchestrator/orchestrator.types";

describe("WLC Autonomous Orchestrator Alpha — state machine", () => {
  it("blocks invalid transitions", () => {
    expect(canTransition("RECEIVED", "RUNNING")).toBe(false);
    expect(canTransition("RECEIVED", "PLANNING")).toBe(true);
    expect(canTransition("COMPLETED", "RUNNING")).toBe(false);
    expect(canTransition("VALIDATING", "COMPLETED")).toBe(true);
    expect(canTransition("VALIDATING", "RUNNING")).toBe(true);
  });

  it("happy path: receive → plan → queue → run → validate → complete", () => {
    let exec = receiveRequest("Crie um sistema de gerenciamento de tarefas com login e dashboard");
    expect(exec.status).toBe("RECEIVED");
    expect(exec.plan).toBeNull();

    exec = planExecution(exec);
    expect(exec.status).toBe("PLANNING");
    expect(exec.plan).not.toBeNull();
    expect(exec.plan!.tasks.length).toBeGreaterThanOrEqual(3);
    expect(exec.session).not.toBeNull();

    exec = requestApproval(exec, false);
    expect(exec.status).toBe("QUEUED");

    exec = startExecution(exec);
    expect(exec.status).toBe("RUNNING");

    exec = enterValidation(exec);
    expect(exec.status).toBe("VALIDATING");

    // Without validation results, completion must fall back to RUNNING
    exec = completeFromValidation(exec);
    expect(exec.status).toBe("RUNNING");

    // Provide evidence (Stage 6 requires typecheck + unit_test + build with non-empty evidence)
    exec.validationResults = [
      { kind: "typecheck", passed: true, summary: "tsc ok", details: "exit 0 — no errors" },
      { kind: "test", passed: true, summary: "All tests passed", details: "Vitest: 6 tests passed" },
      { kind: "build", passed: true, summary: "Build ok", details: "vite build completed in 1.2s" },
    ];
    exec = enterValidation(exec);
    exec = completeFromValidation(exec);
    expect(exec.status).toBe("COMPLETED");
    expect(exec.evidencePackage?.overallPassed).toBe(true);
    expect(exec.compiledRequirements).toBeTruthy();
    expect(exec.transitions.map((t) => t.to)).toContain("COMPLETED");
  });

  it("enforces no execution without structured plan", () => {
    const exec = receiveRequest("test");
    const decision = enforceNoExecutionWithoutPlan(exec);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/plano estruturado/i);
  });

  it("requires approval for sensitive path", async () => {
    let exec = createAndQueue("Build app");
    expect(exec.status).toBe("QUEUED");
    exec = startExecution(exec);
    const { enforceSensitiveOperationAuthorization } = await import("../lib/orchestrator/orchestrator.schemas");
    const d = enforceSensitiveOperationAuthorization(exec, "deploy");
    expect(d.requiresApproval || !d.allowed).toBe(true);
  });

  it("pause and resume with checkpoint integrity", () => {
    let exec = createAndQueue("Pause test");
    exec = startExecution(exec);
    exec = pause(exec, "Interrupção solicitada");
    expect(exec.status).toBe("PAUSED");
    expect(exec.checkpoints.length).toBeGreaterThan(0);

    const policy = enforceResumeRequiresCheckpointIntegrity(exec);
    expect(policy.allowed).toBe(true);

    exec = resume(exec);
    expect(exec.status).toBe("RUNNING");
  });

  it("cancel and fail terminal states", () => {
    let exec = receiveRequest("cancel me");
    exec = cancel(exec, "User abort");
    expect(exec.status).toBe("CANCELLED");

    exec = receiveRequest("fail me");
    exec = planExecution(exec);
    exec = fail(exec, "Grafo inválido simulado");
    expect(exec.status).toBe("FAILED");
    expect(exec.error).toBeTruthy();
  });

  it("ready tasks respect dependency graph", () => {
    const exec = createAndQueue("Dependency test");
    const ready = getReadyTasks(exec);
    expect(ready.length).toBe(1);
    expect(ready[0]!.id).toBe("task-1");
  });

  it("workspace boundary blocks traversal", () => {
    const ok = enforceWorkspaceBoundary("src/app.ts", "/tmp/workspace");
    expect(ok.allowed).toBe(true);
    const bad = enforceWorkspaceBoundary("../etc/passwd", "/tmp/workspace");
    expect(bad.allowed).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  canTransition,
  createTaskRuntime,
  transitionTask,
  detectStateOscillation,
} from "../lib/wlc-task-state-machine";
import { LoopDetector, fingerprintAction } from "../lib/wlc-loop-detection";
import { analyzeFailure, FailureMemory } from "../lib/wlc-failure-intelligence";
import { EvidenceLedger } from "../lib/wlc-evidence-system";
import { createCheckpoint, validateCheckpoint } from "../lib/wlc-checkpoint-intelligence";
import { ProgressTracker } from "../lib/wlc-progress-intelligence";
import {
  createEngineeringSession,
  recordToolOutcome,
  sessionTransition,
  evaluateSessionCompletion,
  buildAdaptivePlan,
  formatEngineeringIntelligenceContext,
} from "../lib/wlc-engineering-intelligence-core";

describe("Task State Machine", () => {
  it("blocks execution without going through ready path properly from CREATED", () => {
    const t = createTaskRuntime("test");
    expect(canTransition("CREATED", "EXECUTING")).toBe(false);
    expect(canTransition("CREATED", "UNDERSTANDING")).toBe(true);
  });

  it("blocks COMPLETED from EXECUTING", () => {
    let t = createTaskRuntime("x");
    for (const s of ["UNDERSTANDING", "PLANNING", "READY", "EXECUTING"] as const) {
      const r = transitionTask(t, s, "ok");
      expect(r.ok).toBe(true);
      if (r.ok) t = r.runtime;
    }
    const bad = transitionTask(t, "COMPLETED", "skip verify");
    expect(bad.ok).toBe(false);
  });

  it("detects oscillation", () => {
    let t = createTaskRuntime("osc");
    // move to PLANNING first
    for (const s of ["UNDERSTANDING", "PLANNING"] as const) {
      const r = transitionTask(t, s, "n");
      if (r.ok) t = r.runtime;
    }
    for (let i = 0; i < 4; i++) {
      let r = transitionTask(t, "ANALYZING", "replan");
      if (r.ok) t = r.runtime;
      r = transitionTask(t, "PLANNING", "again");
      if (r.ok) t = r.runtime;
    }
    expect(detectStateOscillation(t)).toBe(true);
  });
});

describe("Loop Detection", () => {
  it("hard-blocks identical failures", () => {
    const d = new LoopDetector({ maxSameFailures: 2, maxSameCalls: 5 });
    const fp = fingerprintAction("write_file", { path: "src/App.tsx", content: "a" }, { target: "src/App.tsx" });
    expect(d.record(fp, { ok: false, error: "sha conflict" }).kind).toBe("ok");
    const v2 = d.record(fp, { ok: false, error: "sha conflict" });
    expect(v2.kind).toBe("hard_block");
  });

  it("detects stagnation", () => {
    const d = new LoopDetector();
    for (let i = 0; i < 6; i++) {
      const fp = fingerprintAction("read_file", { path: `f${i}` });
      d.record(fp, { ok: true, progressScore: 0 });
    }
    expect(d.detectStagnation()).toBe(true);
  });
});

describe("Failure Intelligence", () => {
  it("classifies and requires strategy change after repeats", () => {
    const f = analyzeFailure({ message: "TypeError: x is not assignable", tool: "write_file" });
    expect(f.category).toBe("type_error");
    const mem = new FailureMemory();
    mem.remember(f);
    mem.remember(f);
    expect(mem.shouldBlockRetry(f)).toBe(true);
  });
});

describe("Evidence System", () => {
  it("blocks completion without verification", () => {
    const e = new EvidenceLedger();
    e.add({ kind: "file_change", label: "App.tsx", status: "NOT_VERIFIED" });
    const gate = e.evaluateCompletion({ writesClaimed: 1, requiresBuild: true });
    expect(gate.allowed).toBe(false);
    expect(gate.blockers.length).toBeGreaterThan(0);
  });

  it("allows completion when verified", () => {
    const e = new EvidenceLedger();
    e.add({ kind: "file_change", label: "x.ts", status: "VERIFIED" });
    e.add({ kind: "build", label: "vite build", status: "VERIFIED", command: "bun run build" });
    e.add({ kind: "test", label: "unit", status: "VERIFIED", command: "bun test" });
    const gate = e.evaluateCompletion({ writesClaimed: 1, requiresBuild: true, requiresTests: true });
    expect(gate.allowed).toBe(true);
  });
});

describe("Checkpoint Intelligence", () => {
  it("marks stale when file signals change", () => {
    const cp = createCheckpoint({
      objective: "pdv",
      planSummary: [],
      completedTasks: ["a"],
      pendingTasks: ["b"],
      failures: [],
      decisions: [],
      evidenceSummary: [],
      nextAction: "implement saleService",
      blockers: [],
      fileSignals: { "src/App.tsx": "sha1" },
    });
    const v = validateCheckpoint(cp, { "src/App.tsx": "sha2" });
    expect(v.valid).toBe(false);
    expect(v.staleFiles).toContain("src/App.tsx");
  });
});

describe("Progress Intelligence", () => {
  it("flags false progress", () => {
    const p = new ProgressTracker();
    for (let i = 0; i < 5; i++) p.track({ kind: "tool_call", label: "read", measurable: false });
    expect(p.assess().falseProgress).toBe(true);
  });
});

describe("Engineering Session facade", () => {
  it("records tool failure into loop+failure memory", () => {
    const s = createEngineeringSession("Implementar PDV");
    expect(sessionTransition(s, "UNDERSTANDING", "start").ok).toBe(true);
    const { verdict } = recordToolOutcome(s, {
      tool: "write_file",
      args: { path: "App.tsx" },
      ok: false,
      error: "sha conflict",
      target: "App.tsx",
    });
    expect(verdict.kind).toBe("ok");
    recordToolOutcome(s, {
      tool: "write_file",
      args: { path: "App.tsx" },
      ok: false,
      error: "sha conflict",
      target: "App.tsx",
    });
    // second identical failure should hard block
    const second = recordToolOutcome(s, {
      tool: "write_file",
      args: { path: "App.tsx" },
      ok: false,
      error: "sha conflict",
      target: "App.tsx",
    });
    expect(second.verdict.kind).toBe("hard_block");
  });

  it("builds adaptive plan for PDV", () => {
    const plan = buildAdaptivePlan("Criar PDV com estoque e caixa");
    expect(plan.some((p) => /saleService|atômico|caixa/i.test(p))).toBe(true);
  });

  it("formats context without session", () => {
    const ctx = formatEngineeringIntelligenceContext("Continue o PDV sem reiniciar");
    expect(ctx).toContain("Engineering Intelligence Core");
    expect(ctx).toContain("Cognitive Orchestrator Pro");
  });

  it("completion gate respects evidence", () => {
    const s = createEngineeringSession("implementar testes");
    const gate = evaluateSessionCompletion(s, 1);
    expect(gate.allowed).toBe(false);
  });
});

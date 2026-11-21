import { describe, expect, it } from "vitest";
import { buildAgentPlan, canonicalAgentPlanJson, hashAgentPlan, type AgentPlanV1 } from "@/lib/agent-plan";

describe("agent plan contract", () => {
  it("creates a bounded plan that explicitly requires approval", () => {
    const plan = buildAgentPlan("Improve the WLC engineering runtime safely");
    expect(plan.schemaVersion).toBe(1);
    expect(plan.execution.requiresApproval).toBe(true);
    expect(plan.steps.map((step) => step.id)).toEqual(["inspect", "design", "implement", "validate"]);
  });

  it("rejects empty or oversized goals", () => {
    expect(() => buildAgentPlan("short")).toThrow();
    expect(() => buildAgentPlan("x".repeat(12001))).toThrow();
  });

  it("canonicalizes object key order deterministically", () => {
    const a: AgentPlanV1 = { schemaVersion: 1, kind: "wlc_engineering_plan", goal: "A sufficiently long goal", constraints: [], steps: [], execution: { mode: "interactive_agent", requiresApproval: true } };
    const b: AgentPlanV1 = { ...a, execution: { requiresApproval: true, mode: "interactive_agent" } };
    expect(canonicalAgentPlanJson(a)).toBe(canonicalAgentPlanJson(b));
  });

  it("produces a SHA-256 hash with stable length", async () => {
    const plan = buildAgentPlan("Improve the WLC engineering runtime safely");
    const first = await hashAgentPlan(plan);
    const second = await hashAgentPlan(plan);
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});

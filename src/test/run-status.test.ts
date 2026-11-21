import { describe, expect, it } from "vitest";
import { currentRunEvents, interruptedRun } from "@/lib/run-status";
import { approvalMessage, buildAgentPlan } from "@/lib/agent-plan";

const now = new Date("2026-11-20T01:00:00Z").getTime();
const ev = (event_type: string, minutesAgo: number, title = event_type) => ({ event_type, status: "running", title, created_at: new Date(now - minutesAgo * 60_000).toISOString() });

describe("chat live status", () => {
  it("flags a run that stopped mid-way (no live session, last event is a step)", () => {
    const events = [ev("tool_start", 1, "Gravando index.html"), ev("execution_started", 2)];
    expect(interruptedRun(events, false, now)?.title).toBe("Gravando index.html");
  });

  it("does not flag a run that is still alive on the server", () => {
    expect(interruptedRun([ev("thinking", 0)], true, now)).toBeNull();
  });

  it("does not flag finished, paused or failed runs", () => {
    for (const end of ["execution_finished", "execution_paused", "execution_failed"]) {
      expect(interruptedRun([ev(end, 1), ev("tool", 2)], false, now)).toBeNull();
    }
  });

  it("only shows events of the current run", () => {
    const events = [ev("thinking", 1), ev("execution_finished", 10)];
    expect(currentRunEvents(events, new Date(now - 2 * 60_000).toISOString()).map((e) => e.event_type)).toEqual(["thinking"]);
  });
});

describe("Criar button", () => {
  it("sends a message the agent treats as approval of the plan", () => {
    const msg = approvalMessage("Criar loja moderna", ["Design", "Carrinho"]);
    expect(msg.startsWith("✅ Aprovado")).toBe(true);
    expect(msg).toContain("1. Design");
    expect(msg).toContain("2. Carrinho");
  });

  it("keeps the agent's own steps in the plan card", () => {
    const plan = buildAgentPlan("Criar loja moderna e responsiva", ["Design", "Carrinho"]);
    expect(plan.steps.map((s) => s.title)).toEqual(["Design", "Carrinho"]);
  });
});

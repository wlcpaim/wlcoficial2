import { describe, expect, it } from "vitest";
import {
  assessProRequest,
  formatProCognitiveContext,
  summarizeProDecision,
  WLC_COGNITIVE_ORCHESTRATOR_PRO_VERSION,
} from "../lib/wlc-cognitive-orchestrator-pro";

describe("WLC Cognitive Orchestrator Pro", () => {
  it("exposes version", () => {
    expect(WLC_COGNITIVE_ORCHESTRATOR_PRO_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("detects development intent for PDV work", () => {
    const d = assessProRequest("Implementar módulo de PDV com venda e estoque");
    expect(d.intent).toBe("development");
    expect(d.engineering.requireAtomicDomainOps).toBe(true);
    expect(d.engineering.realDataOnly).toBe(true);
  });

  it("detects continuation and enables anti-rewrite policy", () => {
    const history = [
      { role: "user", content: "Continue a tarefa anterior de onde parou" },
      { role: "assistant", content: "Checkpoint salvo" },
    ];
    const d = assessProRequest("Continue de onde parou. Não reinicie o projeto.", history);
    expect(["continuation", "loop_suspected", "follow_up"]).toContain(d.continuity);
    expect(d.engineering.incrementalOnly).toBe(true);
    expect(d.engineering.forbidBlindAppRewrite).toBe(true);
    expect(d.engineering.checkpointOverRestart).toBe(true);
  });

  it("flags restart requests on development", () => {
    const d = assessProRequest("Recomece o sistema PDV do zero e apague tudo");
    expect(d.continuity).toBe("restart_request");
    expect(d.antiPatterns.length).toBeGreaterThan(0);
  });

  it("scores math intent", () => {
    const d = assessProRequest("Calcule 15% de 200");
    expect(d.intent).toBe("math");
    expect(d.needsTools).toBe(false);
  });

  it("formats context with engineering policy section", () => {
    const d = assessProRequest("Criar dashboard com faturamento real do PDV");
    const ctx = formatProCognitiveContext(d);
    expect(ctx).toContain("Cognitive Orchestrator Pro");
    expect(ctx).toContain("Política de engenharia profissional");
    expect(ctx).toContain("Dados reais only");
  });

  it("summarize is stable for logging", () => {
    const d = assessProRequest("Revisar segurança do auth");
    const s = summarizeProDecision(d);
    expect(s.intent).toBeDefined();
    expect(s.version).toBe(WLC_COGNITIVE_ORCHESTRATOR_PRO_VERSION);
  });
});

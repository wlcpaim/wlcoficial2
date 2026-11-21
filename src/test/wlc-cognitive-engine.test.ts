import { describe, expect, it } from "vitest";
import { assessWlcRequest, formatWlcCognitiveContext } from "../lib/wlc-cognitive-engine";

describe("WLC cognitive orchestrator", () => {
  it("routes basic chat to direct response with low complexity", () => {
    const decision = assessWlcRequest("Oi, tudo bem?");
    expect(decision.intent).toBe("conversation");
    expect(decision.complexity).toBe("low");
    expect(decision.needsTools).toBe(false);
  });

  it("recognizes arithmetic and suggests deterministic validation", () => {
    const decision = assessWlcRequest("Quanto é 45 * 12?");
    expect(decision.intent).toBe("math");
    expect(decision.suggestedActions.join(" ")).toContain("calculadora determinística");
  });

  it("classifies a development task and recommends inspecting project context", () => {
    const decision = assessWlcRequest("Implementar autenticação segura no projeto web");
    expect(decision.intent).toBe("development");
    expect(decision.needsTools).toBe(true);
    expect(decision.complexity).toBe("medium");
  });

  it("flags high-risk deployment requests for confirmation policy", () => {
    const decision = assessWlcRequest("Fazer deploy em produção");
    expect(decision.risk).toBe("high");
    expect(decision.suggestedActions.some(a => a.includes("Confirmar autorização"))).toBe(true);
  });


  it("creates an engineering-oriented plan for complex development requests", () => {
    const decision = assessWlcRequest("Criar uma aplicação SaaS completa com API, banco de dados, autenticação e testes");
    expect(decision.intent).toBe("development");
    expect(decision.plan.some((step) => step.includes("arquitetura"))).toBe(true);
    expect(decision.plan.some((step) => step.includes("testes"))).toBe(true);
  });

  it("produces a compact orchestration context, not hidden reasoning", () => {
    const formatted = formatWlcCognitiveContext(assessWlcRequest("Corrigir bug no site"));
    expect(formatted).toContain("Intenção estimada: debugging");
    expect(formatted).toContain("Plano adaptativo sugerido");
    expect(formatted).toContain("Não exponha raciocínio interno privado");
  });
});

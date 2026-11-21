import { describe, expect, it } from "vitest";
import { analyzeProjectCreationRequest, formatProjectCreationIntelligence } from "@/lib/wlc-project-creation-intelligence";

describe("WLC project creation intelligence", () => {
  it("recognizes PDV and proposes operationally relevant modules", () => {
    const brief = analyzeProjectCreationRequest("Criar um PDV moderno para loja com caixa, estoque e vendas");
    expect(brief.detected).toContain("pdv");
    expect(brief.recommendedModules).toContain("Venda/checkout com fluxo rápido");
    expect(brief.recommendedModules).toContain("Controle de caixa (abertura, movimentações e fechamento)");
    expect(brief.candidateEntities).toContain("Venda");
  });
  it("recognizes ecommerce and avoids claiming integrations exist", () => {
    const brief = analyzeProjectCreationRequest("Criar ecommerce com catálogo, carrinho e checkout");
    expect(brief.detected).toContain("ecommerce");
    expect(brief.candidateRoutes).toContain("/checkout");
    expect(brief.risks.some((risk) => risk.includes("Não inventar"))).toBe(true);
  });
  it("uses generic proposals for ambiguous requests and marks confidence low", () => {
    const brief = analyzeProjectCreationRequest("Faz um aplicativo bonito");
    expect(brief.detected).toEqual(["generic"]);
    expect(brief.confidence).toBe("low");
    expect(brief.openQuestions.length).toBeGreaterThan(0);
  });
  it("formats prompt context with clear candidate-only language", () => {
    const formatted = formatProjectCreationIntelligence(analyzeProjectCreationRequest("Dashboard de analytics para equipe"));
    expect(formatted).toContain("Project Creation Intelligence");
    expect(formatted).toContain("hipóteses de apoio");
    expect(formatted).toContain("Critérios de aceite");
  });
});

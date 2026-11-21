import { describe, expect, it } from "vitest";
import { assessAdvancedCognition, formatAdvancedCognitiveContext, recommendStrategy, retrieveSemanticKnowledge } from "../lib/wlc-advanced-cognition";

describe("WLC advanced cognition", () => {
  it("retrieves relevant knowledge deterministically", () => {
    const first = retrieveSemanticKnowledge("Como proteger autenticação JWT e autorização no Supabase?");
    const second = retrieveSemanticKnowledge("Como proteger autenticação JWT e autorização no Supabase?");
    expect(first.length).toBeGreaterThan(0);
    expect(first.map((x) => x.id)).toEqual(second.map((x) => x.id));
  });
  it("does not let evidence volume inflate confidence when reliability is low", () => {
    const query = "Explique arquitetura segura de API";
    const lowReliability = assessAdvancedCognition(query, Array.from({ length: 12 }, (_, index) => ({
      id: `weak-${index}`, source: "unverified", text: "Repeated low-quality evidence", reliability: 0.1,
    })));
    const highReliability = assessAdvancedCognition(query, [{
      id: "strong-1", source: "verified-test", text: "Reproducible integration evidence", reliability: 1,
    }]);
    expect(lowReliability.confidence).toBeLessThan(highReliability.confidence);
  });
  it("handles invalid retrieval limits without returning misleading results", () => {
    expect(retrieveSemanticKnowledge("autenticação", 0)).toEqual([]);
    expect(retrieveSemanticKnowledge("autenticação", Number.POSITIVE_INFINITY)).toEqual([]);
    expect(retrieveSemanticKnowledge("autenticação", 0.5)).toEqual([]);
  });
  it("routes high-risk requests through approval", () => {
    const result = assessAdvancedCognition("Fazer deploy em produção e migrar o banco");
    expect(result.strategy).toBe("approval-gated");
    expect(result.requiresHumanReview).toBe(true);
    expect(result.warnings.join(" ")).toContain("alto risco");
  });
  it("rejects malformed evidence", () => {
    const result = assessAdvancedCognition("Explique autenticação segura", [{ id: "", source: "", text: "x", reliability: 4 }]);
    expect(result.evidence).toHaveLength(0);
    expect(result.warnings.join(" ")).toContain("descartadas");
  });
  it("does not overfit strategy with a small history", () => {
    const result = recommendStrategy([{ strategy: "research-first", success: true, quality: 1 }], "direct");
    expect(result.strategy).toBe("direct");
  });
  it("recommends only a strategy supported by repeated outcomes", () => {
    const history = ["research-first", "research-first", "research-first", "direct", "direct"].map((strategy) => ({ strategy, success: true, quality: strategy === "research-first" ? 0.9 : 0.5 }));
    expect(recommendStrategy(history, "direct").strategy).toBe("research-first");
  });
  it("formats an auditable summary without private reasoning", () => {
    expect(formatAdvancedCognitiveContext(assessAdvancedCognition("Corrigir bug de autenticação"))).toContain("confiança é uma heurística");
  });
});

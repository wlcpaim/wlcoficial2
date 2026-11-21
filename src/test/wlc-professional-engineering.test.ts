import { describe, expect, it } from "vitest";
import { assessEngineeringReadiness, buildWlcProfessionalEngineeringContext, isWlcDevelopmentRequest, type EngineeringEvidence } from "../lib/wlc-professional-engineering.ts";

const allDimensions = ["architecture", "type-safety", "runtime-validation", "responsive-ux", "interaction-quality", "accessibility", "security", "testing", "performance", "maintainability"] as const;

describe("WLC professional engineering intelligence", () => {
  it("blocks approval when critical security evidence is absent", () => {
    const result = assessEngineeringReadiness([]);
    expect(result.verdict).toBe("blocked");
    expect(result.blockers.some((item) => item.includes("security"))).toBe(true);
  });

  it("approves only complete evidence across all dimensions", () => {
    const result = assessEngineeringReadiness(allDimensions.map((dimension) => ({ dimension, status: "verified" as const, evidence: `Verified ${dimension} with repeatable evidence.` })));
    expect(result.score).toBe(100);
    expect(result.verdict).toBe("approved");
  });

  it("does not treat a failed critical check as a pass", () => {
    const evidence: EngineeringEvidence[] = allDimensions.map((dimension) => ({ dimension, status: "verified", evidence: `Verified ${dimension}.` }));
    evidence[6] = { dimension: "security", status: "failed", evidence: "Authorization bypass reproduced." };
    expect(assessEngineeringReadiness(evidence).verdict).toBe("blocked");
  });

  it("adds professional modal, alert and stack guidance only for development requests", () => {
    expect(isWlcDevelopmentRequest("Criar modal responsivo e alertas modernos" )).toBe(true);
    const context = buildWlcProfessionalEngineeringContext("Desenvolver aplicação React com modais e API");
    expect(context).toContain("AlertDialog");
    expect(context).toContain("Python 3.12+");
    expect(context).toContain("pesos do modelo");
    expect(buildWlcProfessionalEngineeringContext("Olá, tudo bem?")).toBe("");
  });
});

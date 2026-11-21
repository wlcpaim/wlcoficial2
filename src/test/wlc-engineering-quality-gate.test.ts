import { describe, expect, it } from "vitest";
import {
  assessEngineeringEvidence, buildEngineeringQualityContext, proposeLearningFromOutcome,
  WLC_QUALITY_DIMENSIONS
} from "../lib/wlc-engineering-quality-gate";

describe("WLC engineering quality gate", () => {
  it("does not approve a project when evidence is missing", () => {
    const result = assessEngineeringEvidence([
      { dimension: "requirements", status: "verified", summary: "Acceptance criteria reviewed" }
    ]);
    expect(result.verdict).toBe("needs-review");
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(90);
  });

  it("blocks unverified critical security evidence", () => {
    const result = assessEngineeringEvidence([
      { dimension: "security", status: "partial", summary: "RLS review incomplete", critical: true }
    ]);
    expect(result.verdict).toBe("blocked");
    expect(result.blockers).toContain("security: evidência crítica não verificada");
  });

  it("approves only when all dimensions have verified evidence", () => {
    const result = assessEngineeringEvidence(WLC_QUALITY_DIMENSIONS.map((dimension) => ({
      dimension, status: "verified" as const, summary: `Evidence for ${dimension}`
    })));
    expect(result.verdict).toBe("approved");
    expect(result.score).toBe(100);
  });

  it("requires evidence and human approval for learning proposals", () => {
    expect(proposeLearningFromOutcome({ topic: "React", lesson: "Use stable keys", evidence: [] })).toBeNull();
    const proposal = proposeLearningFromOutcome({
      topic: " React ", lesson: " Prefer stable keys in lists. ",
      evidence: [" regression-test: passed ", ""]
    });
    expect(proposal?.approvalRequired).toBe(true);
    expect(proposal?.evidence).toEqual(["regression-test: passed"]);
  });

  it("sets explicit engineering and honesty boundaries", () => {
    const context = buildEngineeringQualityContext();
    expect(context).toContain("Ausência de evidência significa pendente");
    expect(context).toContain("Não publique");
    expect(context).toContain("agência técnica multidisciplinar");
  });
});

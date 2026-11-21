import { describe, expect, it } from "vitest";
import { formatPhysicsFormulaContext, retrievePhysicsFormulas } from "../lib/nexus-physics-knowledge";

describe("WLC physics formula retrieval", () => {
  it("finds formulas for velocity and acceleration questions", () => {
    const results = retrievePhysicsFormulas("velocidade aceleração movimento uniformemente variado", 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((formula) => formula.name.toLowerCase().includes("velocidade"))).toBe(true);
  });
  it("formats formulas with conditions and units context", () => {
    const context = formatPhysicsFormulaContext(retrievePhysicsFormulas("energia trabalho potência", 3));
    expect(context).toContain("Condições:");
    expect(context).toContain("Aplicação:");
  });
});

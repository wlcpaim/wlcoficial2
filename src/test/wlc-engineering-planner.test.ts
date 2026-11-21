import { describe, expect, it } from "vitest";
import { assessWlcRequest } from "../lib/wlc-cognitive-engine";
import { createEngineeringPlan, detectEngineeringProfile, formatEngineeringContext } from "../lib/wlc-engineering-planner";

describe("WLC engineering planner", () => {
  it("detects a fullstack request from frontend and API terms", () => {
    expect(detectEngineeringProfile("Criar site React com API e banco de dados")).toBe("fullstack");
  });
  it("creates complete phased plan for development work", () => {
    const decision = assessWlcRequest("Implementar uma aplicação SaaS completa com frontend e backend");
    const plan = createEngineeringPlan("Implementar uma aplicação SaaS completa com frontend e backend", decision);
    expect(plan.map(p => p.id)).toEqual(["discover", "inspect", "design", "implement", "verify", "deliver"]);
    expect(plan.some(p => p.deliverables.includes("critérios de aceite"))).toBe(true);
  });
  it("creates a focused debugging plan", () => {
    const decision = assessWlcRequest("Corrigir bug de login");
    expect(createEngineeringPlan("Corrigir bug de login", decision).map(p => p.id)).toEqual(["inspect", "implement", "verify", "deliver"]);
  });
  it("adds context only for engineering intents and avoids private reasoning", () => {
    const context = formatEngineeringContext("Criar um site responsivo", assessWlcRequest("Criar um site responsivo"));
    expect(context).toContain("protocolo de engenharia de software");
    expect(context).toContain("Critério de entrega");
    expect(context).not.toContain("cadeia de pensamento");
  });
});

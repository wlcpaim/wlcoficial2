import { describe, expect, it } from "vitest";
import {
  formatCreativePlanContext,
  generateCreativePlan,
  shouldRunCreativePlanning,
  WLC_CREATIVE_ENGINEERING_VERSION,
} from "../lib/wlc-creative-engineering-engine";

describe("WLC Creative Engineering Engine", () => {
  it("generates a plan with multiple scored concepts", () => {
    const plan = generateCreativePlan({
      objective: "Criar um dashboard admin para gestão de pedidos B2B",
      audience: "operadores de e-commerce",
      segment: "enterprise",
      productType: "dashboard",
      complexity: "high",
    });
    expect(plan.version).toBe(WLC_CREATIVE_ENGINEERING_VERSION);
    expect(plan.concepts.length).toBeGreaterThanOrEqual(3);
    expect(plan.selected.overall).toBeGreaterThan(0);
    expect(plan.selected.stackSuggestion.length).toBeGreaterThan(0);
    expect(plan.selectionRationale.length).toBeGreaterThan(20);
  });

  it("prefers enterprise-like concepts for admin dashboards", () => {
    const plan = generateCreativePlan({
      objective: "painel administrativo enterprise CRM",
      productType: "dashboard admin",
      segment: "enterprise",
      complexity: "high",
    });
    // Selected should not be purely decorative/creative when enterprise signals dominate
    expect(["enterprise", "tecnico", "minimalista", "startup"]).toContain(plan.selected.personality);
  });

  it("detects when creative planning should run", () => {
    expect(shouldRunCreativePlanning("Quero criar um site institucional moderno")).toBe(true);
    expect(shouldRunCreativePlanning("Desenvolver um dashboard de analytics")).toBe(true);
    expect(shouldRunCreativePlanning("Explique o que é React")).toBe(false);
    expect(shouldRunCreativePlanning("Corrigir bug no formulário de login")).toBe(false);
  });

  it("formats context for the agent", () => {
    const plan = generateCreativePlan({
      objective: "landing page de produto SaaS",
      productType: "landing",
      segment: "startup",
    });
    const ctx = formatCreativePlanContext(plan);
    expect(ctx).toContain("Creative Engineering");
    expect(ctx).toContain(plan.selected.name);
  });
});

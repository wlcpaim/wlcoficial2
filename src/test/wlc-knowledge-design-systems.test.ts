import { describe, expect, it } from "vitest";
import { retrieveWlcKnowledge, WLC_CORE_KNOWLEDGE_VERSION } from "../lib/wlc-knowledge-base";
import { DESIGN_SYSTEMS_KNOWLEDGE, DESIGN_SYSTEMS_KNOWLEDGE_VERSION } from "../lib/design-systems-knowledge";

describe("Design systems knowledge", () => {
  it("loads design framework entries", () => {
    expect(DESIGN_SYSTEMS_KNOWLEDGE_VERSION).toBe("1.0.0");
    expect(DESIGN_SYSTEMS_KNOWLEDGE.length).toBeGreaterThanOrEqual(15);
    const domains = new Set(DESIGN_SYSTEMS_KNOWLEDGE.map((e) => e.domain));
    expect(domains.has("Tailwind CSS")).toBe(true);
    expect(domains.has("Bootstrap")).toBe(true);
    expect(domains.has("Bulma")).toBe(true);
    expect(domains.has("Pico CSS")).toBe(true);
  });

  it("retrieves design knowledge for UI queries", () => {
    const hits = retrieveWlcKnowledge("criar landing page moderna com Tailwind CSS harmoniosa", 8);
    expect(hits.some((h) => ["Design Profissional", "Tailwind CSS"].includes(h.domain))).toBe(true);
  });

  it("version tag includes design-systems", () => {
    expect(WLC_CORE_KNOWLEDGE_VERSION).toContain("design-systems");
  });
});

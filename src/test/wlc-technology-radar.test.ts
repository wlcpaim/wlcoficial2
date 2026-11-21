import { describe, expect, it } from "vitest";
import {
  compareTechnologies,
  findTechnologies,
  formatTechnologyRadarContext,
  recommendStack,
  TECHNOLOGY_RADAR,
  WLC_TECHNOLOGY_RADAR_VERSION,
} from "../lib/wlc-technology-radar";

describe("WLC Technology Radar", () => {
  it("has curated entries with required fields", () => {
    expect(TECHNOLOGY_RADAR.length).toBeGreaterThan(10);
    for (const t of TECHNOLOGY_RADAR.slice(0, 5)) {
      expect(t.id).toBeTruthy();
      expect(t.advantages.length).toBeGreaterThan(0);
      expect(t.disadvantages.length).toBeGreaterThan(0);
      expect(t.bestFor.length).toBeGreaterThan(0);
      expect(t.alternatives.length).toBeGreaterThan(0);
    }
  });

  it("finds technologies by query", () => {
    const hits = findTechnologies("React Next.js Tailwind design system", 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => /react|next|tailwind/i.test(h.name))).toBe(true);
  });

  it("compares named technologies", () => {
    const list = compareTechnologies(["react", "vue", "svelte"]);
    expect(list.length).toBe(3);
  });

  it("recommends proportional stack for content sites", () => {
    const { recommendations, rationale } = recommendStack({
      productType: "blog de conteúdo e documentação",
      priorities: ["performance", "seo"],
    });
    expect(recommendations.length).toBeGreaterThan(0);
    expect(rationale.length).toBeGreaterThan(10);
    expect(recommendations.some((r) => r.id === "astro" || r.name.includes("Astro"))).toBe(true);
  });

  it("formats radar context", () => {
    const hits = findTechnologies("PostgreSQL banco de dados", 2);
    const ctx = formatTechnologyRadarContext(hits);
    expect(ctx).toContain("Technology Radar");
    expect(ctx).toContain(WLC_TECHNOLOGY_RADAR_VERSION);
  });
});

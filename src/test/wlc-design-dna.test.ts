import { describe, expect, it } from "vitest";
import {
  formatDesignDNAContext,
  generateDesignDNA,
  proposeVisualConcepts,
  WLC_DESIGN_DNA_VERSION,
} from "../lib/wlc-design-dna";

describe("WLC Design DNA Generator", () => {
  it("generates coherent DNA with version and tokens", () => {
    const dna = generateDesignDNA({
      projectName: "Acme Dashboard",
      segment: "enterprise B2B",
      productType: "dashboard admin",
      audience: "operadores internos",
    });
    expect(dna.version).toBe(WLC_DESIGN_DNA_VERSION);
    expect(dna.palette.primary).toMatch(/^#/);
    expect(dna.typography.sans.length).toBeGreaterThan(5);
    expect(dna.spacing.length).toBeGreaterThan(5);
    expect(dna.cssVariables).toContain("--color-primary");
    expect(dna.iconFamily).toBeTruthy();
    expect(dna.guidelines.length).toBeGreaterThan(3);
  });

  it("picks editorial personality for content/magazine signals", () => {
    const dna = generateDesignDNA({
      desiredIdentity: "editorial revista tipografia",
      productType: "blog de conteúdo",
    });
    expect(dna.personality).toBe("editorial");
  });

  it("picks futurista for cyber/neon signals", () => {
    const dna = generateDesignDNA({ desiredIdentity: "futurista cyber neon sci-fi" });
    expect(dna.personality).toBe("futurista");
  });

  it("proposes multiple distinct visual concepts", () => {
    const concepts = proposeVisualConcepts({
      objective: "criar landing page de startup SaaS",
      segment: "startup",
    });
    expect(concepts.length).toBeGreaterThanOrEqual(3);
    const personalities = new Set(concepts.map((c) => c.personality));
    expect(personalities.size).toBeGreaterThanOrEqual(2);
  });

  it("formats injectable context", () => {
    const dna = generateDesignDNA({ projectName: "Test", segment: "tecnico" });
    const ctx = formatDesignDNAContext(dna);
    expect(ctx).toContain("Design DNA");
    expect(ctx).toContain(dna.palette.primary);
  });
});

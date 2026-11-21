import { describe, expect, it } from "vitest";
import {
  assessDesignQuality,
  buildWlcDesignContext,
  WLC_DESIGN_BREAKPOINTS_PX,
  WLC_SPACING_SCALE_PX,
} from "../lib/wlc-design-intelligence.ts";

describe("WLC design intelligence", () => {
  it("exposes consistent spacing and responsive baselines", () => {
    expect(WLC_SPACING_SCALE_PX).toEqual([4, 8, 12, 16, 24, 32, 40, 48, 64]);
    expect(WLC_DESIGN_BREAKPOINTS_PX).toContain(320);
    expect(WLC_DESIGN_BREAKPOINTS_PX).toContain(1440);
  });

  it("does not approve a design without evidence", () => {
    const result = assessDesignQuality([]);
    expect(result.verdict).toBe("blocked");
    expect(result.score).toBe(0);
    expect(result.missing).toContain("accessibility");
  });

  it("approves only complete, evidenced coverage", () => {
    const dimensions = [
      "design-tokens", "spacing", "typography", "visual-hierarchy",
      "responsive-layout", "accessibility", "interaction-states", "consistency",
    ] as const;
    const result = assessDesignQuality(dimensions.map((dimension) => ({
      dimension, status: "verified" as const, evidence: `Verified ${dimension} with reproducible inspection.`,
    })));
    expect(result.score).toBe(100);
    expect(result.verdict).toBe("approved");
  });

  it("provides practical design instructions without claiming visual inspection", () => {
    const context = buildWlcDesignContext();
    expect(context).toContain("WCAG AA");
    expect(context).toContain("loading, empty, error");
    expect(context).toContain("screenshot");
  });
});

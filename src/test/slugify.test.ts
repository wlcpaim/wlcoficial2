import { describe, it, expect } from "vitest";
import { slugify, SLUG_RE } from "@/lib/live-preview";
describe("slugify", () => {
  it("matches spec examples", () => {
    expect(slugify("Nexusia")).toBe("nexusia");
    expect(slugify("StreetRaceV2")).toBe("streetracev2");
    expect(slugify("PirateFlix")).toBe("pirateflix");
  });
  it("normalizes spaces, accents and symbols", () => { expect(slugify("  Meu Projeto Ção!! ")).toBe("meu-projeto-cao"); });
  it("caps length at 48 and stays valid", () => { const s = slugify("a".repeat(80)); expect(s.length).toBe(48); expect(SLUG_RE.test(s)).toBe(true); });
});

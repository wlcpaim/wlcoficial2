import { describe, expect, it } from "vitest";
import { OFFICIAL_MOTORS, officialCatalogPrompt, isOfficialMotor } from "./cognitive-official-catalog";

describe("official cognitive catalog", () => {
  it("ships the 4 official motors in source code", () => {
    expect(OFFICIAL_MOTORS.map((m) => m.slug)).toEqual(["wlc-core", "engenharia-fullstack", "design-systems", "game-studio-fisica"]);
  });
  it("every motor has rules and concepts", () => {
    for (const m of OFFICIAL_MOTORS) { expect(m.rules.length).toBeGreaterThan(0); expect(m.concepts.length).toBeGreaterThan(0); }
  });
  it("prompt block is injected without any database", () => {
    expect(officialCatalogPrompt()).toContain("MOTORES OFICIAIS WLC.IA");
  });
  it("recognises official slugs only", () => {
    expect(isOfficialMotor("wlc-core")).toBe(true);
    expect(isOfficialMotor("meu-motor")).toBe(false);
  });
});

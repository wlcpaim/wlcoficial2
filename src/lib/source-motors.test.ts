import { describe, expect, it } from "vitest";
import { SOURCE_MOTORS, parseMotorFile } from "./source-motors";
import { officialCatalogPrompt } from "./cognitive-official-catalog";

describe("source motors auto-discovery", () => {
  it("finds every motor saved in knowledge/motors", () => {
    const slugs = SOURCE_MOTORS.map((m) => m.slug);
    for (const s of ["css", "github", "saas", "estrutura-de-projetos", "muito-conhecimento"]) expect(slugs).toContain(s);
  });
  it("injects saved motor knowledge into the chat prompt", () => {
    expect(officialCatalogPrompt("como usar conventional commits")).toContain("Conventional Commits");
  });
  it("ignores files without knowledge", () => {
    expect(parseMotorFile({ name: "x" }, "x")).toBeNull();
  });
});

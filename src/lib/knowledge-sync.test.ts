import { describe, it, expect } from "vitest";
import { motorDir, renderMotorJson, renderMotorReadme } from "./knowledge-sync";

const m = { name: "Saas", slug: "saas", description: "Apps SaaS" };
const k = [{ title: "Multi-tenant", content: "Isolar por tenant.", category: "arquitetura", kind: "rule", keywords: ["tenant"], validation: "verified" }];

describe("knowledge sync files", () => {
  it("saves each motor under knowledge/motors/<slug>", () => {
    expect(motorDir("saas")).toBe("knowledge/motors/saas");
    expect(motorDir("../Evil Slug")).toBe("knowledge/motors/evil-slug");
  });
  it("motor.json carries every knowledge item", () => {
    const j = JSON.parse(renderMotorJson(m, k));
    expect(j.slug).toBe("saas");
    expect(j.knowledge).toHaveLength(1);
    expect(j.knowledge[0].content).toBe("Isolar por tenant.");
  });
  it("README lists the knowledge", () => {
    expect(renderMotorReadme(m, k)).toContain("## Multi-tenant");
  });
});

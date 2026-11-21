import { describe, it, expect } from "vitest";
import { retrieveWlcKnowledge } from "@/lib/wlc-knowledge-base";
describe("conhecimento de construção", () => {
  it("recupera navegação SPA quando links estão quebrados", () => {
    expect(retrieveWlcKnowledge("os botões e caminhos não funcionam, links quebrados", 6).some((e) => e.id === "webdev-09")).toBe(true);
  });
  it("recupera padrões fintech", () => {
    expect(retrieveWlcKnowledge("criar fintech com pix saldo e extrato", 6).some((e) => e.id === "webdev-11")).toBe(true);
  });
});

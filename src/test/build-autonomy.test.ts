import { describe, it, expect } from "vitest";
import { ASKS_PERMISSION } from "@/lib/agent.server";
describe("modo Criar sem pedir permissão", () => {
  it("detecta resposta pedindo permissão", () => expect(ASKS_PERMISSION.test("Posso prosseguir com a criação?")).toBe(true));
  it("não confunde resumo final", () => expect(ASKS_PERMISSION.test("Criei index.html e app.js.")).toBe(false));
});

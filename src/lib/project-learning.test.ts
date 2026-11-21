import { describe, it, expect } from "vitest";
import { extractProjectLesson } from "./project-learning";
describe("extractProjectLesson", () => {
  it("returns null when no file was written", () => {
    expect(extractProjectLesson({ chatTitle: "x", userMessage: "y", toolLog: [], writtenPaths: [] })).toBeNull();
  });
  it("records folders and failures from the real log", () => {
    const l = extractProjectLesson({ chatTitle: "Loja", userMessage: "faz loja", toolLog: [{ tool: "write_file", ok: false, summary: "422 sha" }], writtenPaths: ["js/modules/pdv.js", "css/tokens.css"] })!;
    expect(l.content).toContain("css, js/modules");
    expect(l.content).toContain("422 sha");
  });
});

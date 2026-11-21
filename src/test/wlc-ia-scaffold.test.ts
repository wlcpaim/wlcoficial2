import { describe, expect, it } from "vitest";
import { buildWlcIaFiles } from "@/lib/wlc-ia-scaffold";

describe("WLC.IA project preset", () => {
  it("generates the complete responsive chat starter", () => {
    const files = buildWlcIaFiles({ name: "wlc-app", goal: "Assistente pessoal", audience: "Usuários", features: "histórico, chat" });
    expect(files.map((f) => f.path)).toEqual(["index.html", "src/styles.css", "src/app.js", "src/intelligence.js", "package.json", "vite.config.js", "public/favicon.svg", "README.md", ".gitignore", ".env.example"]);
    expect(files.find((f) => f.path === "index.html")?.content).toContain("WLC.IA");
    expect(files.find((f) => f.path === "src/styles.css")?.content).toContain("@media(max-width:760px)");
    expect(files.find((f) => f.path === "src/app.js")?.content).toContain("localIntelligence.reply(messages)");
    expect(files.find((f) => f.path === "src/intelligence.js")?.content).toContain("Ainda não tenho conhecimento suficiente");
    expect(files.find((f) => f.path === "src/intelligence.js")?.content).toContain("Intelligence Core v0.1");
    expect(files.find((f) => f.path === "README.md")?.content).toContain("Conectar uma IA");
    expect(files.find((f) => f.path === "README.md")?.content).toContain("núcleo local de inteligência");
  });

  it("escapes project description in generated HTML", () => {
    const files = buildWlcIaFiles({ name: "safe", goal: "<script>alert(1)</script>" });
    const html = files.find((f) => f.path === "index.html")?.content ?? "";
    expect(html).not.toContain("<meta name=\"description\" content=\"<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

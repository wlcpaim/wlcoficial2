import { describe, it, expect } from "vitest";
import { buildGenesisFiles, featureList } from "@/lib/genesis-scaffold";

describe("Genesis scaffold", () => {
  it("creates the five starter files so a repo is never empty", () => {
    const paths = buildGenesisFiles({ name: "meu-app", goal: "Agenda" }).map((f) => f.path);
    expect(paths).toEqual(["index.html", "css/style.css", "js/app.js", "README.md", ".gitignore"]);
  });
  it("uses the given goal and features", () => {
    const files = buildGenesisFiles({ name: "loja", goal: "Vender bolos", features: "Catálogo, Carrinho" });
    const html = files.find((f) => f.path === "index.html")!.content;
    expect(html).toContain("Vender bolos");
    expect(html).toContain("Carrinho");
  });
  it("escapes HTML from user input", () => {
    const html = buildGenesisFiles({ name: "x", goal: "<script>alert(1)</script>" })[0]!.content;
    expect(html).not.toContain("<script>alert");
  });
  it("splits features by comma or newline", () => {
    expect(featureList("a, b\nc")).toEqual(["a", "b", "c"]);
  });
});

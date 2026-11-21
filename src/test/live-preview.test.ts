import { describe, it, expect } from "vitest";
import { detectFramework, pickEntry, resolvePath } from "@/lib/live-preview";

describe("live preview helpers", () => {
  it("detects next", () => expect(detectFramework(["package.json"], JSON.stringify({ dependencies: { next: "14" } }))).toBe("next"));
  it("detects vite-react", () => expect(detectFramework(["index.html"], JSON.stringify({ dependencies: { react: "19" }, devDependencies: { vite: "7" } }))).toBe("vite-react"));
  it("detects static", () => expect(detectFramework(["index.html", "a.css"], null)).toBe("static"));
  it("prefers root index.html", () => expect(pickEntry(["docs/index.html", "index.html"])).toBe("index.html"));
  it("resolves relative paths", () => expect(resolvePath("public/index.html", "../src/a.js")).toBe("src/a.js"));
  it("ignores external urls", () => expect(resolvePath("index.html", "https://cdn.x/a.js")).toBeNull());
});

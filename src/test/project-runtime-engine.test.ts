import { describe, expect, it } from "vitest";
import { detectFramework, pickEntry, resolvePath } from "../lib/live-preview";
import { analyzeRuntimeRequest, transitionRuntime } from "../lib/runtime/project-runtime-engine";

describe("runtime-aware framework detection", () => {
  it("detects React + Vite", () => expect(detectFramework(["index.html"], '{"dependencies":{"react":"x","vite":"x"}}')).toBe("vite-react"));
  it("detects Vite without React", () => expect(detectFramework(["index.html"], '{"devDependencies":{"vite":"x"}}')).toBe("vite"));
  it("detects Next", () => expect(detectFramework(["app/page.tsx"], '{"dependencies":{"next":"x","react":"x"}}')).toBe("next"));
  it("detects static html without package manifest", () => expect(detectFramework(["index.html","styles.css"], null)).toBe("static"));
  it("resolves assets without allowing traversal above root", () => expect(resolvePath("src/index.html", "../../secret.txt")).toBe("secret.txt"));
});

describe("Project Runtime Engine fail-closed", () => {
  const request = { projectId:"p", commitSha:"abcdef0123", files:{paths:["package.json","index.html"],files:{"package.json":'{"scripts":{"build":"vite build"},"devDependencies":{"vite":"x"}}'}}};
  it("reports runtime provider missing rather than claiming preview ready", () => {
    const result=analyzeRuntimeRequest(request,false);
    expect(result.state).toBe("ERROR");
    expect(result.capability).toBe("provider-unconfigured");
    expect(result.error).toContain("RuntimeAdapter");
  });
  it("rejects illegal transitions", () => expect(()=>transitionRuntime("QUEUED","READY")).toThrow("Transição inválida"));
});

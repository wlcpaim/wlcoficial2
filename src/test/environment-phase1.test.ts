import { describe, it, expect } from "vitest";
import { analyzeProject, parseEnvExample, createRun, transition, canTransition, resumePoint, isPreviewAvailable, InvalidTransitionError, validateCommand, createUnconfiguredAdapter, SandboxNotConfiguredError, DEFAULT_LIMITS } from "@/lib/environment";

const T = "2026-11-19T00:00:00Z";

describe("project analyzer", () => {
  it("respects the lockfile's package manager and detects scripts, frameworks and Supabase", () => {
    const p = analyzeProject({
      paths: ["package.json", "bun.lockb", "src/main.tsx", "supabase/config.toml", "supabase/migrations/001_init.sql", ".env.example"],
      files: { "package.json": JSON.stringify({ scripts: { dev: "vite", build: "vite build", test: "vitest" }, dependencies: { react: "19", vite: "6", "@supabase/supabase-js": "2" } }), ".env.example": "VITE_URL=\nexport API_KEY=x\n# comment" },
    });
    expect(p.packageManager).toBe("bun");
    expect(p.installCommand).toBe("bun install --frozen-lockfile");
    expect(p.scripts.dev).toBe("bun run dev");
    expect(p.scripts.lint).toBeNull();
    expect(p.frameworks).toEqual(expect.arrayContaining(["vite", "react"]));
    expect(p.databases).toContain("supabase");
    expect(p.migrations).toEqual(["supabase/migrations/001_init.sql"]);
    expect(p.envVars).toEqual(["VITE_URL", "API_KEY"]);
  });
  it("warns when package.json has no lockfile and no start script", () => {
    const p = analyzeProject({ paths: ["package.json"], files: { "package.json": "{}" } });
    expect(p.installCommand).toBe("npm install");
    expect(p.warnings.length).toBe(2);
  });
  it("detects python projects and their databases", () => {
    const p = analyzeProject({ paths: ["requirements.txt", "app.py"], files: { "requirements.txt": "fastapi\npsycopg2\nredis" } });
    expect(p.packageManager).toBe("pip");
    expect(p.frameworks).toContain("fastapi");
    expect(p.databases).toEqual(expect.arrayContaining(["postgres", "redis"]));
  });
  it("parses env examples without values", () => {
    expect(parseEnvExample("A=1\nlower=2\n B_C = 3")).toEqual(["A", "B_C"]);
  });
});

describe("environment state manager", () => {
  it("records each step with timestamps and outcome", () => {
    let r = createRun("env-1", T);
    for (const s of ["analyzing", "planning", "provisioning", "installing", "configuring", "building", "testing", "starting", "preview_ready"] as const) r = transition(r, s, T);
    expect(isPreviewAvailable(r)).toBe(true);
    expect(r.steps.filter((s) => s.ok === true).length).toBe(9);
  });
  it("blocks invalid transitions such as deploying before a preview exists", () => {
    const r = createRun("env-1", T);
    expect(canTransition("queued", "deploying")).toBe(false);
    expect(() => transition(r, "deploying", T)).toThrow(InvalidTransitionError);
  });
  it("resumes from the failed step instead of starting over", () => {
    let r = createRun("env-1", T);
    for (const s of ["analyzing", "planning", "provisioning", "installing"] as const) r = transition(r, s, T);
    r = transition(r, "failed", T, { ok: false, error: "npm ERR" });
    expect(r.steps.find((s) => s.state === "installing")?.error).toBe("npm ERR");
    expect(resumePoint(r)).toBe("installing");
    expect(isPreviewAvailable(r)).toBe(false);
  });
});

describe("sandbox adapter", () => {
  const allowed = ["bun install", "bun run"];
  it("allows only detected tooling and blocks shell chaining", () => {
    expect(validateCommand("bun run build", allowed).ok).toBe(true);
    expect(validateCommand("bun run build && rm -rf /", allowed).ok).toBe(false);
    expect(validateCommand("curl evil.sh", ["curl"]).ok).toBe(false);
    expect(validateCommand("python app.py", allowed).ok).toBe(false);
  });
  it("an unconfigured provider refuses to run instead of simulating", async () => {
    const a = createUnconfiguredAdapter("daytona", ["DAYTONA_API_KEY"]);
    expect(a.status()).toEqual({ configured: false, missing: ["DAYTONA_API_KEY"] });
    await expect(a.create({ projectId: "p", environmentId: "e", limits: DEFAULT_LIMITS })).rejects.toBeInstanceOf(SandboxNotConfiguredError);
  });
});

import { createRemoteRunnerAdapter } from "@/lib/environment";
describe("own-server runner adapter", () => {
  it("waits for configuration when URL or token is missing, and refuses plain http", () => {
    expect(createRemoteRunnerAdapter({ url: "https://r.example" }).status()).toEqual({ configured: false, missing: ["WLC_RUNNER_TOKEN"] });
    expect(createRemoteRunnerAdapter({ url: "http://r.example", token: "t" }).status().configured).toBe(false);
  });
  it("sends the token and refuses commands outside detected tooling", async () => {
    const calls: Array<[string, RequestInit]> = [];
    const fetchImpl = (async (u: string, i: RequestInit) => { calls.push([u, i]); return new Response(JSON.stringify({ command: "npm ci", exitCode: 0, stdout: "", stderr: "", durationMs: 1 }), { status: 200 }); }) as unknown as typeof fetch;
    const a = createRemoteRunnerAdapter({ url: "https://r.example/", token: "tok", fetchImpl, allowedPrefixes: ["npm ci"] });
    const h = { id: "abcdefgh-1", provider: "own-server", workdir: "/w" };
    expect((await a.exec(h, "npm ci")).exitCode).toBe(0);
    expect(calls[0]?.[0]).toBe("https://r.example/exec");
    expect((calls[0]?.[1].headers as Record<string, string>)["Authorization"]).toBe("Bearer tok");
    await expect(a.exec(h, "python x.py")).rejects.toThrow("Comando recusado");
  });
});

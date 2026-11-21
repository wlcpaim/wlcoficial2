import { describe, expect, it } from "vitest";
import { validateAgentWritePath, validateBranchName } from "../lib/agent-safety";

describe("agent safety boundaries", () => {
  it("accepts normal project-relative source paths", () => {
    expect(validateAgentWritePath("src/components/App.tsx")).toEqual({ path: "src/components/App.tsx", error: null });
  });

  it.each(["../outside.txt", "/etc/passwd", "src/../../secret", "src\\..\\secret"])( 
    "rejects traversal and absolute paths: %s", (path) => {
      expect(validateAgentWritePath(path).error).toBeTruthy();
    },
  );

  it.each([".env", ".env.production", "config/credentials.json", "private/server.pem", ".github/workflows/release.yml"])(
    "protects sensitive paths: %s", (path) => {
      expect(validateAgentWritePath(path).error).toContain("protegido");
    },
  );

  it("allows non-secret environment templates but protects runtime env files", () => {
    expect(validateAgentWritePath(".env.example").error).toBeNull();
    expect(validateAgentWritePath(".env.production").error).toBeTruthy();
  });

  it("protects dependency manifests and database migrations", () => {
    expect(validateAgentWritePath("package.json").error).toContain("protegido");
    expect(validateAgentWritePath("supabase/migrations/001.sql").error).toContain("protegido");
  });

  it("normalizes Windows separators before validating", () => {
    expect(validateAgentWritePath("src\\components\\App.tsx").path).toBe("src/components/App.tsx");
  });

  it("accepts valid branch names and rejects malformed refs", () => {
    expect(validateBranchName("feature/autonomous-worker")).toBeNull();
    for (const name of ["", "../main", "feature//x", "release.lock", "bad name", "x@{y}"]) {
      expect(validateBranchName(name)).toBeTruthy();
    }
  });
});

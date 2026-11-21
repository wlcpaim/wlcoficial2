import { validateFilePath } from "./wlc-autonomous-development-core";

/** Paths that require a separate human-reviewed change process. */
const PROTECTED_WRITE_PATHS = [
  /^\.env(?:\..*)?$/i,
  /(^|\/)\.env(?:\..*)?$/i,
  /(^|\/)(?:id_rsa|id_ed25519|.*\.(?:pem|key|p12|pfx))$/i,
  /(^|\/)(?:credentials?|secrets?)(?:\.[^/]*)?$/i,
  /^\.github\/workflows\//i,
  /(^|\/)package(?:-lock)?\.json$/i,
  /(^|\/)(?:bun\.lockb?|pnpm-lock\.yaml|yarn\.lock)$/i,
  /^supabase\/migrations\//i,
];

export function validateAgentWritePath(input: string): { path: string | null; error: string | null } {
  const path = input.replace(/\\/g, "/").trim();
  const invalid = validateFilePath(path);
  if (invalid) return { path: null, error: invalid };
  const basename = path.split("/").slice(-1)[0]?.toLowerCase();
  const safeEnvTemplate = basename === ".env.example" || basename === ".env.sample";
  if (!safeEnvTemplate && PROTECTED_WRITE_PATHS.some((pattern) => pattern.test(path))) {
    return { path: null, error: "Este caminho é protegido e exige revisão humana específica." };
  }
  return { path, error: null };
}

/** Validates branch names against the core restrictions used by Git check-ref-format. */
export function validateBranchName(name: string): string | null {
  if (
    !name || name.length > 240 || name.startsWith("/") || name.endsWith("/") ||
    name.endsWith(".") || name.includes("..") || name.includes("\\") ||
    /[ ~^:?*\[\]]/.test(name) || name.includes("@{") ||
    name.split("/").some((part) => !part || part.startsWith(".") || part.endsWith(".") || part.endsWith(".lock"))
  ) return "Nome de branch inválido segundo as regras do Git.";
  return null;
}

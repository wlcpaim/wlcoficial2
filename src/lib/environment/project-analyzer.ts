/**
 * Project Analyzer — pure, browser-safe. Turns a repository's file list and
 * manifest contents into a technical profile used to provision environments.
 * Never executes code; only reads text already fetched from GitHub.
 */
export type PackageManager = "bun" | "pnpm" | "yarn" | "npm" | "pip" | "poetry" | "uv" | "composer" | "none";
export type DatabaseKind = "postgres" | "mysql" | "sqlite" | "redis" | "mongodb" | "supabase";

export type ProjectProfile = {
  languages: string[];
  packageManager: PackageManager;
  lockfile: string | null;
  installCommand: string | null;
  scripts: { dev: string | null; build: string | null; start: string | null; test: string | null; lint: string | null; typecheck: string | null };
  frameworks: string[];
  databases: DatabaseKind[];
  migrations: string[];
  envVars: string[];
  runtime: { node: string | null; python: string | null };
  needsBuild: boolean;
  warnings: string[];
};

/** Manifest files the analyzer reads; callers fetch only those present in the tree. */
export const ANALYZER_FILES = ["package.json", "pyproject.toml", "requirements.txt", "composer.json", ".nvmrc", ".node-version", ".python-version", "prisma/schema.prisma", "drizzle.config.ts", ".env.example"];

export type AnalyzerInput = { paths: string[]; files: Record<string, string | undefined> };

const LOCKS: Array<[string, PackageManager, string]> = [
  ["bun.lockb", "bun", "bun install --frozen-lockfile"],
  ["bun.lock", "bun", "bun install --frozen-lockfile"],
  ["pnpm-lock.yaml", "pnpm", "pnpm install --frozen-lockfile"],
  ["yarn.lock", "yarn", "yarn install --frozen-lockfile"],
  ["package-lock.json", "npm", "npm ci"],
  ["uv.lock", "uv", "uv sync --frozen"],
  ["poetry.lock", "poetry", "poetry install --no-root"],
  ["composer.lock", "composer", "composer install"],
];

function parseJson(text: string | undefined): Record<string, any> | null {
  if (!text) return null;
  try { const v = JSON.parse(text); return v && typeof v === "object" ? v : null; } catch { return null; }
}

export function parseEnvExample(text: string): string[] {
  const out = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=/.exec(line);
    if (m && m[1]) out.add(m[1]);
  }
  return [...out];
}

export function analyzeProject(input: AnalyzerInput): ProjectProfile {
  const paths = input.paths.map((p) => p.replace(/^\.\//, ""));
  const has = (p: string) => paths.includes(p);
  const warnings: string[] = [];
  const pkg = parseJson(input.files["package.json"]);
  const deps: Record<string, string> = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  const pyproject = input.files["pyproject.toml"] ?? "";
  const requirements = input.files["requirements.txt"] ?? "";

  let packageManager: PackageManager = "none";
  let lockfile: string | null = null;
  let installCommand: string | null = null;
  for (const [file, pm, cmd] of LOCKS) {
    if (has(file)) { packageManager = pm; lockfile = file; installCommand = cmd; break; }
  }
  if (!lockfile) {
    if (pkg) { packageManager = "npm"; installCommand = "npm install"; warnings.push("package.json sem lockfile: versões instaladas podem variar."); }
    else if (has("requirements.txt")) { packageManager = "pip"; installCommand = "pip install -r requirements.txt"; }
    else if (has("pyproject.toml")) { packageManager = "pip"; installCommand = "pip install ."; }
    else if (has("composer.json")) { packageManager = "composer"; installCommand = "composer install"; }
  }
  const declared = typeof pkg?.packageManager === "string" ? String(pkg.packageManager).split("@")[0] : null;
  if (declared && lockfile && declared !== packageManager) warnings.push(`packageManager declara "${declared}" mas o lockfile é de ${packageManager}.`);

  const languages = new Set<string>();
  for (const p of paths) {
    if (/\.(ts|tsx)$/.test(p)) languages.add("typescript");
    else if (/\.(js|jsx|mjs|cjs)$/.test(p)) languages.add("javascript");
    else if (p.endsWith(".py")) languages.add("python");
    else if (p.endsWith(".php")) languages.add("php");
    else if (p.endsWith(".go")) languages.add("go");
    else if (p.endsWith(".rs")) languages.add("rust");
    else if (p.endsWith(".html")) languages.add("html");
  }

  const frameworks: string[] = [];
  const fw: Array<[string, string]> = [["next", "next"], ["@tanstack/react-start", "tanstack-start"], ["@remix-run/react", "remix"], ["nuxt", "nuxt"], ["@sveltejs/kit", "sveltekit"], ["@angular/core", "angular"], ["astro", "astro"], ["vite", "vite"], ["react", "react"], ["vue", "vue"], ["svelte", "svelte"], ["express", "express"], ["fastify", "fastify"], ["hono", "hono"]];
  for (const [d, name] of fw) if (deps[d]) frameworks.push(name);
  const py = (pyproject + "\n" + requirements).toLowerCase();
  for (const name of ["django", "flask", "fastapi"]) if (py.includes(name)) frameworks.push(name);
  if (input.files["composer.json"]?.includes("laravel/framework")) frameworks.push("laravel");

  const databases = new Set<DatabaseKind>();
  const allDeps = Object.keys(deps).join(" ") + " " + py;
  if (/\b(pg|postgres|psycopg2?|asyncpg)\b/.test(allDeps) || /@prisma|drizzle-orm/.test(allDeps) && /postgres/i.test(input.files["prisma/schema.prisma"] ?? input.files["drizzle.config.ts"] ?? "")) databases.add("postgres");
  if (/\b(mysql2?|pymysql|mysqlclient)\b/.test(allDeps)) databases.add("mysql");
  if (/\b(sqlite3|better-sqlite3)\b/.test(allDeps)) databases.add("sqlite");
  if (/\b(redis|ioredis)\b/.test(allDeps)) databases.add("redis");
  if (/\b(mongodb|mongoose|pymongo)\b/.test(allDeps)) databases.add("mongodb");
  if (deps["@supabase/supabase-js"] || has("supabase/config.toml")) databases.add("supabase");

  const migrations = paths.filter((p) => /(^|\/)(migrations?|supabase\/migrations|drizzle|prisma\/migrations|alembic\/versions)\/.+\.(sql|ts|js|py)$/.test(p)).sort();

  const envFile = ["/.env.example", ".env.example", ".env.sample", ".env.template"].map((f) => input.files[f]).find(Boolean);
  const envVars = envFile ? parseEnvExample(envFile) : [];
  if (!envFile && paths.some((p) => /^\.env(\.|$)/.test(p) && !p.includes("example"))) warnings.push("Arquivo .env versionado no repositório: possível vazamento de segredo.");

  const s = (pkg?.scripts ?? {}) as Record<string, string>;
  const run = packageManager === "bun" ? "bun run" : packageManager === "pnpm" ? "pnpm" : packageManager === "yarn" ? "yarn" : "npm run";
  const pick = (...names: string[]) => { const n = names.find((x) => typeof s[x] === "string"); return n ? `${run} ${n}` : null; };
  const scripts = { dev: pick("dev", "serve"), build: pick("build"), start: pick("start", "preview"), test: pick("test"), lint: pick("lint"), typecheck: pick("typecheck", "type-check", "tsc") };
  if (pkg && !scripts.dev && !scripts.start) warnings.push("Nenhum script dev/start: o Preview não saberá como iniciar a aplicação.");

  const node = (pkg?.engines?.node as string | undefined) ?? input.files[".nvmrc"]?.trim() ?? input.files[".node-version"]?.trim() ?? null;
  const python = input.files[".python-version"]?.trim() ?? (/requires-python\s*=\s*"([^"]+)"/.exec(pyproject)?.[1] ?? null);
  const needsBuild = Boolean(scripts.build) || frameworks.some((f) => f !== "react" && f !== "vue");

  return { languages: [...languages].sort(), packageManager, lockfile, installCommand, scripts, frameworks, databases: [...databases], migrations, envVars, runtime: { node, python }, needsBuild, warnings };
}

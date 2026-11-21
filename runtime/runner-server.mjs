/**
 * WLC.IA v3 Remote Runner — Node 20+/Bun (npm/bun install, tsc --noEmit, test)
 * and Python 3.12 (venv, pip, pytest). Token auth; per-workspace Docker sandbox.
 * Agent tool run_project_checks targets this when WLC_RUNNER_URL is configured.
 */
/**
 * WLC runner: run on YOUR server (Node 20+, Docker installed), behind HTTPS.
 *   WLC_RUNNER_TOKEN=<long random> WLC_SANDBOX_IMAGE=node:22-bookworm-slim node runtime/runner-server.mjs
 * Each sandbox gets its own workspace dir; commands run via docker-sandbox.mjs
 * (no shell, read-only root, dropped caps, CPU/memory/PID limits).
 */
import { createServer } from "node:http";
import { mkdir, rm } from "node:fs/promises";
import { timingSafeEqual, randomUUID } from "node:crypto";
import path from "node:path";
import { runSandboxCommand } from "./docker-sandbox.mjs";

const PORT = Number(process.env.PORT || 8790);
const ROOT = path.resolve(process.env.WLC_WORKSPACES || "./wlc-workspaces");
const TOKEN = process.env.WLC_RUNNER_TOKEN || "";
const ID = /^[a-zA-Z0-9-]{8,64}$/;
const BIN = { npm: "/usr/local/bin/npm", npx: "/usr/local/bin/npx", node: "/usr/local/bin/node", pnpm: "/usr/local/bin/pnpm", yarn: "/usr/local/bin/yarn", bun: "/usr/local/bin/bun" };

export function authorized(header, token = TOKEN) {
  if (!token || token.length < 32) return false;
  const got = Buffer.from(String(header || "").replace(/^Bearer /, ""));
  const want = Buffer.from(token);
  return got.length === want.length && timingSafeEqual(got, want);
}

export function splitCommand(command) {
  if (typeof command !== "string" || /[;&|`<>$\n\\"']/.test(command)) throw new Error("command contains shell syntax");
  const [tool, ...args] = command.trim().split(/\s+/);
  const bin = BIN[tool];
  if (!bin) throw new Error(`tool not allowed: ${tool}`);
  return { command: bin, args };
}

const send = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const readJson = (req) => new Promise((ok, bad) => { let s = ""; req.on("data", (c) => { s += c; if (s.length > 65536) req.destroy(); }); req.on("end", () => { try { ok(JSON.parse(s || "{}")); } catch (e) { bad(e); } }); });

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
  if (!authorized(req.headers.authorization)) return send(res, 401, { error: "unauthorized" });
  try {
    const body = await readJson(req);
    if (req.url === "/sandboxes") {
      const id = randomUUID();
      const workdir = path.join(ROOT, id);
      await mkdir(workdir, { recursive: true });
      return send(res, 200, { id, provider: "own-server", workdir });
    }
    if (!ID.test(body.id || "")) return send(res, 400, { error: "invalid id" });
    const workdir = path.join(ROOT, body.id);
    if (req.url === "/exec") {
      const { command, args } = splitCommand(body.command);
      const started = Date.now();
      const r = await runSandboxCommand({ workspace: workdir, command, args, timeoutMs: Math.min(Number(body.timeoutSec || 600), 900) * 1000 });
      return send(res, 200, { command: body.command, exitCode: r.exitCode ?? -1, stdout: r.stdout, stderr: r.stderr, durationMs: Date.now() - started });
    }
    if (req.url === "/destroy") { await rm(workdir, { recursive: true, force: true }); return send(res, 200, { ok: true }); }
    return send(res, 404, { error: "not found" });
  } catch (e) { return send(res, 400, { error: String(e?.message || e) }); }
});

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  if (!TOKEN || TOKEN.length < 32) { console.error("WLC_RUNNER_TOKEN must be at least 32 characters"); process.exit(1); }
  server.listen(PORT, () => console.log(`WLC runner on :${PORT}, workspaces in ${ROOT}`));
}

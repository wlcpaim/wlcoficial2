/**
 * SandboxAdapter for the user's own Docker server running runtime/runner-server.mjs.
 * Server-only: the token is read by the caller from process.env and passed in.
 */
import { createUnconfiguredAdapter, validateCommand, type SandboxAdapter, type SandboxHandle, type CommandResult } from "./sandbox-adapter";

export const RUNNER_SECRETS = ["WLC_RUNNER_URL", "WLC_RUNNER_TOKEN"] as const;

export type RunnerConfig = { url?: string | undefined; token?: string | undefined; fetchImpl?: typeof fetch; allowedPrefixes?: string[] };

export function createRemoteRunnerAdapter(cfg: RunnerConfig): SandboxAdapter {
  const missing = [!cfg.url ? "WLC_RUNNER_URL" : null, !cfg.token ? "WLC_RUNNER_TOKEN" : null].filter(Boolean) as string[];
  if (missing.length) return createUnconfiguredAdapter("own-server", missing);
  const base = cfg.url!.replace(/\/+$/, "");
  if (!/^https:\/\//.test(base)) return createUnconfiguredAdapter("own-server", ["WLC_RUNNER_URL precisa usar https://"]);
  const f = cfg.fetchImpl ?? fetch;
  const call = async <T>(path: string, body: unknown): Promise<T> => {
    const res = await f(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.token}` }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new Error(`Runner ${path} falhou (${res.status}): ${data.error ?? "sem detalhe"}`);
    return data;
  };
  return {
    provider: "own-server",
    status: () => ({ configured: true, missing: [] }),
    create: (input) => call<SandboxHandle>("/sandboxes", input),
    exec: async (handle, command, opts) => {
      if (cfg.allowedPrefixes) { const v = validateCommand(command, cfg.allowedPrefixes); if (!v.ok) throw new Error(`Comando recusado: ${v.reason}`); }
      return call<CommandResult>("/exec", { id: handle.id, command, timeoutSec: opts?.timeoutSec, env: opts?.env });
    },
    exposePort: async () => { throw new Error("Exposição de porta chega na fase do Preview real."); },
    destroy: async (handle) => { await call("/destroy", { id: handle.id }); },
  };
}

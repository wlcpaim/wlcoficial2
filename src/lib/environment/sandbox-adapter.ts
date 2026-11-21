/**
 * Sandbox Adapter contract. The WLC core depends only on this interface; real
 * providers (Daytona, containers, ...) plug in behind it. User code is never
 * executed in the main server. Without a configured provider the adapter
 * reports "awaiting configuration" instead of pretending to run anything.
 */
export type CommandResult = { command: string; exitCode: number; stdout: string; stderr: string; durationMs: number };
export type SandboxHandle = { id: string; provider: string; workdir: string };
export type SandboxLimits = { cpu: number; memoryMb: number; timeoutSec: number; network: "none" | "egress-allowlist" | "open" };

export interface SandboxAdapter {
  readonly provider: string;
  status(): { configured: boolean; missing: string[] };
  create(input: { projectId: string; environmentId: string; limits: SandboxLimits }): Promise<SandboxHandle>;
  exec(handle: SandboxHandle, command: string, opts?: { env?: Record<string, string>; timeoutSec?: number }): Promise<CommandResult>;
  exposePort(handle: SandboxHandle, port: number): Promise<{ url: string }>;
  destroy(handle: SandboxHandle): Promise<void>;
}

export class SandboxNotConfiguredError extends Error {
  constructor(public provider: string, public missing: string[]) { super(`Provedor de sandbox "${provider}" aguardando configuração: ${missing.join(", ")}`); }
}

export const DEFAULT_LIMITS: SandboxLimits = { cpu: 1, memoryMb: 1024, timeoutSec: 900, network: "egress-allowlist" };

/** Commands an environment may run: only the project's detected tooling, no shell chaining. */
export function validateCommand(command: string, allowedPrefixes: string[]): { ok: true } | { ok: false; reason: string } {
  const c = command.trim();
  if (!c) return { ok: false, reason: "comando vazio" };
  if (/[;&|`]|\$\(|>|<|\n/.test(c)) return { ok: false, reason: "encadeamento ou redirecionamento de shell não permitido" };
  if (/\b(sudo|rm\s+-rf\s+\/|curl|wget|ssh|scp|nc)\b/.test(c)) return { ok: false, reason: "comando bloqueado pela política de segurança" };
  if (!allowedPrefixes.some((p) => c === p || c.startsWith(p + " "))) return { ok: false, reason: "comando fora das ferramentas detectadas no projeto" };
  return { ok: true };
}

/** Adapter used when no provider credentials exist: honest, never simulates. */
export function createUnconfiguredAdapter(provider: string, missing: string[]): SandboxAdapter {
  const fail = async (): Promise<never> => { throw new SandboxNotConfiguredError(provider, missing); };
  return { provider, status: () => ({ configured: false, missing }), create: fail, exec: fail, exposePort: fail, destroy: fail };
}

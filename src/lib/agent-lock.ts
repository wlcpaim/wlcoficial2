// Shared rules for the per-chat agent lock (used by server and UI).
/** A running session without heartbeat for this long is treated as abandoned. */
export const LOCK_STALE_SECONDS = 60;
/** The server refreshes the heartbeat this often while a run is alive. */
export const HEARTBEAT_INTERVAL_MS = 15_000;

export const AGENT_BUSY_MESSAGE = "Outro agente já está executando neste chat. Aguarde a conclusão.";

export type SessionLike = { status: string | null; heartbeat_at: string | null } | null | undefined;

/** True only when a run is really alive: status running and a recent heartbeat. */
export function isSessionActive(s: SessionLike, now: number = Date.now()): boolean {
  if (!s || s.status !== "running" || !s.heartbeat_at) return false;
  const age = (now - new Date(s.heartbeat_at).getTime()) / 1000;
  return age >= 0 ? age < LOCK_STALE_SECONDS : true;
}

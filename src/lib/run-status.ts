// Pure helpers that turn the durable agent_events feed into the chat's live status.
export type RunEvent = { event_type: string; status: string; title: string; created_at: string };

const END_EVENTS = new Set(["execution_finished", "execution_paused", "execution_failed"]);
const STALE_AFTER_MS = 24 * 3600_000;

export const RESUME_MESSAGE =
  "Continue a tarefa anterior de onde parou. Primeiro confira o que já foi gravado no repositório e não repita o que já está pronto.";

/** Events of the run that started at `startedAt` (newest first). */
export function currentRunEvents<T extends RunEvent>(eventsNewestFirst: T[], startedAt: string | null): T[] {
  if (!startedAt) return eventsNewestFirst;
  const from = new Date(startedAt).getTime() - 2000;
  return eventsNewestFirst.filter((e) => new Date(e.created_at).getTime() >= from);
}

/**
 * A run was interrupted when no session is alive and the newest event is not an
 * end event (finished, paused or failed). Returns the last step reached.
 */
export function interruptedRun<T extends RunEvent>(eventsNewestFirst: T[], sessionActive: boolean, now: number = Date.now()): T | null {
  if (sessionActive) return null;
  const last = eventsNewestFirst[0];
  if (!last || END_EVENTS.has(last.event_type)) return null;
  if (now - new Date(last.created_at).getTime() > STALE_AFTER_MS) return null;
  return last;
}

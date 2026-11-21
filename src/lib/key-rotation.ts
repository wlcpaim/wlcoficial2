// Pure selection logic for Gemini key failover. Shared by the agent and the test center.
export type KeyCandidate = {
  id: string;
  name: string;
  google_project: string | null;
  is_primary: boolean;
  is_active: boolean;
  status: string;
  quota_exceeded_at: string | null;
  created_at: string;
};

export type SkippedKey = { id: string; name: string; reason: string };

/** A key marked over quota stays out of rotation for this long unless re-tested. */
export const QUOTA_COOLDOWN_MS = 60 * 60 * 1000;

export function normalizeProject(p: string | null | undefined): string {
  return (p ?? "").trim().toLowerCase();
}

export function orderKeys<T extends KeyCandidate>(keys: T[]): T[] {
  return [...keys].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

/** Google AI Studio daily quotas reset at midnight Pacific time (UTC-8, or UTC-7 in summer). */
export function nextDailyReset(from: number): number {
  const d = new Date(from);
  const reset = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 8);
  return reset > from ? reset : reset + 24 * 60 * 60 * 1000;
}

export function isCoolingDown(k: KeyCandidate, now = Date.now()): boolean {
  if (k.status !== "quota_exceeded" || !k.quota_exceeded_at) return false;
  const at = new Date(k.quota_exceeded_at).getTime();
  // A quota error keeps the key out until the daily reset, or at least the short cooldown.
  return now < Math.max(at + QUOTA_COOLDOWN_MS, nextDailyReset(at));
}

/**
 * Pick the next key to try. Never returns a key already tried in this run, an inactive or
 * invalid key, a key still cooling down after a quota error, or a key that shares a Google
 * project with an exhausted key (same quota pool, so it would not add capacity).
 */
export function pickNextKey<T extends KeyCandidate>(
  keys: T[],
  triedIds: Set<string>,
  exhaustedProjects: Set<string>,
  now = Date.now(),
): { key: T | null; skipped: SkippedKey[] } {
  const skipped: SkippedKey[] = [];
  for (const k of orderKeys(keys)) {
    if (triedIds.has(k.id)) continue;
    if (!k.is_active) {
      skipped.push({ id: k.id, name: k.name, reason: "desativada" });
      continue;
    }
    if (k.status === "invalid") {
      skipped.push({ id: k.id, name: k.name, reason: "chave inválida" });
      continue;
    }
    if (isCoolingDown(k, now)) {
      skipped.push({ id: k.id, name: k.name, reason: "cota esgotada recentemente" });
      continue;
    }
    const proj = normalizeProject(k.google_project);
    if (proj && exhaustedProjects.has(proj)) {
      skipped.push({ id: k.id, name: k.name, reason: `mesmo projeto Google (${k.google_project}) — mesma cota` });
      continue;
    }
    return { key: k, skipped };
  }
  return { key: null, skipped };
}

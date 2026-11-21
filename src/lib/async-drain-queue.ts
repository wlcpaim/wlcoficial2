/** Tracks fire-and-forget work and provides a deterministic drain before a request ends. */
export function createAsyncDrainQueue(onError: (error: unknown) => void = () => undefined) {
  const pending = new Set<Promise<void>>();

  function track(work: Promise<unknown>): void {
    let tracked!: Promise<void>;
    tracked = Promise.resolve(work)
      .then(() => undefined)
      .catch((error: unknown) => {
        try { onError(error); } catch { /* Error reporting must not break the drain. */ }
      })
      .finally(() => {
        pending.delete(tracked);
      });
    pending.add(tracked);
  }

  async function drain(): Promise<void> {
    // Loop because completion handlers may enqueue additional work.
    while (pending.size > 0) {
      await Promise.all([...pending]);
    }
  }

  return {
    track,
    drain,
    get pendingCount() { return pending.size; },
  };
}

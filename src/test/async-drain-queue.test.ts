import { describe, expect, it, vi } from "vitest";
import { createAsyncDrainQueue } from "../lib/async-drain-queue";

describe("createAsyncDrainQueue", () => {
  it("waits for tracked work before draining", async () => {
    const queue = createAsyncDrainQueue();
    let completed = false;
    queue.track(new Promise<void>((resolve) => setTimeout(() => { completed = true; resolve(); }, 5)));
    expect(queue.pendingCount).toBe(1);
    await queue.drain();
    expect(completed).toBe(true);
    expect(queue.pendingCount).toBe(0);
  });

  it("contains failures and reports them without rejecting drain", async () => {
    const onError = vi.fn();
    const queue = createAsyncDrainQueue(onError);
    queue.track(Promise.reject(new Error("telemetry unavailable")));
    await expect(queue.drain()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledOnce();
    expect(queue.pendingCount).toBe(0);
  });

  it("drains work enqueued while another task is settling", async () => {
    const queue = createAsyncDrainQueue();
    let secondCompleted = false;
    queue.track(Promise.resolve().then(() => {
      queue.track(Promise.resolve().then(() => { secondCompleted = true; }));
    }));
    await queue.drain();
    expect(secondCompleted).toBe(true);
    expect(queue.pendingCount).toBe(0);
  });
});

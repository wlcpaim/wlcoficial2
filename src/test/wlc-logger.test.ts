import { describe, expect, it, vi } from "vitest";
import { wlcLogger } from "../lib/wlc-logger";

describe("WLC logger secret scrubbing", () => {
  it("redacts secrets in nested values, plain text and Error stacks", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const token = "ghp_123456789012345678901234567890123456";
    const apiKey = "AIza123456789012345678901234567890";
    wlcLogger.info("test", `scrub ${token}`, {
      authorization: "Bearer private-token-value-123456",
      message: `request failed with ${token} and api_key=${apiKey}`,
      error: new Error(`failed using ${token}`),
    });
    const output = JSON.stringify(spy.mock.calls);
    expect(output).not.toContain(token);
    expect(output).not.toContain(apiKey);
    expect(output).not.toContain("private-token-value-123456");
    expect(output).toContain("[REDACTED]");
    spy.mockRestore();
  });
});

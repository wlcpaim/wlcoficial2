import { describe, it, expect } from "vitest";
import { toTxt } from "@/lib/chat-export";
describe("chat export", () => {
  it("includes generated code from events in full", () => {
    const t = toTxt({ chat: { id: "1", title: "x" }, messages: [{ role: "user", content: "oi" }], events: [{ id: 1, event_type: "tool", status: "started", title: "w", detail: { path: "a.js", content: "line1\nline2" }, created_at: "2026" }] });
    expect(t).toContain("line1\nline2");
  });
});

import { describe, it, expect } from "vitest";
import { injectSiteDb, COLLECTION_RE, SITE_DB_LIMITS } from "@/lib/site-db";
import { MAX_AUTO_CYCLES, SLICE_MS } from "@/lib/agent.server";

describe("site database", () => {
  it("injects the client pointing at the site's own collection API", () => {
    const out = injectSiteDb("<html><head><title>x</title></head></html>", "https://app.test", "11111111-1111-1111-1111-111111111111");
    expect(out).toContain("https://app.test/api/public/site-db/11111111-1111-1111-1111-111111111111");
    expect(out.indexOf("WlcDB")).toBeLessThan(out.indexOf("<title>"));
  });
  it("accepts simple collection names only", () => {
    expect(COLLECTION_RE.test("pedidos")).toBe(true);
    expect(COLLECTION_RE.test("../x")).toBe(false);
  });
  it("limits each record to 16 KB", () => expect(SITE_DB_LIMITS.maxRecordBytes).toBe(16_000));
  it("ends each server slice before a 60s request timeout", () => expect(SLICE_MS).toBeLessThan(60_000));
  it("keeps continuing automatically for several cycles", () => expect(MAX_AUTO_CYCLES).toBeGreaterThan(1));
});

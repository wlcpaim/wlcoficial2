import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, redactSecrets, secretHint } from "@/lib/crypto.server";

// Uses an explicit test key so the suite never depends on the deployed secret.
const KEY = "unit-test-key-0123456789abcdef0123456789abcdef";
const PLAIN = "ghp_DUMMYTOKENFORTESTING1234567890";

describe("credential encryption", () => {
  it("round-trips a stored credential", async () => {
    const ct = await encryptSecret(PLAIN, KEY);
    expect(ct.startsWith("v1:")).toBe(true);
    expect(ct.split(":")).toHaveLength(3);
    expect(await decryptSecret(ct, KEY)).toBe(PLAIN);
  });

  it("produces a different ciphertext on every save", async () => {
    expect(await encryptSecret(PLAIN, KEY)).not.toBe(await encryptSecret(PLAIN, KEY));
  });

  it("refuses to decrypt with another key", async () => {
    const ct = await encryptSecret(PLAIN, KEY);
    await expect(decryptSecret(ct, "other-key-0123456789abcdef0123456789abcdef")).rejects.toThrow();
  });

  it("rejects malformed payloads", async () => {
    await expect(decryptSecret("not-a-payload", KEY)).rejects.toThrow("Formato de credencial inválido");
  });

  it("shows only the last 4 characters and redacts leaked keys", () => {
    expect(secretHint(PLAIN)).toBe("••••7890");
    expect(redactSecrets(`key ${PLAIN} end`)).not.toContain("ghp_");
    expect(redactSecrets("AIzaABCDEFGHIJKLMNOPQRSTUVWXYZ123456")).toBe("[chave-oculta]");
  });
});

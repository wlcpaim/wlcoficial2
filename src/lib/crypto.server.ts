// AES-GCM encryption for third-party credentials (GitHub tokens, Gemini keys).
// The key comes from the CREDENTIALS_ENCRYPTION_KEY secret and never leaves the server.
const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function getKey(rawOverride?: string): Promise<CryptoKey> {
  const raw = rawOverride ?? process.env["CREDENTIALS_ENCRYPTION_KEY"];
  if (!raw) throw new Error("Chave de criptografia do servidor não configurada");
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(raw));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plain: string, rawKey?: string): Promise<string> {
  const key = await getKey(rawKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain)));
  return `v1:${toB64(iv)}:${toB64(ct)}`;
}

export async function decryptSecret(payload: string, rawKey?: string): Promise<string> {
  const [v, ivB64, ctB64] = payload.split(":");
  if (v !== "v1" || !ivB64 || !ctB64) throw new Error("Formato de credencial inválido");
  const key = await getKey(rawKey);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) as BufferSource },
    key,
    fromB64(ctB64) as BufferSource,
  );
  return dec.decode(pt);
}

export function secretHint(secret: string): string {
  const s = secret.trim();
  return s.length <= 4 ? "••••" : `••••${s.slice(-4)}`;
}

/** Remove anything that looks like a credential from text before logging or storing it. */
export function redactSecrets(text: string): string {
  return text
    .replace(/AIza[0-9A-Za-z_\-]{20,}/g, "[chave-oculta]")
    .replace(/gh[pousr]_[0-9A-Za-z]{20,}/g, "[token-oculto]")
    .replace(/github_pat_[0-9A-Za-z_]{20,}/g, "[token-oculto]")
    .replace(/Bearer\s+[0-9A-Za-z._\-]{16,}/g, "Bearer [oculto]");
}

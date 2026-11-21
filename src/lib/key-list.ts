/** Splits pasted text into unique API keys: one per line (also commas/spaces), ignoring blanks, short strings and keys already saved. */
export function parseKeyList(text: string, existingHints: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const k = raw.trim();
    if (k.length < 20 || k.length > 200 || seen.has(k)) continue;
    if (existingHints.includes(`••••${k.slice(-4)}`)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

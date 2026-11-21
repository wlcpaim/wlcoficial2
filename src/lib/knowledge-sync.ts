/** Pure helpers that turn a cognitive motor into the files kept in the official WLC.IA repository. */
export const MOTORS_DIR = "knowledge/motors";

export type SyncMotor = { name: string; slug: string; description: string | null };
export type SyncKnowledge = { title: string; content: string; category: string | null; kind: string | null; keywords: string[] | null; validation: string | null };

export function motorDir(slug: string): string {
  const safe = slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "motor";
  return `${MOTORS_DIR}/${safe}`;
}

export function renderMotorJson(m: SyncMotor, items: SyncKnowledge[]): string {
  return JSON.stringify({ name: m.name, slug: m.slug, description: m.description, knowledge: items.map((k) => ({ title: k.title, kind: k.kind, category: k.category, keywords: k.keywords ?? [], validation: k.validation, content: k.content })) }, null, 2) + "\n";
}

export function renderMotorReadme(m: SyncMotor, items: SyncKnowledge[]): string {
  const lines = [`# Motor: ${m.name}`, "", m.description ?? "", "", `Conhecimentos: ${items.length}`, "", "Arquivo gerado automaticamente pela WLC.IA (memória eterna).", ""];
  for (const k of items) lines.push(`## ${k.title}`, "", `_${k.kind ?? "conhecimento"} · ${k.category ?? "geral"}_`, "", k.content.trim(), "");
  return lines.join("\n");
}

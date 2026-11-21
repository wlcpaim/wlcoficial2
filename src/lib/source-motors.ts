// Motors saved as files under knowledge/motors/<slug>/motor.json are discovered automatically at build time,
// so every motor committed to the repo is known to the chat and re-seeded after a remix, with no manual list.
import type { KnowledgeEntry } from "./wlc-knowledge-base";

type MotorFile = { name?: string; slug?: string; description?: string | null; knowledge?: { title?: string; kind?: string; category?: string; keywords?: string[]; content?: string }[] };
export type SourceMotor = { slug: string; name: string; description: string; rules: string[]; concepts: KnowledgeEntry[] };

export function parseMotorFile(file: MotorFile, fallbackSlug: string): SourceMotor | null {
  const slug = (file.slug || fallbackSlug || "").trim();
  if (!slug || !Array.isArray(file.knowledge)) return null;
  const items = file.knowledge.filter((k) => k?.title && k?.content);
  return {
    slug, name: file.name || slug, description: file.description || "",
    rules: items.filter((k) => k.kind === "rule").map((k) => `${k.title}: ${k.content}`.slice(0, 300)),
    concepts: items.map((k, i) => ({ id: `${slug}-${i}`, domain: k.category || "geral", title: k.title!, keywords: k.keywords ?? [], content: k.content! })),
  };
}

const files = import.meta.glob("/knowledge/motors/*/motor.json", { eager: true, import: "default" }) as Record<string, MotorFile>;
export const SOURCE_MOTORS: SourceMotor[] = Object.entries(files)
  .map(([p, f]) => parseMotorFile(f, p.split("/").slice(-2, -1)[0] ?? ""))
  .filter((m): m is SourceMotor => !!m);

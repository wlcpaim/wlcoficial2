// Writes the official catalog to knowledge/official/<slug>/ so it travels with the source code.
import { mkdirSync, writeFileSync } from "node:fs";
import { OFFICIAL_MOTORS, OFFICIAL_CATALOG_VERSION } from "../src/lib/cognitive-official-catalog";
for (const m of OFFICIAL_MOTORS) {
  const dir = `knowledge/official/${m.slug}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/motor.json`, JSON.stringify({ version: OFFICIAL_CATALOG_VERSION, slug: m.slug, name: m.name, description: m.description, rules: m.rules, concepts: m.concepts.map((c) => c.id) }, null, 2) + "\n");
  writeFileSync(`${dir}/README.md`, `# ${m.name}\n\n${m.description}\n\n## Regras\n${m.rules.map((r) => `- ${r}`).join("\n")}\n\n## Conceitos\n${m.concepts.map((c) => `### ${c.title}\n${c.content}`).join("\n\n")}\n`);
}
console.log("ok", OFFICIAL_MOTORS.length);

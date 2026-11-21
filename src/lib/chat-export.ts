/** Builds full, uncompressed chat transcripts (messages + every operation + every agent event). */
export type ExportMsg = { role: string; content: string; created_at?: string; metadata?: any };
export type ExportEvent = { id: number | string; event_type: string; status: string; title: string; detail: any; created_at: string };
export type ChatExport = { chat: { id: string; title: string; repo?: string | null }; messages: ExportMsg[]; events: ExportEvent[] };

const who = (r: string) => (r === "user" ? "VOCÊ" : r === "system" ? "SISTEMA" : "WLC.IA");

export function toTxt(d: ChatExport): string {
  const out: string[] = [`CHAT: ${d.chat.title}`, `Repositório: ${d.chat.repo ?? "-"}`, `Exportado em: ${new Date().toISOString()}`, "=".repeat(60), ""];
  for (const m of d.messages) {
    out.push(`[${m.created_at ?? ""}] ${who(m.role)}:`, m.content, "");
    for (const t of m.metadata?.tool_log ?? []) out.push(`  ${t.ok ? "✔" : "✘"} ${t.tool} — ${t.summary ?? ""}${t.commit_sha ? ` (commit ${t.commit_sha})` : ""}`);
    if (m.metadata?.completion) out.push("  Relatório: " + JSON.stringify(m.metadata.completion, null, 2).replace(/\n/g, "\n  "));
    out.push("-".repeat(60), "");
  }
  out.push("", "REGISTRO COMPLETO DE EVENTOS", "=".repeat(60));
  for (const e of [...d.events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    out.push(`[${e.created_at}] ${e.event_type}/${e.status}: ${e.title}`);
    if (e.detail) {
      const { content, ...rest } = e.detail;
      if (Object.keys(rest).length) out.push("  " + JSON.stringify(rest, null, 2).replace(/\n/g, "\n  "));
      if (typeof content === "string") out.push("  --- código ---", content, "  --- fim ---");
    }
  }
  return out.join("\n");
}

export function toMarkdown(d: ChatExport): string {
  const out: string[] = [`# ${d.chat.title}`, "", `Repositório: \`${d.chat.repo ?? "-"}\``, ""];
  for (const m of d.messages) {
    out.push(`## ${who(m.role)} · ${m.created_at ?? ""}`, "", m.content, "");
    const tools = m.metadata?.tool_log ?? [];
    if (tools.length) { out.push("**Operações:**", ""); for (const t of tools) out.push(`- ${t.ok ? "✅" : "❌"} \`${t.tool}\` — ${t.summary ?? ""}`); out.push(""); }
  }
  out.push("## Registro completo de eventos", "");
  for (const e of [...d.events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    out.push(`- **${e.created_at}** \`${e.event_type}/${e.status}\` ${e.title}`);
    if (typeof e.detail?.content === "string") out.push("", "```", e.detail.content, "```", "");
  }
  return out.join("\n");
}

export const toJson = (d: ChatExport) => JSON.stringify(d, null, 2);

export function safeName(s: string) { return (s || "chat").replace(/[^\w.-]+/g, "-").slice(0, 60); }

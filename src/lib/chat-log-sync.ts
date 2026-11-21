/** Pure helpers for the per-mode chat history files kept in the user's repository. */
export type LogMode = "chat" | "plan" | "build";

export const CHAT_LOG_DIR = "WLC.IA";

export function chatLogPath(mode: LogMode): string {
  const name = mode === "plan" ? "Planejar.md" : mode === "build" ? "Criar.md" : "Chat.md";
  return `${CHAT_LOG_DIR}/${name}`;
}

const TITLES: Record<LogMode, string> = { chat: "Chat", plan: "Planejar", build: "Criar" };

/** Appends one exchange to the existing file content (or starts a new file). */
export function appendExchange(
  existing: string | null,
  e: { mode: LogMode; chatTitle: string; chatId: string; user: string; assistant: string; at: Date },
): string {
  const head = existing && existing.trim() ? existing.replace(/\s+$/, "") : `# WLC.IA — Histórico do modo ${TITLES[e.mode]}\n\nAtualizado automaticamente a cada mensagem.`;
  const when = e.at.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const block = [
    `## ${when} · ${e.chatTitle} (${e.chatId.slice(0, 8)})`,
    "",
    "**Usuário:**",
    "",
    e.user.trim() || "_(vazio)_",
    "",
    "**WLC.IA:**",
    "",
    e.assistant.trim() || "_(sem resposta)_",
  ].join("\n");
  return `${head}\n\n---\n\n${block}\n`;
}

// Turns a finished Criar run into one learned lesson (pure, from the real tool log only), so every project
// teaches the "Evolução Contínua" motor without an extra model call.
export const EVOLUTION_MOTOR = { slug: "evolucao-continua", name: "Evolução Contínua (Projetos)", description: "Aprendizados extraídos automaticamente de cada projeto feito no Modo Criar." };

type Tool = { tool: string; ok: boolean; summary?: string; path?: string; args?: any };

export function extractProjectLesson(input: { chatTitle: string; userMessage: string; toolLog: Tool[]; writtenPaths: string[] }) {
  const paths = [...new Set(input.writtenPaths.filter(Boolean))].sort();
  if (!paths.length) return null;
  const dirs = [...new Set(paths.map((p) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : ".")))].sort();
  const exts = [...new Set(paths.map((p) => p.split(".").pop() || ""))].filter(Boolean);
  const failures = input.toolLog.filter((t) => !t.ok).map((t) => `${t.tool}: ${(t.summary || "").slice(0, 120)}`).slice(0, 5);
  const title = `Projeto: ${(input.chatTitle || input.userMessage).slice(0, 80)}`;
  const content = [
    `Pedido: ${input.userMessage.slice(0, 300)}`,
    `Estrutura de pastas usada: ${dirs.join(", ")}`,
    `Arquivos criados/alterados (${paths.length}): ${paths.slice(0, 40).join(", ")}`,
    `Tipos de arquivo: ${exts.join(", ")}`,
    failures.length ? `Erros enfrentados (evitar no próximo projeto): ${failures.join(" | ")}` : "Execução sem erros de ferramenta.",
  ].join("\n");
  const keywords = [...new Set([...dirs.flatMap((d) => d.split("/")), ...exts])].filter((w) => w && w !== ".").slice(0, 15);
  return { title, content, keywords };
}

export type ChatMode = "chat" | "plan" | "build";
export type ChatAttachment = { name: string; kind: "text" | "image"; mime: string; size: number; content: string };

export const CHAT_MODES: { id: ChatMode; label: string; hint: string }[] = [
  { id: "chat", label: "Chat", hint: "Conversa normal — nunca cria nem altera arquivos" },
  { id: "plan", label: "Planejar", hint: "Analisa e apresenta o plano; só executa o que você aprovar" },
  { id: "build", label: "Criar", hint: "Começa a desenvolver na hora, sem pedir aprovação" },
];

export const MAX_ATTACHMENTS = 6;
export const MAX_TEXT_CHARS = 120_000;
export const MAX_IMAGE_DATAURL = 1_500_000;

/** Instruction injected in the system prompt for the selected composer mode (WLC.IA v3). */
export function modeInstruction(mode: ChatMode | undefined): string {
  if (mode === "chat") {
    return [
      "",
      "## MODO ATUAL: CHAT (consultivo)",
      "Responda como engenheiro sênior: tire dúvidas, explique causa raiz, leia schemas e oriente.",
      "NÃO grave arquivos, NÃO faça commits, NÃO chame propose_plan, NÃO chame patch_file/write_file/delete_file.",
      "Pode usar list_files, read_file, search_codebase, analyze_repository e calculate_expression.",
    ].join("\n");
  }
  if (mode === "plan") {
    return [
      "",
      "## MODO ATUAL: PLANEJAR",
      "Investigue o repositório (somente leitura: list/read/search/analyze) e chame propose_plan com objetivo e 3–8 etapas claras.",
      "NÃO grave arquivos neste modo. Após propose_plan, encerre com uma frase curta — o usuário aprova no botão Criar.",
    ].join("\n");
  }
  if (mode === "build") {
    return [
      "",
      "## MODO ATUAL: CRIAR (execução autônoma + auto-cura)",
      "O usuário já autorizou tudo: execute o pedido completo SEM chamar propose_plan e sem pedir permissão ou confirmação.",
      "Planeje internamente e comece a gravar na hora; só pare quando o resultado completo (site pronto) estiver gravado.",
      "Protocolo: (1) search_codebase/read_file nos pontos certos; (2) prefira patch_file a write_file em arquivos existentes;",
      "(3) após gravações, use run_project_checks ou check_ci quando disponível; (4) se houver erro de compilação/teste, corrija e repita;",
      "(5) só entregue o resumo final com caminhos alterados e status real das validações.",
      "Nunca invente sucesso de build/teste. Sem runner, declare validação pendente com honestidade.",
    ].join("\n");
  }
  return "";
}

/** Text appended to the user's turn so the model sees attached files. */
export function attachmentsForModel(atts: ChatAttachment[] | undefined): string {
  if (!atts?.length) return "";
  return (
    "\n\n" +
    atts
      .map((a) =>
        a.kind === "text"
          ? `### Arquivo anexado: ${a.name}\n\`\`\`\n${a.content.slice(0, MAX_TEXT_CHARS)}\n\`\`\``
          : `### Imagem anexada: ${a.name} (${a.mime}, ${Math.round(a.size / 1024)} KB) — use como referência visual descrita pelo usuário.`,
      )
      .join("\n\n")
  );
}

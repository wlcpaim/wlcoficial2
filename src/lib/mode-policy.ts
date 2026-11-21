// Per-mode policy for the dev chat. Each mode has its own identity, tools and
// flow; the selected mode only changes when the user picks another one.
import type { ChatMode } from "./chat-modes";

export const MODE_STORAGE_KEY = "wlc.chat-mode";
export const DEFAULT_MODE: ChatMode = "chat";
/** An approval only unlocks execution in Planejar for this long after the click. */
export const PLAN_APPROVAL_WINDOW_MS = 15 * 60 * 1000;

export function parseMode(v: unknown): ChatMode {
  return v === "chat" || v === "plan" || v === "build" ? v : DEFAULT_MODE;
}

const READ_ONLY = ["calculate_expression", "analyze_repository", "list_files", "read_file", "search_codebase", "list_commits", "check_ci", "compare_versions"];
const PLAN_TOOLS = [...READ_ONLY, "propose_plan"];
const BUILD_TOOLS = [...READ_ONLY, "write_file", "patch_file", "delete_file", "create_branch", "save_memory", "update_task", "run_project_checks"];

/**
 * Tools the server allows. Planejar only executes the plan the user approved
 * (the approval message arrives with planApproved=true); it never switches mode.
 */
export function allowedTools(mode: ChatMode, planApproved = false): Set<string> {
  if (mode === "chat") return new Set(READ_ONLY);
  if (mode === "plan") return new Set(planApproved ? BUILD_TOOLS : PLAN_TOOLS);
  return new Set(BUILD_TOOLS);
}

export function isApprovalMessage(msg: string | null | undefined): boolean {
  return !!msg && msg.trimStart().startsWith("✅ Aprovado");
}

/** Independent system prompt for each mode. */
export function modeSystemPrompt(mode: ChatMode, planApproved = false): string {
  if (mode === "chat") return `## IDENTIDADE — MODO CHAT (conversa)
Você é a WLC.IA, uma IA profissional sênior. Converse de forma natural, inteligente e direta.
- Respostas breves e objetivas: responda exatamente ao que foi perguntado, sem prolixidade, jargões forçados ou repetir o contexto.
- Perguntas conceituais ou diálogo comum (ex.: "Quem é você?", "Qual o seu conhecimento?"): responda direto, SEM chamar ferramentas (nada de analyze_repository, list_files ou leitura de arquivos).
- Use ferramentas de leitura só quando a pergunta exigir de fato o conteúdo do repositório.
- Não empurre ações, planos ou próximos passos não solicitados; responda e aguarde o usuário.
- Você NÃO cria apps, NÃO grava arquivos, NÃO faz commits e NÃO inicia execuções. Não sugira trocar de modo.
- Use o conhecimento cognitivo aprendido quando relevante.`;
  if (mode === "plan" && planApproved) return `## IDENTIDADE — MODO PLANEJAR (execução do plano aprovado)
O usuário clicou em aprovar o plano. Execute SOMENTE o plano aprovado, por completo, sem pedir nova aprovação. Leia antes de alterar, verifique cada gravação e relate resultados reais. Não invente arquivos, commits ou testes.`;
  if (mode === "plan") return `## IDENTIDADE — MODO PLANEJAR (arquiteto de software)
Você é engenheiro de software e arquiteto de sistemas. NÃO implementa nada antes da aprovação explícita — as ferramentas de gravação nem estão disponíveis.
Antes de propor qualquer coisa, investigue de verdade: leia a árvore e os arquivos relevantes do repositório (rotas, componentes, banco, integrações, configuração) e descreva as mecânicas que o projeto já usa — o plano deve se apoiar no que existe, citando arquivos reais.
Fluxo: 1) receba o pedido; 2) analise objetivo, funcionalidades, requisitos, arquitetura, arquivos, banco, interfaces, integrações, segurança, dependências e riscos (leia o repositório se houver); 3) apresente o plano no texto: o que será feito, como, tecnologias, arquivos/módulos, como as partes se conectam, implementação, testes e validação; 4) revise se cobre todos os requisitos e liste dúvidas reais; 5) chame propose_plan (objetivo + etapas) e termine com "Planejamento concluído. Posso iniciar a criação?".
Se o usuário pedir mudanças, atualize o plano e chame propose_plan de novo.`;
  return `## IDENTIDADE — MODO CRIAR (agente executor)
Você é o agente executor. O usuário já autorizou: comece a desenvolver imediatamente, sem pedir aprovação e sem transformar o pedido em plano para aprovar.
Sequência: interprete; analise o projeto existente; veja o que já existe e o que falta; planeje internamente; implemente; rode as validações disponíveis; corrija; apresente o resultado real.
Preserve o que já funciona. Nunca invente arquivos, commits, testes ou resultados; comunique erros e limitações reais.`;
}

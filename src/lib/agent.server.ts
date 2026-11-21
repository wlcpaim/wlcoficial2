// Development agent runtime: context assembly, tool execution against GitHub,
// key failover with checkpoints, verification-based auditing and resume.
import { appendExchange, chatLogPath } from "./chat-log-sync";
import { allowedTools, isApprovalMessage, modeSystemPrompt, parseMode, PLAN_APPROVAL_WINDOW_MS } from "./mode-policy";
import { modeInstruction, attachmentsForModel, type ChatMode, type ChatAttachment } from "./chat-modes";
import { applyContextualPatch, searchCodebase, suggestedValidationCommands, SELF_HEALING_PROTOCOL } from "./agent-surgical-tools";
import { GENESIS_PROMPT } from "./nexus-genesis";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { decryptSecret, redactSecrets } from "./crypto.server";
import * as GH from "./github.server";
import { AIError, callBuiltin, callGeminiAuto, callVercel, pingGemini, type ChatMsg, type ToolCall, type ToolDef } from "./ai.server";
import { isVercelModel, vercelModelId } from "./models";
import { pickNextKey, normalizeProject, type KeyCandidate } from "./key-rotation";
import { retrieveWlcKnowledge, formatWlcKnowledgeContext } from "./wlc-knowledge-base";
import { buildSpecialistAcademyContext } from "./wlc-specialist-academy";
import { buildEngineeringQualityContext } from "./wlc-engineering-quality-gate";
import { buildWlcDesignContext } from "./wlc-design-intelligence";
import { buildWlcProfessionalEngineeringContext } from "./wlc-professional-engineering";
import { calculateExpression } from "./wlc-math-engine";
import { retrievePhysicsFormulas, formatPhysicsFormulaContext } from "./nexus-physics-knowledge";
import { assessWlcRequest, formatWlcCognitiveContext } from "./wlc-cognitive-engine";
import { assessProRequest, formatProCognitiveContext, summarizeProDecision } from "./wlc-cognitive-orchestrator-pro";
import { formatEngineeringIntelligenceContext, createEngineeringSession } from "./wlc-engineering-intelligence-core";
import { buildWlcIntelligenceFrame, formatWlcIntelligenceContext } from "./wlc-intelligence-core";
import { assessAdvancedCognition, formatAdvancedCognitiveContext } from "./wlc-advanced-cognition";
import { assessSocialConversation, formatSocialCognitionContext } from "./wlc-social-cognition";
import { formatEngineeringContext } from "./wlc-engineering-planner";
import { formatAutonomousEngineeringContext } from "./wlc-autonomous-engineering";
import { formatAutonomousDevelopmentContext } from "./wlc-autonomous-development-core";
import { buildAutonomousIntelligenceContext } from "./wlc-autonomous-intelligence";
import { validateAgentWritePath, validateBranchName } from "./agent-safety";
import { wlcLogger } from "./wlc-logger";
import { presetContextLines } from "./project-presets";
import { buildCompletionReport } from "./completion-report";
import { OperationLedger, enrichFailure, normalizeRepoPath, honestStatus, guardClaims } from "./execution-engine";
import { AGENT_BUSY_MESSAGE, HEARTBEAT_INTERVAL_MS, LOCK_STALE_SECONDS } from "./agent-lock";
import { buildAgentPlan, hashAgentPlan } from "./agent-plan";
import { createAsyncDrainQueue } from "./async-drain-queue";
import { analyzeProject, ANALYZER_FILES } from "./environment/project-analyzer";
// Cognitive Core Evolution 0.13 — Adaptive Knowledge, Creative Engineering, Design DNA, Technology Radar
import { retrieveAdaptiveKnowledge, formatAdaptiveKnowledgeContext } from "./wlc-adaptive-knowledge-engine";
import { generateCreativePlan, formatCreativePlanContext, shouldRunCreativePlanning } from "./wlc-creative-engineering-engine";
import { analyzeCreation, formatCreationBlueprintContext, buildCreationProtocol, isCreationRequest, auditGeneratedFiles, buildAuditSelfReviewPrompt, summarizeAudit, type CreationBlueprint, type AuditReport } from "./wlc-creation-intelligence-v2";
import { generateDesignDNA, formatDesignDNAContext } from "./wlc-design-dna";
import { findTechnologies, formatTechnologyRadarContext, recommendStack } from "./wlc-technology-radar";

/** GitHub rejects a contents PUT with 409/422 when the file SHA is stale or missing. */
export function isShaConflict(e: unknown): boolean {
  const m = String((e as Error)?.message ?? e);
  return /\b(409|422)\b/.test(m) || /sha/i.test(m) && /(supplied|match|conflict)/i.test(m);
}

type DB = SupabaseClient<Database>;
type RepoRow = Database["public"]["Tables"]["repositories"]["Row"];
type ChatRow = Database["public"]["Tables"]["chats"]["Row"];

const MAX_STEPS = 48;
/** Automatic continuation cycles: when a cycle hits MAX_STEPS the run checkpoints and keeps going on its own. */
export const MAX_AUTO_CYCLES = 5;
/** Each server call works at most this long, then saves and lets the chat continue automatically, so no request is cut by a timeout. */
export const SLICE_MS = 40_000;
/** Replies that stop to ask for permission instead of building. */
export const ASKS_PERMISSION = /(posso (prosseguir|continuar|come[cç]ar|criar)|gostaria que eu|deseja que eu|quer que eu|aguardo (sua|a) (aprova|confirma)|confirme)/i;
const CHECKPOINT_INTERVAL = 12;
const IGNORE = /(^|\/)(node_modules|\.git|dist|build|\.next|coverage|vendor)\//;


/** Learned Cognitive Chat knowledge (active, user's global + recent) injected into every dev-chat run. Never fails the run. */
async function loadLearnedKnowledge(db: DB, userId: string, query: string): Promise<string> {
  try {
    const anyDb = db as any;
    const { data: motors } = await anyDb.from("cognitive_motors").select("id").eq("user_id", userId).limit(20);
    const seen = new Set<string>(); const rows: any[] = [];
    const add = (list: any[] | null) => { for (const r of list ?? []) if (r?.id && !seen.has(r.id)) { seen.add(r.id); rows.push(r); } };
    if (query.trim()) for (const m of (motors ?? []).slice(0, 5)) {
      const { data } = await anyDb.rpc("search_cognitive_knowledge", { _motor_id: m.id, _query: query.slice(0, 1000), _include_global: true, _limit: 8 });
      add(data);
    }
    if (rows.length < 4) {
      const { data } = await anyDb.from("cognitive_knowledge").select("id, title, category, content, validation")
        .eq("user_id", userId).eq("status", "active").eq("visibility", "global").order("updated_at", { ascending: false }).limit(8);
      add(data);
    }
    if (!rows.length) return "";
    const lines = rows.slice(0, 12).map((r) => `- [${r.category ?? "geral"}${r.validation ? ` · ${r.validation}` : ""}] ${r.title}: ${String(r.content ?? "").slice(0, 500)}`);
    return `## CONHECIMENTO COGNITIVO APRENDIDO (WLC.IA)\nAplique quando relevante (regras de negócio, conceitos ensinados, aprendizados de documentos). Itens "conflicting"/"hypothesis" não são certezas.\n${lines.join("\n")}\n\n`;
  } catch { return ""; }
}

async function getAdmin() {
  const m = await import("@/integrations/supabase/client.server");
  return m.supabaseAdmin;
}

const j = (v: unknown) => v as Json;

export async function loadGithubToken(userId: string): Promise<{ token: string; connectionId: string } | null> {
  const admin = await getAdmin();
  const { data } = await admin
    .from("api_connections")
    .select("id, secret_ciphertext")
    .eq("user_id", userId)
    .eq("provider", "github")
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { token: await decryptSecret(data.secret_ciphertext), connectionId: data.id };
}

export type GeminiKeyRow = KeyCandidate & { model: string | null; secret_ciphertext: string };

export async function loadGeminiKeys(userId: string): Promise<GeminiKeyRow[]> {
  const admin = await getAdmin();
  const { data, error } = await admin
    .from("api_connections")
    .select("id, name, google_project, is_primary, is_active, status, quota_exceeded_at, created_at, model, secret_ciphertext")
    .eq("user_id", userId)
    .eq("provider", "gemini");
  if (error) throw new Error(error.message);
  return (data ?? []) as GeminiKeyRow[];
}

async function markKey(id: string, patch: Database["public"]["Tables"]["api_connections"]["Update"]) {
  const admin = await getAdmin();
  await admin.from("api_connections").update(patch).eq("id", id);
}

// ---------------------------------------------------------------- context

export type ContextStats = {
  memory: number;
  audits: number;
  pendingTasks: number;
  openCheckpoints: number;
  files: number;
  headSha: string | null;
  repoError: string | null;
};

export async function buildProjectContext(
  db: DB,
  opts: { projectId: string; repo: RepoRow | null; branch: string | null; token: string | null },
) {
  const [project, memory, audits, tasks, checkpoints, changes] = await Promise.all([
    db.from("projects").select("name, description, context_summary, preset").eq("id", opts.projectId).single(),
    db.from("project_memory").select("kind, title, content, created_at").eq("project_id", opts.projectId).order("created_at", { ascending: false }).limit(25),
    db.from("audit_logs").select("operation, file_path, status, result, commit_sha, created_at").eq("project_id", opts.projectId).order("created_at", { ascending: false }).limit(12),
    db.from("development_tasks").select("id, title, status, description").eq("project_id", opts.projectId).in("status", ["pending", "in_progress", "awaiting_approval", "failed"]).order("created_at").limit(30),
    db.from("checkpoints").select("id, reason, last_operation, created_at").eq("project_id", opts.projectId).eq("status", "open").order("created_at", { ascending: false }).limit(5),
    db.from("file_changes").select("file_path, change_type, commit_sha, created_at").eq("project_id", opts.projectId).order("created_at", { ascending: false }).limit(20),
  ]);

  let headSha: string | null = null;
  let tree: GH.TreeItem[] = [];
  let truncated = false;
  let repoError: string | null = null;
  if (opts.repo && opts.token) {
    try {
      headSha = await GH.getBranchHead(opts.token, opts.repo.full_name, opts.branch ?? opts.repo.default_branch);
      const t = await GH.getTree(opts.token, opts.repo.full_name, headSha);
      tree = t.items;
      truncated = t.truncated;
    } catch (e) {
      repoError = (e as Error).message;
    }
  } else if (opts.repo && !opts.token) {
    repoError = "GitHub não conectado";
  }

  const p = project.data;
  const files = tree.filter((t) => t.type === "blob" && !IGNORE.test(t.path));
  const lines: string[] = [];
  lines.push(`# Projeto: ${p?.name ?? "?"}`);
  if (p?.description) lines.push(p.description);
  lines.push(...presetContextLines(p?.preset));
  if (p?.context_summary) lines.push(`\n## Resumo de contexto\n${p.context_summary}`);
  if (memory.data?.length) {
    lines.push("\n## Memória permanente (mais recente primeiro)");
    for (const m of memory.data) lines.push(`- [${m.kind}] ${m.title}: ${m.content.slice(0, 500)}`);
  }
  if (tasks.data?.length) {
    lines.push("\n## Tarefas abertas");
    for (const t of tasks.data) lines.push(`- (${t.status}) ${t.title} [id ${t.id}]`);
  }
  if (audits.data?.length) {
    lines.push("\n## Auditorias recentes");
    for (const a of audits.data)
      lines.push(`- ${a.status.toUpperCase()} ${a.operation} ${a.file_path ?? ""} ${a.commit_sha ? a.commit_sha.slice(0, 7) : ""} ${a.result ?? ""}`.trim());
  }
  if (changes.data?.length) {
    lines.push("\n## Alterações recentes de arquivos");
    for (const c of changes.data) lines.push(`- ${c.change_type} ${c.file_path} ${c.commit_sha?.slice(0, 7) ?? ""}`);
  }
  if (checkpoints.data?.length) {
    lines.push("\n## Checkpoints abertos");
    for (const c of checkpoints.data) lines.push(`- ${c.reason} em ${c.created_at}: ${c.last_operation ?? "-"}`);
  }
  if (opts.repo) {
    lines.push(`\n## Repositório GitHub: ${opts.repo.full_name} (branch ${opts.branch ?? opts.repo.default_branch})`);
    if (repoError) lines.push(`Erro ao ler o repositório: ${repoError}`);
    else {
      lines.push(`HEAD atual: ${headSha}. ${files.length} arquivos${truncated ? " (lista truncada pelo GitHub)" : ""}.`);
      lines.push(files.slice(0, 400).map((f) => f.path).join("\n"));
      if (files.length > 400) lines.push(`... e mais ${files.length - 400} arquivos (use list_files com prefixo).`);
    }
  } else {
    lines.push("\n## Nenhum repositório vinculado a este chat.");
  }

  const stats: ContextStats = {
    memory: memory.data?.length ?? 0,
    audits: audits.data?.length ?? 0,
    pendingTasks: tasks.data?.length ?? 0,
    openCheckpoints: checkpoints.data?.length ?? 0,
    files: files.length,
    headSha,
    repoError,
  };
  return { text: lines.join("\n"), stats, headSha, tree };
}

// ---------------------------------------------------------------- tools

function toolsForMode(mode: ChatMode, planApproved = false): ToolDef[] {
  const allowed = allowedTools(mode, planApproved);
  return TOOLS.filter((t) => allowed.has(t.function.name));
}

const TOOLS: ToolDef[] = [
  { type: "function", function: { name: "calculate_expression", description: "Calculadora determinística para expressões aritméticas. Use para verificar contas, porcentagens, potências, raízes e funções trigonométricas (radianos). Aceita + - * / % ^, parênteses, pi, e, sqrt, sin, cos, tan, abs, log, ln, exp, floor, ceil, round. Não aceita texto ou unidades; converta unidades separadamente e explique o procedimento.", parameters: { type: "object", properties: { expression: { type: "string", description: "Expressão numérica, por exemplo (125*3.6)/9 ou sqrt(144)+2^3" } }, required: ["expression"] } } },
  { type: "function", function: { name: "analyze_repository", description: "Análise técnica estruturada do repositório: linguagens, gerenciador de pacotes (respeita lockfile), comandos de instalação/build/teste, frameworks, bancos, migrations, variáveis de ambiente e avisos. Use ANTES de planejar ou alterar arquivos.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "list_files", description: "Lista arquivos do repositório (opcionalmente filtrando por prefixo de caminho).", parameters: { type: "object", properties: { prefix: { type: "string" } } } } },
  { type: "function", function: { name: "read_file", description: "Lê o conteúdo atual de um arquivo no branch do chat. Obrigatório antes de modificar um arquivo existente.", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
  { type: "function", function: { name: "write_file", description: "Cria ou substitui um arquivo inteiro e faz commit no branch do chat. Retorna commit e verificação real do conteúdo gravado.", parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string", description: "Conteúdo completo do arquivo" }, commit_message: { type: "string" } }, required: ["path", "content", "commit_message"] } } },
  { type: "function", function: { name: "delete_file", description: "Solicita remoção de um arquivo. Exige aprovação do usuário; não remove imediatamente.", parameters: { type: "object", properties: { path: { type: "string" }, reason: { type: "string" } }, required: ["path", "reason"] } } },
  { type: "function", function: { name: "list_commits", description: "Lista os commits mais recentes do branch.", parameters: { type: "object", properties: { limit: { type: "number" } } } } },
  { type: "function", function: { name: "check_ci", description: "Consulta resultados reais de CI (GitHub Actions/status) de um commit.", parameters: { type: "object", properties: { sha: { type: "string" } }, required: ["sha"] } } },
  { type: "function", function: { name: "compare_versions", description: "Diferenças entre duas referências (branch, tag ou sha).", parameters: { type: "object", properties: { base: { type: "string" }, head: { type: "string" } }, required: ["base", "head"] } } },
  { type: "function", function: { name: "create_branch", description: "Cria um branch a partir do HEAD atual. switch_to=true passa a gravar nele.", parameters: { type: "object", properties: { name: { type: "string" }, switch_to: { type: "boolean" } }, required: ["name"] } } },
  { type: "function", function: { name: "save_memory", description: "Salva uma decisão técnica, contexto, erro ou correção na memória permanente do projeto.", parameters: { type: "object", properties: { kind: { type: "string", enum: ["decision", "context", "file_note", "error", "fix"] }, title: { type: "string" }, content: { type: "string" } }, required: ["kind", "title", "content"] } } },
  { type: "function", function: { name: "propose_plan", description: "Pede a aprovação do usuário com um cartão e o botão Criar. Use ANTES de criar um site, novas telas, refatorações amplas ou várias gravações. Depois de chamar, não grave nada e encerre com uma frase curta.", parameters: { type: "object", properties: { goal: { type: "string", description: "Objetivo em linguagem simples (o que será criado/alterado)" }, steps: { type: "array", items: { type: "string" }, description: "3 a 8 etapas curtas em linguagem simples" } }, required: ["goal", "steps"] } } },
  { type: "function", function: { name: "search_codebase", description: "Busca regex ou texto em arquivos do repositório (símbolos, rotas, APIs). Use antes de editar código desconhecido. Retorna path, linha e trecho.", parameters: { type: "object", properties: { pattern: { type: "string", description: "Regex ou texto literal" }, path_prefix: { type: "string", description: "Opcional: limitar a pastas (ex: src/)" }, case_insensitive: { type: "boolean" } }, required: ["pattern"] } } },
  { type: "function", function: { name: "patch_file", description: "Altera trechos específicos de um arquivo existente (old_text → new_text) e faz commit. Prefira a write_file para edições cirúrgicas. Exige read_file prévio. old_text deve ser único no arquivo.", parameters: { type: "object", properties: { path: { type: "string" }, hunks: { type: "array", items: { type: "object", properties: { old_text: { type: "string" }, new_text: { type: "string" } }, required: ["old_text", "new_text"] }, description: "Lista de substituições na ordem" }, commit_message: { type: "string" } }, required: ["path", "hunks", "commit_message"] } } },
  { type: "function", function: { name: "run_project_checks", description: "Executa validação do projeto no sandbox/runner quando configurado (install, tsc --noEmit, test) ou consulta CI. Nunca inventa resultado: se o runner não estiver configurado, retorna pending com comandos sugeridos.", parameters: { type: "object", properties: { suite: { type: "string", enum: ["typecheck", "test", "ci", "all"], description: "Tipo de verificação" } }, required: ["suite"] } } },
  { type: "function", function: { name: "update_task", description: "Cria ou atualiza uma tarefa do projeto. Informe task_id para atualizar.", parameters: { type: "object", properties: { task_id: { type: "string" }, title: { type: "string" }, description: { type: "string" }, status: { type: "string", enum: ["pending", "in_progress", "done", "failed", "cancelled"] } }, required: ["title", "status"] } } },
];

export type ToolLogEntry = {
  tool: string;
  ok: boolean;
  summary: string;
  path?: string;
  commit_sha?: string;
  commit_url?: string;
  verified?: boolean;
};

export type ModifiedFile = { path: string; change_type: "create" | "update" | "delete"; blob_sha: string | null; commit_sha: string };

class PausedError extends Error {
  checkpointId: string | null;
  constructor(message: string, checkpointId: string | null) {
    super(message);
    this.checkpointId = checkpointId;
  }
}

function systemPrompt(context: string, resumeNote?: string, nexusWorkflow?: string, knowledgeContext?: string, developmentMode = false, cognitiveContext?: string, modePrompt = "") {
  const writesAllowed = !/MODO CHAT|MODO PLANEJAR \(arquiteto/.test(modePrompt);
  const nexusInstructions = nexusWorkflow ? `\n\n## WLC.IA — INTELIGÊNCIA CENTRAL\nVocê é WLC.IA, a inteligência integrada de desenvolvimento. Use o pedido atual, contexto e ferramentas reais para decidir internamente a abordagem: compreender e analisar, investigar e depurar, planejar arquitetura, revisar segurança, ou implementar quando o usuário solicitar explicitamente. Essas capacidades são internas e não devem ser apresentadas como opções ou workflows ao usuário.\n- Em repositórios vinculados, chame analyze_repository no início de qualquer tarefa de código antes de planejar.\n- Leia os arquivos relevantes antes de concluir ou alterar.\n- Para pedidos de implementação, faça alterações pequenas e coerentes, verifique cada gravação e informe os caminhos modificados.\n- Para análises e revisões, apresente evidências e não altere arquivos sem pedido explícito.\n- Priorize segurança, compatibilidade e prevenção de regressões.\n- Explique limites com honestidade: não execute código neste ambiente, salvo evidências de CI. Não invente resultados.` : "";
  return `Você é WLC.IA, uma inteligência conversacional e agente capaz de compreender pedidos, responder com conhecimento geral, analisar, planejar, pesquisar quando ferramentas disponíveis, executar ações permitidas e avaliar resultados. Sua base inicial inclui matemática, Física introdutória e desenvolvimento web. Use a ferramenta calculate_expression para validar contas numéricas quando disponível; explique fórmulas, unidades e etapas, e não invente resultados de cálculo. Você está integrada ao Studio e, quando houver repositório vinculado, também pode trabalhar nele usando ferramentas reais.

${cognitiveContext ? `${cognitiveContext}\n\n` : ""}${SELF_HEALING_PROTOCOL}

${modePrompt}

## Regras gerais
- Se uma gravação falhar (conflito de versão, 409/422, "sha"), NUNCA use delete_file para "recriar" o arquivo: leia o arquivo de novo com read_file e sobrescreva com write_file ou aplique patch_file.
- Em sistemas completos (PDV, gestão, painéis, apps mobile), entregue a solução de ponta a ponta e funcional — telas responsivas, cadastro, fluxo principal, persistência e relatórios — em vez de esqueletos ou placeholders.
- Durante a execução, comunique progresso em etapas curtas e concretas: o que está sendo inspecionado, operação realizada, resultado e próxima etapa. Não invente atividade em tempo real; relate somente operações confirmadas pelas ferramentas.
- Ao concluir, entregue relatório com arquivos alterados, commits, validações executadas, resultados, limitações e pendências.

## Núcleo cognitivo e comportamento
- Determine a intenção e o contexto da mensagem. Não force um workflow: responder, esclarecer, analisar, planejar, pesquisar, agir, avaliar ou replanejar são decisões contextuais.
- Para pedidos simples, responda diretamente; para tarefas complexas, decomponha em etapas úteis e escolha a próxima ação pelo resultado observado.
- Use ferramentas somente quando agregarem valor. Leia resultados, trate erros e nunca alegue ação, acesso, teste ou sucesso sem evidência.
- Mantenha contexto conversacional; evite pedir novamente informações já disponíveis. Pergunte apenas quando a informação ausente for essencial.
- Use conhecimento recuperado como referência, não como autoridade infalível. Para matemática e Física, exponha os dados, fórmula, substituição, unidade e verificação final de forma pedagógica; para pedidos de desenvolvimento de sites, considere estrutura, UX, responsividade, acessibilidade, SEO, segurança e testes. Se houver conflito, prefira evidências específicas e atuais, explique incerteza e verifique quando possível.
- Você pode fornecer uma síntese breve de abordagem e conclusão, mas não revele cadeia de pensamento privada.
- Se não souber ou não tiver capacidade/ferramenta, admita com clareza; não invente. A capacidade ainda não disponível pode ser descrita como em desenvolvimento.
- Respeite escopo e permissões; peça aprovação para ações destrutivas ou de alto impacto.

${developmentMode && writesAllowed ? `
## Modo de desenvolvimento — padrão de engenharia profissional
- Atue como engenheiro de software sênior full-stack: descubra requisitos, arquitetura existente, convenções, dependências e limites antes de propor mudanças.
- Para tarefas complexas, crie plano curto com entregáveis e critérios de aceite; implemente uma solução ponta a ponta, não apenas snippets, placeholders ou telas sem funcionalidade.
- Leia arquivos relevantes antes de alterar; preserve compatibilidade, dados, APIs e estilos existentes. Faça mudanças pequenas, coerentes e focadas.
- HTML: semântica, acessibilidade e SEO; CSS: responsivo/mobile-first, tokens e estados; JS/TS: strict types, validação runtime e tratamento de erros; React: componentes e estado previsíveis.
- Backend/API: contratos, autorização server-side, validação, idempotência, rate limits, logs e erros seguros. Dados: schema, constraints, migrations, índices e transações. Nunca exponha credenciais nem coloque secrets no cliente.
- Scripts: parâmetros validados, dry-run quando destrutivo, logs, limites, timeout, falhas claras e repetibilidade.
- Antes de entregar, revisar diff e imports, checar erros óbvios, acessibilidade, responsividade, estados loading/empty/error, segurança e critérios de aceite. Executar validações disponíveis e registrar resultados reais.
- write_file grava arquivo inteiro e faz commit; confira "verified" no resultado. Este ambiente NÃO executa código local: use check_ci quando CI existir; sem CI, informe honestamente o que não foi executado.
- Nunca declare algo pronto sem evidência. Remoções exigem aprovação (delete_file apenas cria pedido). Registre decisões relevantes com save_memory e tarefas com update_task.
- Sites estáticos são publicados como um único documento: use navegação SPA por hash (#rota) em um index.html; nunca link para outros .html. Todo link e botão deve levar a uma ação real.
- Persistência: nunca pare na metade. Execute TODAS as etapas do plano até o site funcionar; só escreva o resumo final quando tudo estiver gravado.
- Estilo moderno sem build: Tailwind via CDN ou variáveis CSS, Google Fonts via <link>, ícones Lucide/SVG; layout mobile-first que funcione em Desktop e Mobile.
- Dados reais: para pedidos, cadastros, leads e listas use o banco isolado do site (window.wlcDb.collection('nome').create/list), com tratamento de erro e estado de carregamento.
- Para projetos novos, construa passo a passo (design system → navegação → telas → dados persistidos → mobile → revisão de links) e explique cada etapa em linguagem simples.
- Não repita operações concluídas nem sobrescreva alterações externas sem analisar. Responda em português com resumo, arquivos, validações, limitações e commits.
${GENESIS_PROMPT}` : ""}${resumeNote ? `
## RETOMADA DE CHECKPOINT
${resumeNote}
` : ""}${nexusInstructions}${knowledgeContext ? `

## WLC.IA — BASE DE CONHECIMENTO RECUPERADA
Use os conceitos abaixo como contexto relevante para esta solicitação; não os cite como fonte externa nem trate como infalíveis.
${knowledgeContext}` : ""}
${context}`;
}

export type AgentResult = {
  messageId: string | null;
  paused: boolean;
  checkpointId: string | null;
  toolLog: ToolLogEntry[];
  provider: string | null;
  rotations: string[];
};

export async function runAgent(
  db: DB,
  userId: string,
  input: { chatId: string; userMessage: string | null; resumeNote?: string; resumedCheckpointId?: string; mode?: ChatMode; attachments?: ChatAttachment[] },
): Promise<AgentResult> {
  const { data: lockToken, error: lockErr } = await db.rpc("acquire_agent_lock", { _chat_id: input.chatId, _stale_seconds: LOCK_STALE_SECONDS });
  if (lockErr) throw new Error(lockErr.message);
  if (!lockToken) throw new AgentBusyError();
  // The mode comes only from the user's selector; nothing in the message changes it.
  const mode = parseMode(input.mode);
  let planApproved = false;
  if (mode === "plan" && isApprovalMessage(input.userMessage)) {
    const { data: ap } = await db.from("agent_plans").select("approved_at").eq("chat_id", input.chatId).eq("status", "approved").order("approved_at", { ascending: false }).limit(1).maybeSingle();
    planApproved = !!ap?.approved_at && Date.now() - new Date(ap.approved_at).getTime() < PLAN_APPROVAL_WINDOW_MS;
  }
  const permitted = allowedTools(mode, planApproved);

  const startedAt = Date.now();
  let finalStatus = "idle";
  let feedbackSaved = false;
  let projectIdForFeedback: string | null = null;
  // Keep the lock alive during long model/tool calls; if this worker dies, the
  // heartbeat stops and the lock becomes reclaimable after LOCK_STALE_SECONDS.
  const heartbeat = setInterval(() => {
    void db.from("agent_sessions").update({ heartbeat_at: new Date().toISOString() }).eq("chat_id", input.chatId).eq("lock_token", lockToken);
  }, HEARTBEAT_INTERVAL_MS);
  const pendingAgentEvents = createAsyncDrainQueue((error) => {
    wlcLogger.warn("agent-events", "event_queue_drain_failed", { chat_id: input.chatId, error: String(error) });
  });
  try {
    const { data: chat, error: chatErr } = await db.from("chats").select("*").eq("id", input.chatId).single();
    if (chatErr || !chat) throw new Error("Chat não encontrado");
    projectIdForFeedback = chat.project_id;
    const persistAgentEvent = async (eventType: string, status: string, title: string, detail: Record<string, unknown> = {}) => {
      // The request client is user-scoped and agent_events intentionally has no
      // authenticated INSERT policy. Persist from this server-only module with
      // the service-role client; ownership values come from the already-verified
      // chat and authenticated user, never from model/tool arguments.
      try {
        const admin = await getAdmin();
        const result = await admin.from("agent_events").insert({
          user_id: userId,
          project_id: chat.project_id,
          chat_id: chat.id,
          event_type: eventType,
          status,
          title: title.slice(0, 240),
          detail: j(detail),
        });
        if (result.error) throw new Error(result.error.message);
      } catch (error) {
        // Observability must never turn a valid engineering operation into a
        // failed operation, but telemetry loss is always visible in server logs.
        wlcLogger.warn("agent-events", "event_persist_failed", {
          chat_id: chat.id, event_type: eventType, error: (error as Error).message,
        });
      }
    };

    const nexusWorkflow = chat.model?.match(/^(?:nexus-v(?:0\.1|1\.0)|wlc-v1\.0):/) ? (chat.model.split(":")[1] === "auto" ? "analyze" : chat.model.split(":")[1] || "analyze") : null;
    const isNexus = !!nexusWorkflow;
    const repo = chat.repository_id
      ? ((await db.from("repositories").select("*").eq("id", chat.repository_id).single()).data as RepoRow | null)
      : null;
    const gh = repo ? await loadGithubToken(userId) : null;
    let branch = chat.branch ?? repo?.default_branch ?? "main";

    if (input.userMessage) {
      await db.from("chat_messages").insert({ user_id: userId, chat_id: chat.id, role: "user", content: input.userMessage, metadata: j({ mode, attachments: input.attachments ?? [] }) });
    }

    await persistAgentEvent("phase", "running", repo ? `Pedido recebido — lendo o projeto ${repo.full_name}` : "Pedido recebido — preparando o contexto", {});
    const ctx = await buildProjectContext(db, { projectId: chat.project_id, repo, branch, token: gh?.token ?? null });
    const { data: hist } = await db
      .from("chat_messages")
      .select("role, content, metadata, created_at")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: false })
      .limit(30);
    const history: ChatMsg[] = [];
    for (const m of (hist ?? []).reverse()) {
      const meta = (m.metadata ?? {}) as { tool_log?: ToolLogEntry[]; attachments?: ChatAttachment[] };
      if (m.role === "user") history.push({ role: "user", content: m.content + attachmentsForModel(meta.attachments) });
      else if (m.role === "assistant") {
        const ops = meta.tool_log?.length ? `\n\n[Operações executadas: ${meta.tool_log.map((t) => `${t.tool}${t.path ? ` ${t.path}` : ""}${t.ok ? "" : " (falhou)"}`).join("; ")}]` : "";
        history.push({ role: "assistant", content: (m.content || "") + ops });
      }
    }
    if (input.resumeNote && !input.userMessage) {
      history.push({ role: "user", content: "Retome a tarefa pendente conforme a nota de retomada, validando o estado atual antes de qualquer alteração." });
    }

    if (repo) await persistAgentEvent("phase", "completed", `Projeto lido (${ctx.tree.filter((t) => t.type === "blob").length} arquivos)`, { head_sha: ctx.headSha ?? null });
    const state = {
      awaitingApproval: false,
      readShas: new Map<string, string>(),
      toolLog: [] as ToolLogEntry[],
      modified: [] as ModifiedFile[],
      lastCommitSha: ctx.headSha,
      tree: ctx.tree,
      step: 0,
    };

    // ---- providers: Gemini (chave do usuário) em primeiro lugar.
    // Objetivo: não depender da reserva Lovable (402). Se não houver chave Gemini ativa,
    // orientamos o usuário a cadastrar em Configurações em vez de consumir crédito da plataforma.
    const GEMINI_FIRST = true;
    const DISABLE_LOVABLE_FALLBACK = true; // true = não usa reserva embutida (evita 402 silencioso)
    const keys = chat.model === "builtin" && !GEMINI_FIRST ? [] : await loadGeminiKeys(userId);
    const tried = new Set<string>();
    const exhaustedProjects = new Set<string>();
    const rotations: string[] = [];
    const skippedSeen = new Set<string>();
    let builtinUsed = false;
    type Provider = { kind: "gemini"; key: GeminiKeyRow; apiKey: string } | { kind: "builtin" } | { kind: "vercel"; id: string; apiKey: string; model: string };
    let provider: Provider | null = null;
    const providerLabel = () =>
      isNexus
        ? "WLC.IA"
        : provider
          ? provider.kind === "builtin"
            ? "Reserva Lovable (evite — configure Gemini)"
            : provider.kind === "vercel"
              ? `Vercel (${provider.model})`
              : `Gemini "${provider.key.name}"`
          : null;
    // Vercel chosen for this chat: use it first; on failure the Google keys / built-in reserve take over.
    const geminiPreferred = isVercelModel(chat.model) || isNexus ? null : chat.model;
    if (isVercelModel(chat.model) && !isNexus) {
      const admin = await getAdmin();
      const { data: v } = await admin.from("api_connections").select("id, secret_ciphertext").eq("user_id", userId).eq("provider", "vercel").eq("is_active", true).limit(1).maybeSingle();
      if (v) provider = { kind: "vercel", id: v.id, apiKey: await decryptSecret(v.secret_ciphertext), model: vercelModelId(chat.model!) };
      else rotations.push("Vercel não está conectada — usando as chaves do Google");
    }

    const pendingTaskTitles = async () => {
      const { data } = await db.from("development_tasks").select("title, status").eq("project_id", chat.project_id).in("status", ["pending", "in_progress", "awaiting_approval"]);
      return (data ?? []).map((t) => `${t.title} (${t.status})`);
    };

    const saveCheckpoint = async (reason: "quota" | "disconnect" | "error" | "auto" | "session_end", err?: string) => {
      const { data } = await db
        .from("checkpoints")
        .insert({
          user_id: userId,
          project_id: chat.project_id,
          chat_id: chat.id,
          reason,
          last_operation: state.toolLog.at(-1)?.summary ?? "Nenhuma operação concluída ainda",
          state: j({
            user_message: input.userMessage ?? null,
            completed_ops: state.toolLog,
            step: state.step,
            model: chat.model,
            provider: providerLabel(),
            last_commit_sha: state.lastCommitSha,
          }),
          modified_files: j(state.modified),
          pending_tasks: j(await pendingTaskTitles()),
          errors: j(err ? [redactSecrets(err)] : []),
          repo_full_name: repo?.full_name ?? null,
          branch,
          head_sha: state.lastCommitSha,
          api_connection_id: provider?.kind === "gemini" ? provider.key.id : null,
        })
        .select("id")
        .single();
      await db.from("development_logs").insert({
        user_id: userId, project_id: chat.project_id, chat_id: chat.id, level: "warn",
        message: `Checkpoint salvo (${reason})`, details: j({ checkpoint_id: data?.id, error: err ? redactSecrets(err) : null }),
      });
      await persistAgentEvent("checkpoint", "saved", `Checkpoint salvo: ${reason}`, {
        checkpoint_id: data?.id ?? null, step: state.step,
        last_commit_sha: state.lastCommitSha, error: err ? redactSecrets(err) : null,
      });
      return data?.id ?? null;
    };

    const nextProvider = async (switching: boolean): Promise<Provider | null> => {
      for (;;) {
        const { key, skipped } = pickNextKey(keys, tried, exhaustedProjects);
        for (const s of skipped) {
          if (skippedSeen.has(s.id)) continue;
          skippedSeen.add(s.id);
          rotations.push(`Chave "${s.name}" ignorada: ${s.reason}`);
        }
        if (!key) break;
        tried.add(key.id);
        const apiKey = await decryptSecret(key.secret_ciphertext);
        if (switching) {
          const ping = await pingGemini(apiKey, geminiPreferred ?? "auto");
          await markKey(key.id, { last_tested_at: new Date().toISOString(), status: ping.ok ? "ok" : ping.kind === "quota" ? "quota_exceeded" : ping.kind === "invalid" ? "invalid" : "error", last_error: ping.ok ? null : ping.error, ...(ping.ok || ping.kind !== "quota" ? {} : { quota_exceeded_at: new Date().toISOString() }) });
          if (!ping.ok) {
            if (ping.kind === "quota") exhaustedProjects.add(normalizeProject(key.google_project) || `__key_${key.id}`);
            rotations.push(`Chave reserva "${key.name}" testada e indisponível: ${ping.kind}`);
            continue;
          }
          rotations.push(`Alternado para a chave "${key.name}" após teste bem-sucedido`);
        }
        return { kind: "gemini", key, apiKey };
      }
      if (!DISABLE_LOVABLE_FALLBACK && !builtinUsed) {
        builtinUsed = true;
        rotations.push(keys.length ? "Todas as chaves Gemini falharam — tentando reserva Lovable" : "Nenhuma chave Gemini — tentando reserva Lovable");
        return { kind: "builtin" };
      }
      if (DISABLE_LOVABLE_FALLBACK) {
        rotations.push(keys.length
          ? "Todas as chaves Gemini falharam — reserva Lovable desativada (evita 402)"
          : "Nenhuma chave Gemini ativa — reserve Lovable desativada. Configure em Configurações.");
      }
      return null;
    };

    const callModel = async (messages: ChatMsg[]) => {
      const maxAttempts = keys.length + 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (!provider) {
          if (isNexus && !keys.length) {
            // Nexus sem chave: tenta builtin só se fallback habilitado
            provider = DISABLE_LOVABLE_FALLBACK
              ? null
              : ((builtinUsed = true), { kind: "builtin" as const });
          } else if (chat.model === "builtin" && !GEMINI_FIRST) {
            provider = DISABLE_LOVABLE_FALLBACK
              ? null
              : ((builtinUsed = true), { kind: "builtin" as const });
          } else {
            provider = await nextProvider(attempt > 0);
          }
          if (!provider) {
            const cp = await saveCheckpoint("quota", "Nenhuma chave Gemini configurada");
            throw new PausedError(
              keys.length === 0
                ? "Nenhuma chave do Google Gemini ativa. Abra Configurações, adicione uma chave gratuita do Google AI Studio (aistudio.google.com/app/apikey) e tente de novo. Checkpoint salvo."
                : "Nenhuma chave de IA disponível no momento. Checkpoint salvo.",
              cp,
            );
          }
        }
        try {
          const activeTools = toolsForMode(mode, planApproved);
          const r = provider.kind === "gemini" ? await callGeminiAuto(provider.apiKey, geminiPreferred, messages, activeTools) : provider.kind === "vercel" ? await callVercel(provider.apiKey, provider.model, messages, activeTools) : await callBuiltin(messages, activeTools);
          if (provider.kind === "gemini" && provider.key.status !== "ok") {
            await markKey(provider.key.id, { status: "ok", last_error: null });
            provider.key.status = "ok";
          }
          return r.message;
        } catch (e) {
          if (provider && provider.kind === "vercel" && e instanceof AIError && e.kind !== "network") {
            await markKey(provider.id, { status: "error", last_error: e.message });
            rotations.push(`Vercel falhou (${e.message.slice(0, 120)}) — passando para as chaves do Google`);
            provider = await nextProvider(true);
            if (!provider) { const cp = await saveCheckpoint("error", e.message); throw new PausedError(e.message, cp); }
            continue;
          }
          if (!(e instanceof AIError)) throw e;
          if (provider.kind === "gemini" && (e.kind === "quota" || e.kind === "invalid")) {
            const k = provider.key;
            if (e.kind === "quota") {
              exhaustedProjects.add(normalizeProject(k.google_project) || `__key_${k.id}`);
              await markKey(k.id, { status: "quota_exceeded", quota_exceeded_at: new Date().toISOString(), last_error: e.message });
              rotations.push(`Cota real esgotada na chave "${k.name}" (HTTP ${e.status})`);
            } else {
              await markKey(k.id, { status: "invalid", last_error: e.message });
              rotations.push(`Chave "${k.name}" rejeitada pelo Google (inválida ou sem permissão)`);
            }
            const cp = await saveCheckpoint(e.kind === "quota" ? "quota" : "error", e.message);
            provider = await nextProvider(true);
            if (!provider) throw new PausedError("Todas as chaves e a reserva estão indisponíveis.", cp);
            if (cp) {
              await db.from("checkpoints").update({ status: "resumed", resumed_at: new Date().toISOString(), state: j({ user_message: input.userMessage, completed_ops: state.toolLog, resumed_with: providerLabel(), auto: true }) }).eq("id", cp);
            }
            continue;
          }
          if (provider.kind === "gemini" && e.kind === "busy") {
            await markKey(provider.key.id, { last_error: e.message });
            rotations.push(`Google sobrecarregado na chave "${provider.key.name}" (HTTP ${e.status}) — tentando a próxima opção`);
            provider = await nextProvider(true);
            if (!provider) {
              const cp = await saveCheckpoint("error", e.message);
              throw new PausedError("O Google está sobrecarregado e não há outra opção disponível agora.", cp);
            }
            continue;
          }
          if (provider.kind === "gemini" && e.kind === "model") {
            await markKey(provider.key.id, { last_error: e.message });
            rotations.push(`Nenhum modelo disponível na chave "${provider.key.name}" — tentando a próxima opção`);
            provider = await nextProvider(true);
            if (!provider) { const cp = await saveCheckpoint("error", e.message); throw new PausedError(e.message, cp); }
            continue;
          }
          if (e.kind === "network") {
            const cp = await saveCheckpoint("disconnect", e.message);
            throw new PausedError("Conexão com a IA interrompida.", cp);
          }
          const cp = await saveCheckpoint(provider.kind === "builtin" || e.kind === "credits" ? "quota" : "error", e.message);
          throw new PausedError(
            provider.kind === "builtin" || e.kind === "credits"
              ? (e.message.includes("402") || e.kind === "credits"
                  ? e.message
                  : `Motor WLC.IA indisponível (HTTP ${e.status}). Checkpoint salvo.`)
              : e.message,
            cp,
          );
        }
      }
      const cp = await saveCheckpoint("quota", "Tentativas esgotadas");
      throw new PausedError("Limite de tentativas de alternância atingido.", cp);
    };

    // ---- tool execution
    const needRepo = () => {
      if (!repo) return "Nenhum repositório GitHub vinculado a este chat.";
      if (!gh) return "GitHub não conectado nas Configurações.";
      return null;
    };
    const log = (e: ToolLogEntry) => {
      state.toolLog.push(e);
      // Keep tool execution independent from telemetry latency; drain before exit.
      pendingAgentEvents.track(persistAgentEvent("tool", e.ok ? "completed" : "failed", e.summary, {
        tool: e.tool, path: e.path ?? null, commit_sha: e.commit_sha ?? null,
        verified: e.verified ?? null,
      }));
      return e;
    };

    const ledger = new OperationLedger();
    const execToolRaw = async (tc: ToolCall): Promise<string> => {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        return JSON.stringify({ error: "Argumentos inválidos (JSON)" });
      }
      if (typeof args.path === "string") args.path = normalizeRepoPath(args.path);
      const name = tc.function.name;
      if (name === "write_file" && typeof args.path === "string") {
        await persistAgentEvent("tool_start", "running", `Gravando ${args.path}`, { tool: name, path: args.path, content: typeof args.content === "string" ? args.content.slice(0, 60000) : null });
      }
      if (!permitted.has(name)) {
        log({ tool: name, ok: false, summary: `Bloqueado pelo modo ${mode}` });
        return JSON.stringify({ error: `Ferramenta ${name} não é permitida no modo atual (${mode}). O modo só muda quando o usuário seleciona outro.` });
      }
      try {
        switch (name) {
          case "calculate_expression": {
            const expression = String(args.expression ?? "");
            const result = calculateExpression(expression);
            log({ tool: name, ok: true, summary: `Calculou ${expression} = ${result.formatted}` });
            return JSON.stringify({ ...result, note: "Trigonometria usa radianos. A calculadora verifica expressão numérica, não substitui análise de unidades ou modelo físico." });
          }
          case "analyze_repository": {
            const err = needRepo();
            if (err) return JSON.stringify({ error: err });
            const paths = state.tree.filter((t) => t.type === "blob" && !IGNORE.test(t.path)).map((t) => t.path);
            const files: Record<string, string | undefined> = {};
            await Promise.all(ANALYZER_FILES.filter((f) => paths.includes(f)).map(async (f) => {
              const got = await GH.getFile(gh!.token, repo!.full_name, f, branch);
              if (got) files[f] = got.content;
            }));
            const profile = analyzeProject({ paths, files });
            log({ tool: name, ok: true, summary: `Analisou o repositório (${paths.length} arquivos)` });
            return JSON.stringify({ profile, files_read: Object.keys(files), note: "Análise estática; nada foi executado." });
          }
          case "list_files": {
            const err = needRepo();
            if (err) return JSON.stringify({ error: err });
            const prefix = String(args.prefix ?? "");
            const files = state.tree.filter((t) => t.type === "blob" && t.path.startsWith(prefix) && !IGNORE.test(t.path)).map((t) => t.path);
            log({ tool: name, ok: true, summary: `Listou ${files.length} arquivos${prefix ? ` em ${prefix}` : ""}` });
            return JSON.stringify({ files: files.slice(0, 500), total: files.length });
          }
          case "read_file": {
            const err = needRepo();
            if (err) return JSON.stringify({ error: err });
            const path = String(args.path);
            const f = await GH.getFile(gh!.token, repo!.full_name, path, branch);
            if (!f) {
              log({ tool: name, ok: false, summary: `Arquivo inexistente: ${path}`, path });
              return JSON.stringify({ error: "Arquivo não existe", path });
            }
            state.readShas.set(path, f.sha);
            log({ tool: name, ok: true, summary: `Leu ${path}`, path });
            return JSON.stringify({ path, sha: f.sha, size: f.size, content: f.content.length > 60000 ? f.content.slice(0, 60000) + "\n...[truncado]" : f.content });
          }
          
          case "search_codebase": {
            const err = needRepo();
            if (err) return JSON.stringify({ error: err });
            const pattern = String(args.pattern ?? "").trim();
            if (!pattern) return JSON.stringify({ error: "pattern obrigatório" });
            const prefix = String(args.path_prefix ?? "").replace(/^\/+/, "");
            const paths = state.tree
              .filter((t) => t.type === "blob" && (!prefix || t.path.startsWith(prefix)))
              .map((t) => t.path)
              .slice(0, 80);
            const files: Record<string, string> = {};
            for (const p of paths) {
              try {
                const f = await GH.getFile(gh!.token, repo!.full_name, p, branch);
                if (f?.content != null) files[p] = f.content;
              } catch { /* skip unreadable */ }
            }
            const result = searchCodebase(files, pattern, {
              caseInsensitive: args.case_insensitive !== false,
              maxHits: 40,
              maxPerFile: 8,
            });
            log({ tool: name, ok: true, summary: `${result.hits.length} hit(s) para /${pattern}/ em ${result.fileCount} arquivo(s)` });
            return JSON.stringify(result);
          }
          case "patch_file": {
            const err = needRepo();
            if (err) return JSON.stringify({ error: err });
            if (!repo!.is_authorized) return JSON.stringify({ error: "Escrita bloqueada para este repositório. Habilite 'Agente pode escrever' em Repositórios antes de solicitar alterações." });
            const checkedPath = validateAgentWritePath(String(args.path ?? ""));
            if (checkedPath.error || !checkedPath.path) return JSON.stringify({ error: checkedPath.error ?? "Caminho inválido." });
            const path = checkedPath.path;
            const hunks = Array.isArray(args.hunks) ? args.hunks.map((h: { old_text?: string; new_text?: string }) => ({ old_text: String(h?.old_text ?? ""), new_text: String(h?.new_text ?? "") })) : [];
            if (!hunks.length) return JSON.stringify({ error: "hunks obrigatório" });
            const message = String(args.commit_message || `Patch ${path}`).slice(0, 200);
            const current = await GH.getFile(gh!.token, repo!.full_name, path, branch);
            if (!current) return JSON.stringify({ error: "Arquivo inexistente. Use write_file para criar arquivos novos." });
            const read = state.readShas.get(path);
            if (!read) return JSON.stringify({ error: "Leia o arquivo com read_file antes de aplicar patch_file." });
            if (read !== current.sha) return JSON.stringify({ error: "O arquivo foi alterado externamente desde a sua leitura. Leia novamente." });
            const patched = applyContextualPatch(current.content, hunks);
            if (!patched.ok) return JSON.stringify({ error: patched.error });
            if (patched.content === current.content) {
              log({ tool: name, ok: true, summary: `Sem alterações em ${path}`, path });
              return JSON.stringify({ ok: true, unchanged: true });
            }
            if (patched.content.length > 1_000_000) return JSON.stringify({ error: "Arquivo resultante excede 1 MB." });
            let res: Awaited<ReturnType<typeof GH.putFile>>;
            try {
              res = await GH.putFile(gh!.token, repo!.full_name, { path, content: patched.content, message, branch, sha: current.sha });
            } catch (e) {
              if (!isShaConflict(e)) throw e;
              const fresh = await GH.getFile(gh!.token, repo!.full_name, path, branch);
              res = await GH.putFile(gh!.token, repo!.full_name, { path, content: patched.content, message, branch, sha: fresh?.sha });
            }
            const verify = await GH.getFile(gh!.token, repo!.full_name, path, res.commitSha);
            const verified = !!verify && verify.content === patched.content && verify.sha === res.blobSha;
            state.readShas.set(path, res.blobSha);
            state.lastCommitSha = res.commitSha;
            state.modified.push({ path, change_type: "update", blob_sha: res.blobSha, commit_sha: res.commitSha });
            await db.from("file_changes").insert({
                user_id: userId, project_id: chat.project_id, chat_id: chat.id, repository_id: repo!.id, file_path: path,
                change_type: "update", commit_sha: res.commitSha, previous_sha: current.sha, new_sha: res.blobSha,
                diff_summary: `${message} (patch ${patched.replacements} hunk(s))`,
              });
            log({ tool: name, ok: verified, summary: `Patch em ${path} (${patched.replacements} hunk(s))`, path, commit_sha: res.commitSha, verified });
            return JSON.stringify({ ok: true, path, replacements: patched.replacements, commit_sha: res.commitSha, verified });
          }
          case "run_project_checks": {
            const suite = String(args.suite ?? "all");
            const err = needRepo();
            // CI path always available if repo linked
            if (suite === "ci" || suite === "all") {
              if (!err && gh && repo) {
                const sha = state.lastCommitSha || (await GH.getBranchHead(gh.token, repo.full_name, branch).catch(() => null));
                if (sha) {
                  const checks = await GH.getChecks(gh.token, repo.full_name, sha);
                  if (suite === "ci") {
                    log({ tool: name, ok: true, summary: `CI em ${sha.slice(0, 7)}: ${JSON.stringify(checks).slice(0, 120)}` });
                    return JSON.stringify({ suite: "ci", commit_sha: sha, checks, source: "github_checks" });
                  }
                }
              }
            }
            // Sandbox path: honest pending when not configured
            const suggested = suggestedValidationCommands({
              hasPackageJson: state.tree.some((t) => t.path === "package.json" || t.path.endsWith("/package.json")),
              hasTsConfig: state.tree.some((t) => t.path === "tsconfig.json" || t.path.endsWith("/tsconfig.json")),
              hasPython: state.tree.some((t) => t.path.endsWith("requirements.txt") || t.path.endsWith("pyproject.toml")),
            });
            log({ tool: name, ok: true, summary: "Runner/sandbox: validação local pendente (comandos sugeridos retornados)" });
            return JSON.stringify({
              suite,
              status: "pending_runner",
              message: "Sandbox/runner não executou comandos neste ambiente ou não está configurado. Não invente resultado de build.",
              suggested_commands: suggested,
              hint: "Configure WLC_RUNNER_URL/WLC_RUNNER_TOKEN para execução real de tsc/test no Docker remoto.",
            });
          }
          case "write_file": {
            const err = needRepo();
            if (err) return JSON.stringify({ error: err });
            if (!repo!.is_authorized) return JSON.stringify({ error: "Escrita bloqueada para este repositório. Habilite 'Agente pode escrever' em Repositórios antes de solicitar alterações." });
            const checkedPath = validateAgentWritePath(String(args.path ?? ""));
            if (checkedPath.error || !checkedPath.path) return JSON.stringify({ error: checkedPath.error ?? "Caminho inválido." });
            const path = checkedPath.path;
            const content = String(args.content ?? "");
            if (content.length > 1_000_000) return JSON.stringify({ error: "Arquivo excede o limite de 1 MB por operação. Divida a alteração em arquivos menores." });
            const message = String(args.commit_message || `Atualiza ${path}`).slice(0, 200);
            const current = await GH.getFile(gh!.token, repo!.full_name, path, branch);
            if (current) {
              const read = state.readShas.get(path);
              if (!read) return JSON.stringify({ error: "Leia o arquivo com read_file antes de modificá-lo." });
              if (read !== current.sha)
                return JSON.stringify({ error: "O arquivo foi alterado externamente desde a sua leitura. Leia novamente e reavalie antes de sobrescrever." });
              if (current.content === content) {
                log({ tool: name, ok: true, summary: `Sem alterações em ${path} (conteúdo idêntico)`, path });
                return JSON.stringify({ ok: true, unchanged: true });
              }
            }
            let res: Awaited<ReturnType<typeof GH.putFile>>;
            try {
              res = await GH.putFile(gh!.token, repo!.full_name, { path, content, message, branch, sha: current?.sha });
            } catch (e) {
              // Auto-heal stale/missing SHA (GitHub 409/422): re-read the branch head version and retry once.
              if (!isShaConflict(e)) throw e;
              const fresh = await GH.getFile(gh!.token, repo!.full_name, path, branch);
              res = await GH.putFile(gh!.token, repo!.full_name, { path, content, message, branch, sha: fresh?.sha });
            }
            const verify = await GH.getFile(gh!.token, repo!.full_name, path, res.commitSha);
            const verified = !!verify && verify.content === content && verify.sha === res.blobSha;
            const checks = await GH.getChecks(gh!.token, repo!.full_name, res.commitSha);
            state.readShas.set(path, res.blobSha);
            state.lastCommitSha = res.commitSha;
            const changeType = current ? "update" : "create";
            if (!current) state.tree.push({ path, type: "blob", sha: res.blobSha, size: content.length });
            state.modified.push({ path, change_type: changeType, blob_sha: res.blobSha, commit_sha: res.commitSha });
            await Promise.all([
              db.from("file_changes").insert({
                user_id: userId, project_id: chat.project_id, chat_id: chat.id, repository_id: repo!.id, file_path: path,
                change_type: changeType, commit_sha: res.commitSha, previous_sha: current?.sha ?? null, new_sha: res.blobSha,
                diff_summary: `${message} (${content.split("\n").length} linhas)`,
              }),
              db.from("audit_logs").insert({
                user_id: userId, project_id: chat.project_id, chat_id: chat.id, agent: providerLabel() ?? "dev-agent",
                operation: changeType === "create" ? "Criar arquivo" : "Modificar arquivo", file_path: path, change_summary: message,
                status: verified ? "completed" : "needs_fix",
                result: verified ? "Conteúdo confirmado no commit via GitHub" : "Conteúdo no GitHub difere do enviado",
                evidence: j({ repo_full_name: repo!.full_name, branch, commit_url: res.commitUrl, file_url: res.fileUrl, blob_sha: res.blobSha, previous_sha: current?.sha ?? null, verified_content_match: verified, bytes: content.length }),
                commit_sha: res.commitSha,
                tests: j({ ci_state: checks.state, runs: checks.runs }),
              }),
              db.from("repositories").update({ last_commit_sha: res.commitSha, last_synced_at: new Date().toISOString() }).eq("id", repo!.id),
            ]);
            log({ tool: name, ok: verified, summary: `${changeType === "create" ? "Criou" : "Modificou"} ${path} — commit ${res.commitSha.slice(0, 7)}${verified ? " (verificado)" : " (verificação falhou)"}`, path, commit_sha: res.commitSha, commit_url: res.commitUrl, verified });
            return JSON.stringify({
              ok: verified,
              commit_sha: res.commitSha,
              verified,
              ci_state: checks.state,
              ...(verified ? {} : { error: "O commit foi criado, mas a leitura de verificação não confirmou exatamente o conteúdo enviado. Não considere a alteração validada." }),
            });
          }
          case "delete_file": {
            const err = needRepo();
            if (err) return JSON.stringify({ error: err });
            if (!repo!.is_authorized) return JSON.stringify({ error: "Remoção bloqueada: habilite 'Agente pode escrever' em Repositórios. A remoção ainda exigirá aprovação." });
            const checkedPath = validateAgentWritePath(String(args.path ?? ""));
            if (checkedPath.error || !checkedPath.path) return JSON.stringify({ error: checkedPath.error ?? "Caminho inválido." });
            const path = checkedPath.path;
            await db.from("development_tasks").insert({
              user_id: userId, project_id: chat.project_id, chat_id: chat.id, title: `Remover ${path}`, description: String(args.reason ?? ""),
              status: "awaiting_approval", payload: j({ action: "delete_file", path, repository_id: repo!.id, repo_full_name: repo!.full_name, branch }),
            });
            log({ tool: name, ok: true, summary: `Pediu aprovação para remover ${path}`, path });
            return JSON.stringify({ ok: true, awaiting_approval: true, note: "O usuário precisa aprovar em Tarefas." });
          }
          case "list_commits": {
            const err = needRepo();
            if (err) return JSON.stringify({ error: err });
            const commits = await GH.listCommits(gh!.token, repo!.full_name, branch, Math.min(Number(args.limit) || 10, 30));
            log({ tool: name, ok: true, summary: `Consultou ${commits.length} commits` });
            return JSON.stringify(commits.map((c) => ({ sha: c.sha.slice(0, 10), message: c.message.split("\n")[0], author: c.author, date: c.date })));
          }
          case "check_ci": {
            const err = needRepo();
            if (err) return JSON.stringify({ error: err });
            const checks = await GH.getChecks(gh!.token, repo!.full_name, String(args.sha));
            log({ tool: name, ok: true, summary: `CI de ${String(args.sha).slice(0, 7)}: ${checks.state}` });
            return JSON.stringify(checks);
          }
          case "compare_versions": {
            const err = needRepo();
            if (err) return JSON.stringify({ error: err });
            const cmp = await GH.compare(gh!.token, repo!.full_name, String(args.base), String(args.head));
            log({ tool: name, ok: true, summary: `Comparou ${args.base}...${args.head} (${cmp.files.length} arquivos)` });
            return JSON.stringify({ ...cmp, files: cmp.files.map((f) => ({ ...f, patch: f.patch?.slice(0, 1500) ?? null })) });
          }
          case "create_branch": {
            const err = needRepo();
            if (err) return JSON.stringify({ error: err });
            if (!repo!.is_authorized) return JSON.stringify({ error: "Criação de branch bloqueada. Habilite 'Agente pode escrever' em Repositórios." });
            const head = state.lastCommitSha ?? (await GH.getBranchHead(gh!.token, repo!.full_name, branch));
            const nm = String(args.name ?? "");
            const branchError = validateBranchName(nm);
            if (branchError) return JSON.stringify({ error: branchError });
            await GH.createBranch(gh!.token, repo!.full_name, nm, head);
            if (args.switch_to) {
              branch = nm;
              await db.from("chats").update({ branch: nm }).eq("id", chat.id);
            }
            await db.from("audit_logs").insert({ user_id: userId, project_id: chat.project_id, chat_id: chat.id, agent: providerLabel() ?? "dev-agent", operation: "Criar branch", change_summary: nm, status: "completed", result: `Branch criado a partir de ${head.slice(0, 7)}`, evidence: j({ repo_full_name: repo!.full_name, from_sha: head }), commit_sha: head });
            log({ tool: name, ok: true, summary: `Criou branch ${nm}${args.switch_to ? " e passou a usá-lo" : ""}` });
            return JSON.stringify({ ok: true, branch: nm });
          }
          case "save_memory": {
            await db.from("project_memory").insert({ user_id: userId, project_id: chat.project_id, kind: String(args.kind ?? "context"), title: String(args.title).slice(0, 200), content: String(args.content), source_chat_id: chat.id });
            log({ tool: name, ok: true, summary: `Memória: ${String(args.title).slice(0, 80)}` });
            return JSON.stringify({ ok: true });
          }
          case "propose_plan": {
            if (mode === "build") return JSON.stringify({ error: "Modo Criar: o usuário já autorizou tudo. Não peça aprovação — grave os arquivos agora com write_file/patch_file." });
            if (state.awaitingApproval) return JSON.stringify({ error: "Um plano já foi proposto nesta execução. Encerre a resposta e aguarde o usuário." });
            const goal = String(args.goal ?? "").trim();
            const steps = Array.isArray(args.steps) ? (args.steps as unknown[]).map((x) => String(x).trim()).filter(Boolean).slice(0, 12) : [];
            const plan = buildAgentPlan(goal.length >= 8 ? goal : `${goal} (pedido do chat)`.trim(), steps);
            const planHash = await hashAgentPlan(plan);
            const admin = await getAdmin();
            // Only one decision card per chat: older pending plans are superseded.
            await admin.from("agent_plans").update({ status: "superseded" }).eq("chat_id", chat.id).eq("user_id", userId).eq("status", "pending");
            const { data: prev } = await admin.from("agent_plans").select("version").eq("chat_id", chat.id).order("version", { ascending: false }).limit(1).maybeSingle();
            const { data: created, error } = await admin.from("agent_plans").insert({
              user_id: userId, project_id: chat.project_id, chat_id: chat.id, version: (prev?.version ?? 0) + 1,
              goal: plan.goal, plan: j(plan), plan_hash: planHash, status: "pending",
            }).select("id").single();
            if (error || !created) throw new Error(error?.message ?? "Não foi possível registrar o plano");
            state.awaitingApproval = true;
            log({ tool: name, ok: true, summary: `Plano proposto: ${plan.goal.slice(0, 80)} — aguardando o botão Criar` });
            return JSON.stringify({ ok: true, plan_id: created.id, note: "O usuário verá o cartão com o botão Criar. Não grave arquivos agora; encerre com uma frase curta." });
          }
          case "update_task": {
            const status = String(args.status ?? "pending");
            if (args.task_id) {
              await db.from("development_tasks").update({ title: String(args.title), status, description: args.description ? String(args.description) : undefined, completed_at: status === "done" ? new Date().toISOString() : null }).eq("id", String(args.task_id)).eq("project_id", chat.project_id);
            } else {
              await db.from("development_tasks").insert({ user_id: userId, project_id: chat.project_id, chat_id: chat.id, title: String(args.title), description: args.description ? String(args.description) : null, status });
            }
            log({ tool: name, ok: true, summary: `Tarefa "${String(args.title).slice(0, 60)}" → ${status}` });
            return JSON.stringify({ ok: true });
          }
          default:
            return JSON.stringify({ error: `Ferramenta desconhecida: ${name}` });
        }
      } catch (e) {
        const msg = redactSecrets((e as Error).message);
        log({ tool: name, ok: false, summary: `${name} falhou: ${msg.slice(0, 160)}`, path: typeof args.path === "string" ? args.path : undefined });
        await db.from("development_logs").insert({ user_id: userId, project_id: chat.project_id, chat_id: chat.id, level: "error", message: `${name} falhou`, details: j({ error: msg }) });
        return JSON.stringify({ error: msg });
      }
    };

    // Execution engine: anti-loop guard, operation ledger, error recovery hints.
    const WRITE_TOOLS = new Set(["write_file", "patch_file"]);
    // Creation Intelligence v2: conteúdo gravado nesta execução, usado na auditoria de qualidade antes do resumo final.
    const writtenContent = new Map<string, string>();
    const patchSnippets = new Map<string, string[]>();
    const trackWrittenContent = (toolName: string, a: Record<string, unknown>) => {
      if (typeof a.path !== "string") return;
      const path = normalizeRepoPath(a.path);
      if (toolName === "write_file") {
        writtenContent.set(path, String(a.content ?? ""));
        patchSnippets.delete(path);
        return;
      }
      const hunks = Array.isArray(a.hunks) ? (a.hunks as Array<{ old_text?: string; new_text?: string }>) : [];
      const known = writtenContent.get(path);
      if (known !== undefined) {
        let next = known;
        for (const h of hunks) {
          const oldT = String(h?.old_text ?? "");
          const idx = oldT ? next.indexOf(oldT) : -1;
          if (idx >= 0) next = next.slice(0, idx) + String(h?.new_text ?? "") + next.slice(idx + oldT.length);
          else patchSnippets.set(path, [...(patchSnippets.get(path) ?? []), String(h?.new_text ?? "")]);
        }
        writtenContent.set(path, next);
      } else {
        patchSnippets.set(path, [...(patchSnippets.get(path) ?? []), ...hunks.map((h) => String(h?.new_text ?? ""))]);
      }
    };
    const collectAuditFiles = () => [
      ...[...writtenContent.entries()].map(([path, content]) => ({ path, content })),
      ...[...patchSnippets.entries()].filter(([path]) => !writtenContent.has(path)).map(([path, parts]) => ({ path, content: parts.join("\n") })),
    ];
    const execTool = async (tc: ToolCall): Promise<string> => {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function.arguments || "{}"); } catch { return execToolRaw(tc); }
      const name = tc.function.name;
      const blocked = ledger.guard(name, args);
      if (blocked) {
        log({ tool: name, ok: false, summary: blocked.slice(0, 200), path: typeof args.path === "string" ? normalizeRepoPath(args.path) : undefined });
        return JSON.stringify({ error: blocked, blocked_by: "anti_loop" });
      }
      const op = ledger.start(name, args);
      const before = state.toolLog.length;
      const out = await execToolRaw(tc);
      const entry = state.toolLog.length > before ? state.toolLog[state.toolLog.length - 1] : undefined;
      ledger.finish(op, out, { verified: entry?.verified === true, commit_sha: entry?.commit_sha, write: WRITE_TOOLS.has(name) });
      if (op.state !== "failed" && WRITE_TOOLS.has(name)) trackWrittenContent(name, args);
      if (op.state === "failed") {
        return enrichFailure(out, name, op.path, state.tree.filter((t) => t.type === "blob").map((t) => t.path));
      }
      return out;
    };

    // ---- main loop
    const latestUserQuery = [input.userMessage ?? "", ...history.filter((m) => m.role === "user").slice(-2).map((m) => m.content)].join("\n");
    const retrievedKnowledge = formatWlcKnowledgeContext(retrieveWlcKnowledge(latestUserQuery, 6));
    const physicsContext = formatPhysicsFormulaContext(retrievePhysicsFormulas(latestUserQuery, 5));
    const specialistAcademyContext = buildSpecialistAcademyContext(latestUserQuery, "principal");
    const engineeringQualityContext = buildEngineeringQualityContext();
    const designIntelligenceContext = buildWlcDesignContext();
    const professionalEngineeringContext = buildWlcProfessionalEngineeringContext(latestUserQuery);
    // Cognitive Core Evolution 0.13 — Adaptive Knowledge + Technology Radar
    const adaptiveKnowledgeCtx = formatAdaptiveKnowledgeContext(retrieveAdaptiveKnowledge(latestUserQuery, 4));
    const techRadarHits = findTechnologies(latestUserQuery, 4);
    const techRadarCtx = formatTechnologyRadarContext(techRadarHits);
    // Creative Engineering + Design DNA (development-oriented requests only)
    let creativeEngineeringCtx = "";
    let designDnaCtx = "";
    let projectCreationCtx = "";
    let creationBlueprint: CreationBlueprint | undefined;
    if (shouldRunCreativePlanning(latestUserQuery) || isCreationRequest(latestUserQuery)) {
      // Creation Intelligence v2: blueprint de domínio (entidades, invariantes, estados, escopo em camadas, fases com portões).
      creationBlueprint = analyzeCreation(latestUserQuery);
      projectCreationCtx = formatCreationBlueprintContext(creationBlueprint);
      wlcLogger.info("creation-intelligence-v2", "blueprint_built", {
        chat_id: chat.id,
        primary: creationBlueprint.primary,
        secondary: creationBlueprint.secondary,
        tier: creationBlueprint.tier,
        complexity: creationBlueprint.complexityScore,
        confidence: creationBlueprint.confidence,
      });
      const creativePlan = generateCreativePlan({
        objective: latestUserQuery.slice(0, 500),
        complexity: /complexo|enterprise|saas|dashboard|multi/.test(latestUserQuery.toLocaleLowerCase("pt-BR")) ? "high" : "medium",
      });
      creativeEngineeringCtx = formatCreativePlanContext(creativePlan);
      const dna = generateDesignDNA({
        objective: latestUserQuery.slice(0, 300),
        desiredIdentity: creativePlan.selected.personality,
        complexity: creativePlan.brief.complexity,
      });
      designDnaCtx = formatDesignDNAContext(dna);
    }
    const combinedKnowledge = [
      retrievedKnowledge,
      adaptiveKnowledgeCtx,
      specialistAcademyContext,
      engineeringQualityContext,
      designIntelligenceContext,
      professionalEngineeringContext,
      techRadarCtx,
      projectCreationCtx,
      creativeEngineeringCtx,
      designDnaCtx,
      physicsContext
        ? `## Fórmulas de Física recuperadas
Use as fórmulas apenas se suas condições de validade forem atendidas e explique símbolos/unidades.
${physicsContext}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const currentMessage = input.userMessage ?? latestUserQuery;
    const proDecision = assessProRequest(
      currentMessage,
      history.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : "",
      })),
    );
    wlcLogger.info("cognitive-orchestrator-pro", "request_assessed", summarizeProDecision(proDecision));

    const intelligenceFrame = buildWlcIntelligenceFrame(currentMessage, history.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : "",
    })));
    const cognitiveDecision = assessWlcRequest(currentMessage);
    const advancedCognition = assessAdvancedCognition(currentMessage);
    const socialDecision = assessSocialConversation(input.userMessage ?? latestUserQuery, history.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : "" })));
    const engineeringIntelligenceContext = formatEngineeringIntelligenceContext(currentMessage, history.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : "" })));
    const cognitiveContext = [engineeringIntelligenceContext, formatProCognitiveContext(proDecision), formatWlcIntelligenceContext(intelligenceFrame), formatWlcCognitiveContext(cognitiveDecision), formatAdvancedCognitiveContext(advancedCognition), formatSocialCognitionContext(socialDecision), formatEngineeringContext(currentMessage, cognitiveDecision), formatAutonomousEngineeringContext(currentMessage), formatAutonomousDevelopmentContext(currentMessage), buildAutonomousIntelligenceContext(currentMessage)].filter(Boolean).join("\n\n");
    wlcLogger.info("cognitive-engine", "request_assessed", {
      chat_id: chat.id,
      intent: cognitiveDecision.intent,
      complexity: cognitiveDecision.complexity,
      risk: cognitiveDecision.risk,
      tools_recommended: cognitiveDecision.needsTools,
      clarification_recommended: cognitiveDecision.needsClarification,
      intelligence_mode: intelligenceFrame.mode,
      conversation_continuity: intelligenceFrame.continuity,
      intelligence_risk: intelligenceFrame.risk,
      intelligence_confidence: intelligenceFrame.confidence,
      cognitive_confidence: advancedCognition.confidence,
      cognitive_strategy: advancedCognition.strategy,
      human_review_recommended: advancedCognition.requiresHumanReview,
      social_intent: socialDecision.intent,
      social_tone: socialDecision.tone,
      contextual_followup: socialDecision.shortContextualReply,
    });
    const learnedKnowledge = await loadLearnedKnowledge(db, userId, input.userMessage ?? "");
    const messages: ChatMsg[] = [{ role: "system", content: learnedKnowledge + systemPrompt(ctx.text, input.resumeNote, nexusWorkflow ?? undefined, combinedKnowledge, !!repo, cognitiveContext, modeSystemPrompt(mode, planApproved)) + modeInstruction(planApproved ? "build" : mode) + (mode === "chat" ? "" : buildCreationProtocol(planApproved ? "build" : mode, creationBlueprint)) }, ...history];
    await persistAgentEvent(input.resumedCheckpointId ? "execution_resumed" : "execution_started", "running",
      input.resumedCheckpointId ? "Execução retomada de checkpoint" : "Execução iniciada",
      { resumed_checkpoint_id: input.resumedCheckpointId ?? null, model: chat.model });
    let finalText = "";
    let paused: PausedError | null = null;
    let nudges = 0;
    let auditRounds = 0;
    let lastAudit: AuditReport | null = null;
    try {
      slices: for (let cycle = 0; cycle < MAX_AUTO_CYCLES && !finalText; cycle++) {
      if (cycle > 0) {
        await saveCheckpoint("auto", `Ciclo ${cycle} concluído — continuação automática`);
        await persistAgentEvent("execution_resumed", "running", `Limite de ações do ciclo atingido — retomando a criação automaticamente (ciclo ${cycle + 1}/${MAX_AUTO_CYCLES})`, { cycle: cycle + 1 });
        // Shrink old tool outputs so the conversation fits while keeping tool-call pairing intact.
        const keepFrom = Math.max(1, messages.length - 24);
        for (let i = 1; i < keepFrom; i++) { const m = messages[i]!; if (m.role === "tool" && typeof m.content === "string" && m.content.length > 400) m.content = m.content.slice(0, 400) + "…[resumido]"; }
        messages.push({ role: "user", content: "Continuação automática: você atingiu o limite de ações do ciclo anterior. Continue exatamente de onde parou, sem refazer o que já foi gravado, até concluir TODO o pedido. Só encerre com o resumo final quando tudo estiver pronto." });
      }
      for (state.step = 0; state.step < MAX_STEPS; state.step++) {
        if (state.step > 0 && Date.now() - startedAt > SLICE_MS) {
          const cp = await saveCheckpoint("auto", "Parte concluída — continuação automática");
          paused = new PausedError("Continuação automática", cp);
          finalText = "⏩ Parte concluída — continuando automaticamente…";
          break slices;
        }
        await db.from("agent_sessions").update({ heartbeat_at: new Date().toISOString(), api_connection_id: provider && (provider as Provider).kind === "gemini" ? (provider as unknown as { key: GeminiKeyRow }).key.id : null }).eq("chat_id", chat.id);
        // WLC.IA uses the conversational agent/tool loop. Static repository scanning remains a separate utility, not the chat's forced response path.
        await persistAgentEvent("thinking", "running", state.step === 0 ? "Entendendo o pedido e planejando" : `Analisando resultados e decidindo o próximo passo (etapa ${state.step + 1})`, { step: state.step + 1 });
        const msg = await callModel(messages);
        messages.push(msg);
        if (msg.tool_calls?.length) {
          // Read-only operations can overlap safely; writes and state-changing
          // tools remain serialized to preserve commit order and approval gates.
          const parallelSafe = new Set([
            "calculate_expression", "list_files", "read_file",
            "list_commits", "check_ci", "compare_versions",
          ]);
          let cursor = 0;
          while (cursor < msg.tool_calls.length) {
            const current = msg.tool_calls[cursor]!;
            if (parallelSafe.has(current.function.name)) {
              const batch = [];
              while (cursor < msg.tool_calls.length && parallelSafe.has(msg.tool_calls[cursor]!.function.name)) {
                batch.push(msg.tool_calls[cursor]!);
                cursor++;
              }
              const outputs = await Promise.all(batch.map((tc) => execTool(tc)));
              for (let index = 0; index < batch.length; index++) {
                messages.push({ role: "tool", tool_call_id: batch[index]!.id, content: outputs[index] ?? "" });
              }
            } else {
              const out = await execTool(current);
              messages.push({ role: "tool", tool_call_id: current.id, content: out });
              cursor++;
            }
          }
          // Persist recovery points without interrupting the active model/tool loop.
          // The in-memory conversation remains active, so the user does not need
          // to manually resume at every checkpoint interval.
          if (state.awaitingApproval) {
            finalText = (msg.content ?? "").trim() || "Preparei o plano abaixo. Clique em **Criar** para eu começar, ou em **Continuar no chat** para ajustar antes.";
            break;
          }
          if ((state.step + 1) % CHECKPOINT_INTERVAL === 0) {
            await saveCheckpoint("auto", `Checkpoint automático de continuidade após ${state.step + 1} etapas`);
          }
          continue;
        }
        const reply = (msg.content ?? "").trim();
        // Build mode: a reply that asks permission (or ends before any write) is not a finished task.
        const wrote = state.toolLog.some((e) => e.ok && ["write_file", "patch_file"].includes(e.tool));
        if (mode === "build" && nudges < 3 && (!wrote || ASKS_PERMISSION.test(reply))) {
          nudges++;
          messages.push({ role: "user", content: "Modo Criar: você já tem autorização total. Não pergunte nada nem peça confirmação. Continue agora gravando os arquivos com write_file/patch_file até o resultado completo estar pronto; só então escreva o resumo final." });
          continue;
        }
        // Creation Intelligence v2: portão de qualidade — audita o que foi gravado e força autocorreção (máx. 2 rodadas).
        if (mode === "build" && wrote && auditRounds < 2) {
          lastAudit = auditGeneratedFiles(collectAuditFiles());
          wlcLogger.info("creation-intelligence-v2", "audit_completed", { chat_id: chat.id, round: auditRounds + 1, score: lastAudit.score, grade: lastAudit.grade, findings: lastAudit.findings.length, blocking: lastAudit.blocking.length });
          if (lastAudit.blocking.length) {
            auditRounds++;
            messages.push({ role: "user", content: buildAuditSelfReviewPrompt(lastAudit, auditRounds) });
            continue;
          }
        }
        finalText = reply;
        break;
      }
      }
      if (!finalText) {
        const cp = await saveCheckpoint("auto", "Limite de etapas por execução atingido");
        finalText = `A execução usou ${MAX_AUTO_CYCLES} ciclos automáticos de ${MAX_STEPS} ações. O progresso foi salvo; clique em Continuar de onde parou para seguir.`;
        void `A execução atingiu o limite de segurança de ${MAX_STEPS} etapas nesta chamada. O progresso foi salvo em checkpoint; nenhuma operação concluída será descartada. Para tarefas maiores, a continuação precisa ser iniciada por uma nova chamada do servidor.`;
        paused = new PausedError("Limite de etapas", cp);
      }
    } catch (e) {
      if (e instanceof PausedError) paused = e;
      else {
        finalStatus = "error";
        const cp = await saveCheckpoint("error", (e as Error).message);
        paused = new PausedError(redactSecrets((e as Error).message), cp);
      }
    }

    if (paused && !finalText) {
      finalText = `⏸ Execução pausada: ${paused.message}\n\nUm checkpoint foi salvo com as operações concluídas, arquivos modificados e tarefas pendentes. ${isNexus ? "Verifique a conexão e as permissões do GitHub e tente novamente." : "Ative ou cadastre outra chave em **Gerenciador de APIs** e use **Retomar** em Checkpoints."}`;
    }

    // Conclusion protocol: final status comes only from verified evidence.
    {
      const writes = state.toolLog.filter((t) => WRITE_TOOLS.has(t.tool) && t.commit_sha);
      const tests = state.toolLog.filter((t) => t.tool === "check_ci" || (t.tool === "run_project_checks" && !/pendente/.test(t.summary)));
      const verdict = honestStatus({
        writes: writes.length, verifiedWrites: writes.filter((t) => t.verified).length,
        failures: state.toolLog.filter((t) => !t.ok).length, testsRun: tests.length, testsPassed: tests.filter((t) => t.ok && !/fail|erro/i.test(t.summary)).length,
        blocked: !!paused && paused.message !== "Continuação automática", error: finalStatus === "error",
      });
      if (state.toolLog.length && mode !== "chat" && !(paused && paused.message === "Continuação automática")) {
        const st = ledger.stats();
        finalText = `${guardClaims(finalText, verdict.status)}\n\n---\n**Status verificado:** ${verdict.status}${verdict.confidence ? ` · confiança ${verdict.confidence}` : ""}\nOperações: ${st.total} (verificadas ${st.verified}, ok ${st.success}, falhas ${st.failed})${tests.length ? "" : "\nValidação: nenhum teste foi executado nesta execução."}${mode === "build" && writtenContent.size + patchSnippets.size > 0 ? `\n${summarizeAudit(auditGeneratedFiles(collectAuditFiles()))}` : ""}`;
      }
    }
    const { data: saved } = await db
      .from("chat_messages")
      .insert({
        user_id: userId,
        chat_id: chat.id,
        role: "assistant",
        content: finalText,
        metadata: j({ mode, completion: buildCompletionReport(state.toolLog, { paused: !!paused, pauseReason: paused?.message ?? null, error: finalStatus === "error" ? (paused?.message ?? "Erro na execução") : null, durationMs: Date.now() - startedAt }), tool_log: state.toolLog, operations: j(ledger.ops), provider: providerLabel(), model: isNexus ? "WLC.IA" : provider && (provider as Provider).kind === "builtin" ? "gemini-embutido" : chat.model, rotations, paused: !!paused, auto_continue: paused?.message === "Continuação automática", checkpoint_id: paused?.checkpointId ?? null, resumed_checkpoint_id: input.resumedCheckpointId ?? null }),
      })
      .select("id")
      .single();
    feedbackSaved = !!saved;
    // Background, silent sync of the exchange into WLC.IA/<Modo>.md in the user's repository.
    if (repo && gh && repo.is_authorized && input.userMessage && !isApprovalMessage(input.userMessage) && !(paused && paused.message === "Continuação automática")) {
      const logMode = planApproved ? "build" : mode;
      const path = chatLogPath(logMode);
      const userText = input.userMessage;
      const sync = (async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const cur = await GH.getFile(gh.token, repo.full_name, path, branch);
            const content = appendExchange(cur?.content ?? null, { mode: logMode, chatTitle: chat.title === "Novo chat" ? userText.slice(0, 60) : chat.title, chatId: chat.id, user: userText, assistant: finalText, at: new Date() });
            await GH.putFile(gh.token, repo.full_name, { path, content, message: `docs(wlc-ia): atualiza ${path}`, branch, sha: cur?.sha });
            return;
          } catch { /* sha conflict or network: retry once, then give up silently */ }
        }
      })();
      try {
        const spec = "cloudflare:workers";
        const cf: any = await import(/* @vite-ignore */ spec);
        if (typeof cf?.waitUntil === "function") cf.waitUntil(sync); else await sync;
      } catch { await sync; }
    }

    await persistAgentEvent(paused ? "execution_paused" : "execution_finished", paused ? "paused" : finalStatus === "error" ? "failed" : "completed",
      paused ? "Execução pausada com checkpoint" : "Ciclo de execução finalizado",
      { checkpoint_id: paused?.checkpointId ?? null, operations: state.toolLog.length, duration_ms: Date.now() - startedAt });
    // Ensure all fire-and-forget tool events have settled before this request returns.
    await pendingAgentEvents.drain();
    await updateProjectSummary(db, userId, chat, input.userMessage, state.toolLog);
    if (input.userMessage && chat.title === "Novo chat") {
      await db.from("chats").update({ title: input.userMessage.slice(0, 60) }).eq("id", chat.id);
    } else {
      await db.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", chat.id);
    }
    if (rotations.length) {
      await db.from("development_logs").insert({ user_id: userId, project_id: chat.project_id, chat_id: chat.id, level: "info", message: "Alternância de chaves", details: j({ rotations }) });
    }

    return { messageId: saved?.id ?? null, paused: !!paused, checkpointId: paused?.checkpointId ?? null, toolLog: state.toolLog, provider: providerLabel(), rotations };
  } catch (e) {
    finalStatus = "error";
    // Never end silently: record the failure in the chat history.
    if (!feedbackSaved && projectIdForFeedback) {
      const msg = redactSecrets((e as Error).message || "Erro desconhecido");
      await db.from("chat_messages").insert({
        user_id: userId, chat_id: input.chatId, role: "assistant",
        content: `A execução falhou antes de concluir.\n\n**Erro:** ${msg}\n\nNenhuma alteração foi confirmada nesta execução.`,
        metadata: j({ completion: buildCompletionReport([], { error: msg, durationMs: Date.now() - startedAt }), tool_log: [] }),
      }).then(() => undefined, () => undefined);
      // Close the run in the live feed so the chat never shows it as still building.
      try {
        const admin = await getAdmin();
        await admin.from("agent_events").insert({ user_id: userId, project_id: projectIdForFeedback, chat_id: input.chatId, event_type: "execution_failed", status: "failed", title: "Execução falhou", detail: j({ error: msg }) });
      } catch { /* telemetry must not mask the original error */ }
    }
    throw e;
  } finally {
    // Also drain on exceptional/paused paths so telemetry is not silently lost.
    await pendingAgentEvents.drain();
    clearInterval(heartbeat);
    const { error: relErr } = await db.rpc("release_agent_lock", { _chat_id: input.chatId, _token: lockToken, _status: finalStatus });
    if (relErr) await db.rpc("release_agent_lock", { _chat_id: input.chatId, _token: lockToken, _status: finalStatus });
  }
}

export class AgentBusyError extends Error {
  code = "busy" as const;
  constructor() {
    super(AGENT_BUSY_MESSAGE);
  }
}

async function updateProjectSummary(db: DB, userId: string, chat: ChatRow, userMessage: string | null, toolLog: ToolLogEntry[]) {
  const [tasks, changes] = await Promise.all([
    db.from("development_tasks").select("title, status").eq("project_id", chat.project_id).in("status", ["pending", "in_progress", "awaiting_approval"]).limit(15),
    db.from("file_changes").select("file_path, change_type, commit_sha").eq("project_id", chat.project_id).order("created_at", { ascending: false }).limit(10),
  ]);
  const summary = [
    `Atualizado em ${new Date().toISOString()}`,
    userMessage ? `Último pedido: ${userMessage.slice(0, 240)}` : "Última execução: retomada de checkpoint",
    toolLog.length ? `Operações da última execução: ${toolLog.map((t) => t.summary).slice(0, 12).join("; ")}` : "Última execução sem operações no repositório",
    changes.data?.length ? `Arquivos alterados recentemente: ${changes.data.map((c) => `${c.change_type} ${c.file_path}@${c.commit_sha?.slice(0, 7)}`).join(", ")}` : "",
    tasks.data?.length ? `Tarefas abertas: ${tasks.data.map((t) => `${t.title} (${t.status})`).join("; ")}` : "Sem tarefas abertas",
  ].filter(Boolean).join("\n");

  await db.from("projects").update({ context_summary: summary, last_activity_at: new Date().toISOString() }).eq("id", chat.project_id);
  const { data: existing } = await db.from("project_memory").select("id").eq("project_id", chat.project_id).eq("kind", "summary").limit(1).maybeSingle();
  if (existing) await db.from("project_memory").update({ content: summary, source_chat_id: chat.id }).eq("id", existing.id);
  else await db.from("project_memory").insert({ user_id: userId, project_id: chat.project_id, kind: "summary", title: "Resumo estruturado do projeto", content: summary, source_chat_id: chat.id });
}

// ---------------------------------------------------------------- resume

export async function validateCheckpoint(db: DB, userId: string, checkpointId: string) {
  const { data: cp, error } = await db.from("checkpoints").select("*").eq("id", checkpointId).single();
  if (error || !cp) throw new Error("Checkpoint não encontrado");
  const modified = (cp.modified_files ?? []) as unknown as ModifiedFile[];
  const report: string[] = [];
  const divergences: string[] = [];
  let currentHead: string | null = null;
  if (cp.repo_full_name && cp.branch) {
    const gh = await loadGithubToken(userId);
    if (!gh) {
      divergences.push("GitHub não conectado: não foi possível validar o estado real do repositório.");
    } else {
      currentHead = await GH.getBranchHead(gh.token, cp.repo_full_name, cp.branch);
      report.push(`HEAD no checkpoint: ${cp.head_sha?.slice(0, 7) ?? "?"} · HEAD atual: ${currentHead.slice(0, 7)}`);
      if (cp.head_sha && cp.head_sha !== currentHead) {
        try {
          const cmp = await GH.compare(gh.token, cp.repo_full_name, cp.head_sha, currentHead);
          divergences.push(`O branch avançou ${cmp.ahead_by} commit(s) desde o checkpoint. Arquivos alterados externamente: ${cmp.files.map((f) => f.filename).join(", ") || "nenhum"}.`);
        } catch (e) {
          divergences.push(`Não foi possível comparar versões: ${(e as Error).message}`);
        }
      }
      for (const m of modified) {
        const f = await GH.getFile(gh.token, cp.repo_full_name, m.path, cp.branch);
        if (m.change_type === "delete") {
          if (f) divergences.push(`${m.path} deveria estar removido, mas existe.`);
        } else if (!f) divergences.push(`${m.path} não existe mais no branch.`);
        else if (f.sha !== m.blob_sha) divergences.push(`${m.path} foi alterado depois do checkpoint (sha ${f.sha.slice(0, 7)} ≠ ${m.blob_sha?.slice(0, 7)}).`);
        else report.push(`${m.path}: confirmado (${f.sha.slice(0, 7)})`);
      }
    }
  }
  return { cp, report, divergences, currentHead };
}

export async function resumeFromCheckpoint(db: DB, userId: string, checkpointId: string) {
  const { cp, report, divergences } = await validateCheckpoint(db, userId, checkpointId);
  if (!cp.chat_id) throw new Error("Checkpoint sem chat de origem");
  if (cp.status !== "open") throw new Error("Este checkpoint já foi retomado");
  const st = (cp.state ?? {}) as { user_message?: string | null; completed_ops?: ToolLogEntry[] };
  const ops = st.completed_ops ?? [];
  const note = [
    `Checkpoint ${cp.id} (${cp.reason}) criado em ${cp.created_at}.`,
    st.user_message ? `Pedido original do usuário: ${st.user_message}` : "",
    `Última operação concluída: ${cp.last_operation ?? "-"}`,
    ops.length ? `Operações JÁ CONCLUÍDAS (não repetir):\n${ops.map((o) => `- ${o.summary}`).join("\n")}` : "Nenhuma operação havia sido concluída.",
    `Tarefas pendentes: ${((cp.pending_tasks ?? []) as string[]).join("; ") || "nenhuma"}`,
    `Erros registrados: ${((cp.errors ?? []) as string[]).join("; ") || "nenhum"}`,
    `Validação do estado real:\n${[...report, ...divergences].join("\n") || "Sem repositório para validar."}`,
    divergences.length ? "ATENÇÃO: existem divergências. Releia os arquivos afetados e analise antes de qualquer escrita; não sobrescreva alterações externas sem justificar." : "Estado real confere com o checkpoint.",
  ].filter(Boolean).join("\n\n");

  await db.from("chat_messages").insert({
    user_id: userId, chat_id: cp.chat_id, role: "system",
    content: `Retomando checkpoint de ${new Date(cp.created_at).toLocaleString("pt-BR")}.\n\n${[...report, ...divergences].join("\n") || "Sem repositório para validar."}`,
    metadata: j({ kind: "resume", checkpoint_id: cp.id, divergences }),
  });
  await db.from("checkpoints").update({ status: "resumed", resumed_at: new Date().toISOString() }).eq("id", cp.id);
  const result = await runAgent(db, userId, { chatId: cp.chat_id, userMessage: null, resumeNote: note, resumedCheckpointId: cp.id });
  return { ...result, divergences, report, chatId: cp.chat_id };
}

// ---------------------------------------------------------------- audits & approvals

export async function reauditEntry(db: DB, userId: string, auditId: string) {
  const { data: a } = await db.from("audit_logs").select("*").eq("id", auditId).single();
  if (!a) throw new Error("Auditoria não encontrada");
  const ev = (a.evidence ?? {}) as { repo_full_name?: string; blob_sha?: string; branch?: string };
  if (!a.commit_sha || !ev.repo_full_name) throw new Error("Registro sem commit para verificar");
  const gh = await loadGithubToken(userId);
  if (!gh) throw new Error("GitHub não conectado");
  const checks = await GH.getChecks(gh.token, ev.repo_full_name, a.commit_sha);
  let contentOk = true;
  let currentNote = "";
  if (a.file_path && ev.blob_sha) {
    const atCommit = await GH.getFile(gh.token, ev.repo_full_name, a.file_path, a.commit_sha);
    contentOk = !!atCommit && atCommit.sha === ev.blob_sha;
    if (ev.branch) {
      const now = await GH.getFile(gh.token, ev.repo_full_name, a.file_path, ev.branch);
      currentNote = !now ? " Arquivo não existe mais no branch." : now.sha !== ev.blob_sha ? " Arquivo foi alterado depois deste commit." : " Arquivo inalterado no branch.";
    }
  }
  let status: string;
  let result: string;
  if (!contentOk) {
    status = "rejected";
    result = "Conteúdo no commit não corresponde ao registrado.";
  } else if (checks.state === "failure") {
    status = "needs_fix";
    result = "CI reprovado no commit.";
  } else if (checks.state === "pending") {
    status = "running";
    result = "CI em execução.";
  } else if (checks.state === "success") {
    status = "completed";
    result = "Conteúdo confirmado e CI aprovado.";
  } else {
    status = "completed";
    result = "Conteúdo confirmado. Repositório sem CI: build/testes não verificados.";
  }
  await db.from("audit_logs").update({ status, result: result + currentNote, tests: j({ ci_state: checks.state, runs: checks.runs, rechecked_at: new Date().toISOString() }) }).eq("id", a.id);
  return { status, result: result + currentNote, checks };
}

export async function approveDeletion(db: DB, userId: string, taskId: string) {
  const { data: t } = await db.from("development_tasks").select("*").eq("id", taskId).single();
  if (!t || t.status !== "awaiting_approval") throw new Error("Tarefa não está aguardando aprovação");
  const p = (t.payload ?? {}) as { action?: string; path?: string; repo_full_name?: string; branch?: string; repository_id?: string };
  if (p.action !== "delete_file" || !p.path || !p.repo_full_name || !p.branch) throw new Error("Pedido inválido");
  const gh = await loadGithubToken(userId);
  if (!gh) throw new Error("GitHub não conectado");
  const f = await GH.getFile(gh.token, p.repo_full_name, p.path, p.branch);
  if (!f) {
    await db.from("development_tasks").update({ status: "cancelled", description: "Arquivo já não existia" }).eq("id", t.id);
    return { deleted: false };
  }
  const res = await GH.deleteFile(gh.token, p.repo_full_name, { path: p.path, message: `Remove ${p.path} (aprovado pelo usuário)`, branch: p.branch, sha: f.sha });
  const after = await GH.getFile(gh.token, p.repo_full_name, p.path, res.commitSha);
  await Promise.all([
    db.from("development_tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", t.id),
    db.from("file_changes").insert({ user_id: userId, project_id: t.project_id, chat_id: t.chat_id, repository_id: p.repository_id ?? null, file_path: p.path, change_type: "delete", commit_sha: res.commitSha, previous_sha: f.sha }),
    db.from("audit_logs").insert({ user_id: userId, project_id: t.project_id, chat_id: t.chat_id, agent: "usuário (aprovação)", operation: "Remover arquivo", file_path: p.path, change_summary: t.description, status: after ? "failed" : "completed", result: after ? "Arquivo ainda existe após o commit" : "Remoção confirmada no GitHub", evidence: j({ repo_full_name: p.repo_full_name, branch: p.branch, commit_url: res.commitUrl, previous_sha: f.sha }), commit_sha: res.commitSha }),
  ]);
  return { deleted: true, commitSha: res.commitSha };
}

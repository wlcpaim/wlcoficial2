/**
 * WLC.IA Failure Intelligence v1
 * Classify failures, decide retry vs strategy change, and record lessons.
 */

export const WLC_FAILURE_INTELLIGENCE_VERSION = "1.0.0";

export type FailureCategory =
  | "tool_failure"
  | "network_failure"
  | "permission_failure"
  | "syntax_error"
  | "type_error"
  | "build_error"
  | "runtime_error"
  | "test_failure"
  | "architecture_failure"
  | "dependency_failure"
  | "invalid_assumption"
  | "context_failure"
  | "repeated_action"
  | "resource_limitation"
  | "unknown";

export type FailureRecord = {
  id: string;
  at: string;
  category: FailureCategory;
  tool?: string;
  step?: string;
  message: string;
  context?: string;
  retryable: boolean;
  strategyChangeRequired: boolean;
  suggestedStrategy: string;
};

export type FailureLesson = {
  signature: string;
  category: FailureCategory;
  lesson: string;
  occurrences: number;
  updatedAt: string;
};

const id = () => `fail-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function classifyFailure(message: string, tool?: string): FailureCategory {
  const m = message.toLowerCase();
  if (/econnreset|etimedout|fetch failed|network|502|503|504/.test(m)) return "network_failure";
  if (/403|401|permission|denied|unauthorized|forbidden/.test(m)) return "permission_failure";
  if (/syntaxerror|unexpected token|parse error/.test(m)) return "syntax_error";
  if (/typeerror|ts\d{3,5}|is not assignable|type '.*' is not/.test(m)) return "type_error";
  if (/build failed|vite.*error|webpack|cannot find module/.test(m)) return "build_error";
  if (/test failed|assertion|expected.*received|vitest|jest/.test(m)) return "test_failure";
  if (/cannot find package|module not found|peer dep|npm err/.test(m)) return "dependency_failure";
  if (/rate limit|quota|402|429|out of memory|enospc/.test(m)) return "resource_limitation";
  if (/repeated|loop|already failed/.test(m)) return "repeated_action";
  if (/sha.*conflict|stale|409|422/.test(m)) return "context_failure";
  if (tool && /write_file|read_file|github/.test(tool) && /fail|error/.test(m)) return "tool_failure";
  if (/runtime|exception|stack/.test(m)) return "runtime_error";
  return "unknown";
}

export function analyzeFailure(input: {
  message: string;
  tool?: string;
  step?: string;
  context?: string;
  priorSameCount?: number;
}): FailureRecord {
  const category = classifyFailure(input.message, input.tool);
  const prior = input.priorSameCount ?? 0;
  const retryable =
    prior < 1 &&
    (category === "network_failure" || category === "resource_limitation" || category === "context_failure");
  const strategyChangeRequired = !retryable || prior >= 1;

  const strategies: Record<FailureCategory, string> = {
    tool_failure: "Verificar argumentos, path e permissões; tentar leitura antes de escrita.",
    network_failure: "Backoff e retentar uma vez; se persistir, pausar com checkpoint.",
    permission_failure: "Não forçar; solicitar credencial/aprovação ou reduzir escopo.",
    syntax_error: "Abrir arquivo, corrigir sintaxe localmente, não reescrever o módulo inteiro.",
    type_error: "Corrigir tipos no ponto de falha; evitar `any` como solução padrão.",
    build_error: "Ler log de build, corrigir causa raiz, reexecutar build.",
    runtime_error: "Reproduzir, isolar stack, corrigir com teste de regressão.",
    test_failure: "Atualizar implementação ou teste com base no assert real.",
    architecture_failure: "Reavaliar desenho; preferir mudança mínima compatível.",
    dependency_failure: "Conferir package.json/lock e imports; não inventar módulos.",
    invalid_assumption: "Reinspecionar estado real do repositório antes de continuar.",
    context_failure: "Recarregar SHA/estado; reconciliar checkpoint com árvore atual.",
    repeated_action: "Bloquear repetição; mudar ferramenta, args ou abordagem.",
    resource_limitation: "Reduzir escopo, fatiar trabalho, ou pausar até recurso disponível.",
    unknown: "Coletar mais evidência antes de nova tentativa idêntica.",
  };

  return {
    id: id(),
    at: new Date().toISOString(),
    category,
    tool: input.tool,
    step: input.step,
    message: input.message.slice(0, 2000),
    context: input.context?.slice(0, 1000),
    retryable,
    strategyChangeRequired,
    suggestedStrategy: strategies[category],
  };
}

export class FailureMemory {
  private lessons = new Map<string, FailureLesson>();
  private recent: FailureRecord[] = [];

  remember(record: FailureRecord): FailureLesson {
    this.recent.push(record);
    if (this.recent.length > 100) this.recent = this.recent.slice(-80);
    const signature = `${record.category}|${record.tool ?? ""}|${record.message.slice(0, 80)}`;
    const prev = this.lessons.get(signature);
    const lesson: FailureLesson = {
      signature,
      category: record.category,
      lesson: record.suggestedStrategy,
      occurrences: (prev?.occurrences ?? 0) + 1,
      updatedAt: record.at,
    };
    this.lessons.set(signature, lesson);
    return lesson;
  }

  shouldBlockRetry(record: FailureRecord): boolean {
    const signature = `${record.category}|${record.tool ?? ""}|${record.message.slice(0, 80)}`;
    const lesson = this.lessons.get(signature);
    return (lesson?.occurrences ?? 0) >= 2 || record.strategyChangeRequired;
  }

  formatContext(): string {
    const top = [...this.lessons.values()].sort((a, b) => b.occurrences - a.occurrences).slice(0, 5);
    if (!top.length) {
      return `## Failure Intelligence v${WLC_FAILURE_INTELLIGENCE_VERSION}\n- Sem falhas registradas nesta sessão.`;
    }
    return [
      `## Failure Intelligence v${WLC_FAILURE_INTELLIGENCE_VERSION}`,
      "- Lições recentes (não repetir a mesma estratégia após 2 falhas idênticas):",
      ...top.map((l) => `  - [${l.category}] x${l.occurrences}: ${l.lesson}`),
    ].join("\n");
  }
}

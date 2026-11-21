/**
 * WLC.IA Developer Engineering Planner v1.
 * Deterministic scaffolding for software-engineering tasks; it does not replace an LLM.
 */
import type { WlcCognitiveDecision } from "./wlc-cognitive-engine";

export type EngineeringProfile = "frontend" | "backend" | "fullstack" | "mobile" | "data" | "devops" | "general";
export type EngineeringPhase = { id: string; title: string; objective: string; deliverables: string[]; gate: string };

const normalize = (s: string) => s.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const has = (s: string, words: string[]) => words.some(w => s.includes(w));

export function detectEngineeringProfile(request: string): EngineeringProfile {
  const q = normalize(request);
  if (has(q, ["mobile", "android", "ios", "flutter", "react native"])) return "mobile";
  if (has(q, ["api", "backend", "servidor", "database", "banco de dados", "auth", "autenticacao"])) {
    if (has(q, ["frontend", "interface", "dashboard", "site", "web", "react"])) return "fullstack";
    return "backend";
  }
  if (has(q, ["frontend", "interface", "ui", "ux", "site", "pagina", "web", "react", "css"])) return "frontend";
  if (has(q, ["pipeline", "deploy", "docker", "ci/cd", "infraestrutura", "cloud"])) return "devops";
  if (has(q, ["dados", "data", "etl", "analytics", "machine learning", "modelo"])) return "data";
  return "general";
}

const PHASES: EngineeringPhase[] = [
  { id: "discover", title: "Descoberta e requisitos", objective: "Converter o pedido em requisitos verificáveis e esclarecer restrições essenciais.", deliverables: ["escopo e fora de escopo", "requisitos funcionais e não funcionais", "critérios de aceite", "suposições explicitadas"], gate: "Não iniciar mudanças estruturais enquanto requisitos críticos estiverem ambíguos." },
  { id: "inspect", title: "Inspeção do contexto", objective: "Entender o projeto existente antes de editar.", deliverables: ["stack, convenções e scripts", "arquivos e dependências relevantes", "estado atual e limitações", "compatibilidade e risco"], gate: "Ler os arquivos que serão alterados e identificar impacto/integrações." },
  { id: "design", title: "Arquitetura e desenho", objective: "Escolher solução simples, modular e compatível com o contexto.", deliverables: ["responsabilidades e interfaces", "fluxo de dados", "modelo de estado e erros", "decisões e trade-offs"], gate: "Evitar reescrita ampla; preferir alterações incrementais com interfaces claras." },
  { id: "implement", title: "Implementação incremental", objective: "Construir uma fatia funcional e integrar sem deixar caminhos incompletos.", deliverables: ["código e tipos", "UI/UX ou API funcional", "validação e tratamento de falhas", "estados loading/empty/error/success quando aplicáveis"], gate: "Não afirmar funcionalidade sem implementação real; nenhum botão ou endpoint fictício." },
  { id: "verify", title: "Verificação e testes", objective: "Verificar comportamento, qualidade e regressões.", deliverables: ["testes unitários/integrados adequados", "typecheck, lint e build quando disponíveis", "checagem de segurança, acessibilidade e responsividade", "resultados e falhas remanescentes"], gate: "Corrigir falhas encontradas; distinguir comandos executados de não executados." },
  { id: "deliver", title: "Entrega rastreável", objective: "Comunicar resultado com evidência e continuidade.", deliverables: ["resumo do que mudou", "arquivos impactados", "validação executada", "limitações e próximos passos"], gate: "Nunca declarar sucesso de deploy, commit, teste ou operação sem evidência do sistema." },
];

export function createEngineeringPlan(request: string, decision: WlcCognitiveDecision): EngineeringPhase[] {
  const q = normalize(request);
  if (decision.intent === "debugging") return PHASES.filter(p => ["inspect", "implement", "verify", "deliver"].includes(p.id)).map(p => p.id === "inspect" ? {...p, objective: "Reproduzir o erro, examinar logs/stack trace e identificar a causa raiz provável."} : p);
  if (decision.intent === "review" || decision.intent === "security") return PHASES.filter(p => ["inspect", "design", "verify", "deliver"].includes(p.id)).map(p => p.id === "verify" ? {...p, objective: "Validar achados com evidências; classificar severidade, impacto, confiança e correção recomendada."} : p);
  if (decision.intent === "development") return PHASES;
  if (has(q, ["arquitetura", "roadmap", "planejar", "plano"])) return PHASES.slice(0, 3).concat(PHASES[5]!);
  return [];
}

export function formatEngineeringContext(request: string, decision: WlcCognitiveDecision): string {
  const phases = createEngineeringPlan(request, decision);
  if (!phases.length) return "";
  const profile = detectEngineeringProfile(request);
  return [
    "## WLC.IA — protocolo de engenharia de software",
    `Perfil provável: ${profile}. Trate como hipótese e ajuste ao contexto real.`,
    "Atue como engenheiro de software sênior: primeiro entenda; depois planeje; implemente em incrementos; valide; entregue com evidências.",
    "Regras: preservar convenções e compatibilidade existentes; preferir soluções simples e seguras; evitar duplicação e dependências desnecessárias; nunca expor segredos; validar entrada e autorização no servidor; tratar erros; acessibilidade e responsividade fazem parte do aceite.",
    "Para tarefas extensas, dividir em etapas e concluir uma fatia utilizável por etapa. Não criar arquivos ou arquitetura sem motivo. Não fingir execução, testes, deploy ou acesso.",
    "Plano adaptativo:",
    ...phases.map((p, i) => `${i + 1}. **${p.title}** — ${p.objective}\n   Entregáveis: ${p.deliverables.join("; ")}\n   Gate: ${p.gate}`),
    "Critério de entrega: indicar mudanças concretas, evidências das validações, limitações e próximo passo útil. Resumo de método, não cadeia de pensamento privada."
  ].join("\n");
}

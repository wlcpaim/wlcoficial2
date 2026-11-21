/**
 * WLC.IA v3 — Knowledge Matrix Full-Stack Universal
 * Backend enterprise, banco, frontend de alto impacto e protocolo operacional.
 */
import type { KnowledgeEntry } from "./wlc-knowledge-base";

export const FULLSTACK_KNOWLEDGE_VERSION = "1.0.0";

export const FULLSTACK_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "fs-be-01",
    domain: "Backend Enterprise",
    title: "APIs TypeScript com Hono/Fastify e Zod",
    keywords: ["hono", "fastify", "zod", "api", "endpoint", "typescript backend", "middleware", "validação"],
    content:
      "Padrão TypeScript preferencial: Hono ou Fastify com tipagem ponta a ponta. Valide payload e parâmetros de rota com Zod em 100% dos endpoints. Respostas padronizadas: { success: boolean, data?: T, error?: { code, message } }. Middleware global de exceções sem vazar stack trace ao cliente. Separe rotas, serviços e repositórios. Autenticação identifica o usuário; autorização valida cada recurso no servidor. Rate limit e limites de payload em rotas públicas. Secrets só no ambiente do servidor.",
  },
  {
    id: "fs-be-02",
    domain: "Backend Enterprise",
    title: "APIs Python com FastAPI e Pydantic v2",
    keywords: ["fastapi", "pydantic", "python api", "async", "typevar", "annotated"],
    content:
      "Padrão Python preferencial: FastAPI com Pydantic v2 para schemas de I/O. Tipagem estrita (TypeVar, Annotated, Union, Optional) em funções públicas. Async/await para I/O e conexões de banco. Dependências injetadas para auth e sessão de DB. Documentação OpenAPI gerada a partir dos schemas. Testes com TestClient/httpx. Não misture lógica de negócio em routers finos — use services.",
  },
  {
    id: "fs-db-01",
    domain: "Banco de Dados",
    title: "Modelagem relacional profissional e migrations",
    keywords: ["postgres", "uuid", "ulid", "migration", "foreign key", "índice", "drizzle", "prisma", "sql"],
    content:
      "Chaves primárias UUIDv4 ou ULID. Foreign keys com ON DELETE CASCADE ou SET NULL explícitos. Índices nas colunas filtradas e ordenadas. Migrations determinísticas e versionadas no repositório (nunca só no painel). RLS quando multi-tenant. Evite N+1; use joins ou loaders. Soft-delete só com política clara de unicidade e consultas. Toda mudança de schema é aditiva em produção até haver plano de backfill.",
  },
  {
    id: "fs-fe-01",
    domain: "Frontend de Alto Impacto",
    title: "Semântica HTML5, a11y e design system",
    keywords: ["acessibilidade", "wcag", "html5", "design system", "tokens", "aria", "semântica"],
    content:
      "Use elementos HTML5 semânticos (main, article, section, header, nav). Conformidade WCAG 2.1 AA: contraste, labels em formulários, aria quando o HTML semântico não basta, foco visível. Design system com tokens de cor, tipografia e sombra em CSS variables. Evite estilos mágicos espalhados. Componentes reutilizáveis com estados explícitos.",
  },
  {
    id: "fs-fe-02",
    domain: "Frontend de Alto Impacto",
    title: "Estados de UI: loading, empty, error, success",
    keywords: ["skeleton", "loading", "empty state", "error state", "toast", "sonner", "ux"],
    content:
      "Toda tela de dados precisa de: Loading (skeleton/spinner), Empty state acionável, Error state com retentativa, Success feedback (toast/Sonner) para ações mutáveis. Não deixe a UI em branco durante fetch. Evite layout shift. Formulários: validação visível, disable durante submit, mensagens de erro por campo. Mobile-first e áreas de toque adequadas.",
  },
  {
    id: "fs-ops-01",
    domain: "Protocolo Operacional",
    title: "Modos CHAT, PLANEJAR e CRIAR",
    keywords: ["modo chat", "modo planejar", "modo criar", "propose_plan", "aprovação", "autônomo"],
    content:
      "MODO CHAT: 100% consultivo — análise, schemas, orientação; não grava arquivos nem chama propose_plan. MODO PLANEJAR: inspeção read-only e propose_plan com botão Criar; não grava neste modo. MODO CRIAR: execução autônoma — implementa camadas, prefere patch_file, busca no código, valida com checks/CI quando disponível, auto-corrige erros de compilação/teste e só então entrega o resumo. Nunca invente sucesso de build.",
  },
  {
    id: "fs-ops-02",
    domain: "Protocolo Operacional",
    title: "Self-healing com compilador e testes reais",
    keywords: ["self-healing", "auto-cura", "compilador", "tsc", "testes", "linter", "runner", "sandbox"],
    content:
      "O agente não deve declarar a tarefa concluída enquanto erros conhecidos de compilação/teste permanecerem sem tentativa de correção. Fluxo: planejar → gravar (patch preferencial) → run_project_checks/CI → se falhar, ler erro → patch → repetir. Sem runner configurado, seja explícito sobre a validação pendente. Ferramentas cirúrgicas (patch_file, search_codebase) reduzem reescrita total e perda de código. run_shell_command/run_project_checks só via sandbox com limites de CPU/memória/timeout.",
  },
  {
    id: "fs-ops-03",
    domain: "Protocolo Operacional",
    title: "Ferramentas cirúrgicas patch_file e search_codebase",
    keywords: ["patch_file", "search_codebase", "diff", "regex", "refatoração", "símbolo"],
    content:
      "patch_file substitui blocos com âncora textual única (old_text → new_text), preservando o restante do arquivo e economizando tokens versus write_file total. Se a âncora for ambígua ou ausente, amplie o contexto ou releia o arquivo. search_codebase mapeia símbolos, rotas e chamadas por regex em múltiplos arquivos antes de editar. Use search → read → patch como circuito padrão de refatoração segura.",
  },
];

export function getFullstackKnowledge(): KnowledgeEntry[] {
  return FULLSTACK_KNOWLEDGE;
}

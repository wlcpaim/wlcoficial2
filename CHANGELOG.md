## 0.17.0+cognitive-reliability.1

### Improved — Cognitive Reliability
- Índice BM25-like pré-computado para reduzir trabalho repetido durante a recuperação de conhecimento.
- Confiança heurística passa a considerar força de correspondência e confiabilidade das evidências, não volume bruto de evidências.
- Limites de recuperação tratados defensivamente; testes para evidências fracas, estabilidade e limites inválidos.
- `.env.example` criado e `.gitignore` endurecido para não distribuir arquivos de ambiente reais.
- Relatório técnico: `WLC_IA_EVOLUTION_REPORT_0.17.0.md`.

### Validation
- TypeScript direcionado, smoke tests cognitivos, runtime tests (8/8) e verificação de sintaxe do runtime aprovados.
- Vitest completo, lint e build pendentes por ausência de dependências instaladas no ambiente de atualização.

## 0.16.0+creation-intelligence-v2.1

### Added — Creation Intelligence v2 (chat de criação profissional)
- Novo `src/lib/wlc-creation-intelligence-v2.ts`:
  - `isCreationRequest` (imperativos e necessidades; ignora dúvidas/bugs)
  - `scoreDomains` / `analyzeCreation`: 18 domínios com pontuação ponderada (primário + secundários)
  - Blueprint: entidades+campos, invariantes de negócio, máquinas de estado, permissões, casos de borda, KPIs, "nunca fingir"
  - Requisitos explícitos, restrições e suposições declaradas; complexidade 0–100 e escopo MVP/Núcleo/Depois
  - Fases com portões de verificação; `buildCreationProtocol` por modo (Planejar/Criar)
  - `auditGeneratedFiles`: auditoria de código gerado (botões falsos, dados inventados, XSS, segredos, a11y, estados loading/vazio/erro, etc.) com nota A–F
  - `buildAuditSelfReviewPrompt`: autocorreção forçada antes do resumo final (até 2 rodadas)
- `agent.server.ts`: blueprint v2 no contexto de criação, protocolo por modo, rastreio de arquivos gravados, portão de auditoria no modo Criar e linha de auditoria no "Status verificado".
- Testes: `src/test/wlc-creation-intelligence-v2.test.ts`. Doc: `WLC_IA_CREATION_INTELLIGENCE_V2.md`.

### Changed
- O contexto v1 (`wlc-project-creation-intelligence.ts`) deixa de ser injetado; o arquivo e seus testes permanecem.

## 0.15.0+engineering-intelligence-core.1

### Added — Autonomous Engineering Intelligence Core v1
Deterministic control plane for long-running engineering sessions (complements Cognitive Orchestrator Pro):

| Module | Role |
|--------|------|
| `wlc-task-state-machine.ts` | Lifecycle CREATED→…→COMPLETED with valid transitions; blocks COMPLETED without VERIFY; oscillation detect |
| `wlc-loop-detection.ts` | Action fingerprints; hard-block identical failures / no-progress rewrites |
| `wlc-failure-intelligence.ts` | Failure taxonomy + strategy change after repeated same error |
| `wlc-engineering-memory.ts` | Layered session memory with provenance & invalidation |
| `wlc-evidence-system.ts` | Evidence gate: cannot claim build/test success without VERIFIED artifacts |
| `wlc-checkpoint-intelligence.ts` | Compact checkpoint + stale validation vs file signals |
| `wlc-progress-intelligence.ts` | False-progress detection (tools/files ≠ requirements) |
| `wlc-engineering-intelligence-core.ts` | Facade + adaptive plan + prompt context |

- Wired into `agent.server.ts` system context (`formatEngineeringIntelligenceContext`).
- Tests: `src/test/wlc-engineering-intelligence-core.test.ts`.

### Design notes
- Does **not** replace the LLM; constrains loops, evidence, and state.
- Reuses existing OperationLedger / OrchestratorStatus; does not duplicate agent runtime.
- Smoke-tested: state guards, loop hard-block, evidence gate, checkpoint stale, false progress.

## 0.14.0+cognitive-orchestrator-pro.1

### Added — Cognitive Orchestrator Pro (motor mais profissional e inteligente)
- Novo módulo `src/lib/wlc-cognitive-orchestrator-pro.ts`:
  - Scoring multi-sinal de intenção (não first-match simples)
  - Detecção de continuidade: follow-up, continuation, correction, restart, **loop_suspected**
  - Política de engenharia profissional embutida:
    - incremental only (anti reescrita de App)
    - dados reais only (anti métricas inventadas)
    - operações de domínio atômicas (venda/estoque/caixa)
    - verificação honesta (só declarar teste após executar)
    - preferir checkpoint a restart
  - Anti-padrões detectados e condições de parada explícitas
  - `formatProCognitiveContext` injetado no system prompt do agente
- `buildAntiLoopEngineeringPolicy` em `wlc-professional-engineering.ts` (integridade comercial + PDV)
- Integração real em `agent.server.ts` (pro decision + log estruturado)
- Testes: `src/test/wlc-cognitive-orchestrator-pro.test.ts`

### Why
Evita o modo de falha observado em execuções longas (recomeçar App, inventar %, declarar pronto sem evidência) e eleva o motor a um orquestrador determinístico mais profissional.

## 0.13.2+gemini-byok.1

### Fixed — Conectar Gemini free
- **Configurações**: seção para cadastrar, testar, definir principal e remover chave do Google AI Studio.
- Agente em modo **Gemini-first**: usa a chave do usuário; **não** cai na reserva Lovable (evita HTTP 402).
- Sem chave cadastrada: mensagem clara pedindo configuração em Configurações + checkpoint salvo.
- Link direto para obter chave gratuita: https://aistudio.google.com/app/apikey

## 0.13.1+autonomous-lovable.1

### Changed — Modo autônomo (somente motor Lovable)
- Agente passa a usar **exclusivamente** o gateway Lovable (`ai.gateway.lovable.dev` + `LOVABLE_API_KEY`).
- Seleção de chaves Gemini e Vercel do usuário **desativada** no fluxo de execução (`AUTONOMOUS_ONLY = true`).
- Mensagens de erro HTTP 402/429 reescritas: explicam cota da plataforma e que o checkpoint foi salvo; não pedem mais chave Gemini.
- Settings: seção “Motor de IA (modo autônomo)” documentando o comportamento.
- `models.ts`: `AUTONOMOUS_MODEL` / `DEFAULT_CHAT_MODEL = "builtin"`.

### Honestidade técnica
- O motor cognitivo (knowledge, design DNA, tools) continua no WLC.IA; a geração de linguagem ainda passa pelo gateway da plataforma Lovable.
- Sem créditos Lovable (402) a execução pausa com checkpoint — não há LLM offline local neste release.

## 0.13.0+cognitive-core.1

### Added — Cognitive Core Evolution (Adaptive Intelligence)
- `src/lib/wlc-adaptive-knowledge-engine.ts`: conhecimento estruturado com metadados (categoria, confiança, validação, fontes, exemplos), detecção de duplicatas, lacunas e retrieval ranking.
- `src/lib/wlc-creative-engineering-engine.ts`: geração de múltiplos conceitos de desenvolvimento, scoring multi-eixo e seleção fundamentada (evita sempre o mesmo layout/template).
- `src/lib/wlc-design-dna.ts`: Design DNA Generator — paleta, tipografia, spacing, radius, motion, ícones e tokens CSS por personalidade visual (minimalista, futurista, editorial, enterprise, etc.).
- `src/lib/wlc-technology-radar.ts`: matriz comparativa de tecnologias (adopt/trial/assess) com vantagens, desvantagens, casos de uso e recomendações proporcionais.
- Integração real no `agent.server.ts`: Adaptive Knowledge, Technology Radar, Creative Plan e Design DNA injetados no contexto do agente quando o pedido é de desenvolvimento.
- Testes: `wlc-adaptive-knowledge-engine.test.ts`, `wlc-design-dna.test.ts`, `wlc-creative-engineering-engine.test.ts`, `wlc-technology-radar.test.ts`.

### Notes
- Não treina pesos do modelo. Não inventa resultados de pesquisa externa. Trabalha com conhecimento curado/local e declara limitações.
- Preserva módulos e fluxos existentes (knowledge base lexical, design intelligence, professional engineering, orchestrator, tools).
- Versão do núcleo cognitivo evolutiva; compatível com a base 0.12.x.

## 0.12.0+design-systems.1

### Added
- Domínio **Design Profissional** + Tailwind CSS, Bootstrap, Bulma, Pico CSS
- `src/lib/design-systems-knowledge.ts` (18 entradas)
- Checklist de entrega visual harmoniosa e moderna
- Boost de retrieval para queries de UI/design/frameworks CSS
- Core knowledge `3.1.0-design-systems`

## 0.12.0+v3.cognitive.1

### Added — WLC.IA v3 Cognitive Engine
- Self-healing protocol + modo Criar reforçado
- Tools: search_codebase, patch_file, run_project_checks
- toolsForMode (Chat / Planejar / Criar)
- Knowledge matrix full-stack
- Testes agent-surgical-tools
- WLC_IA_V3_COGNITIVE_ENGINE.md

## 0.12.0+game-studio.1

### Added
- Domínio **Game Studio** completo (`src/lib/game-studio-knowledge.ts`) — criação de jogos web, física/matemática de games, mecânica profissional, engenharia de plataforma
- Posicionamento competitivo vs Replit / Lovable / Vercel
- Workflow para construir jogos StreetRace-class **melhores**, não iguais
- `knowledge/game-studio-v1/README.md`
- Boost de retrieval para intents de game studio
- Core knowledge version `2.7.0-game-studio` (inclui StreetRace + Game Studio)

## 0.12.0+streetrace.1

### Added
- Domínio de conhecimento **StreetRace** (18 entradas) em `src/lib/streetrace-knowledge.ts`
- Merge em `WLC_CORE_KNOWLEDGE` (versão `2.6.0-streetrace`)
- Boost de retrieval para queries de moto/racha/oficina/NEXUS/RealGear
- `knowledge/streetrace-v1/README.md`

# Changelog

## 0.11.0 — Professional Engineering Intelligence

- Added a versioned engineering intelligence module for modern language/stack selection, modular architecture, strict typing, runtime validation, secure APIs, and safe scripts.
- Added practical frontend guidance for design systems, responsive layouts, accessible modals/dialogs/drawers, alerts, confirmations, toasts, focus management, and asynchronous UI states.
- Added an evidence-based engineering readiness gate; missing or failed critical security/runtime-validation evidence blocks approval.
- Integrated the new context into the real agent prompt only for development-related requests.
- Expanded the retrievable WLC knowledge base to v2.5.0 with curated entries on modern stacks, architecture, TypeScript, overlays, feedback, responsive UI, Python, testing, security, and progressive learning.
- Added focused tests for readiness scoring, critical blockers, and contextual guidance.
- No database schema or migration was changed; no model-weight training is claimed.

## 0.10.0 — Design Intelligence & Progressive Engineering

- Added seven curated design-engineering knowledge entries to the shared WLC knowledge base, making them available to the existing lexical and semantic retrieval paths.
- Added a deterministic design quality gate covering tokens, spacing, typography, hierarchy, responsive layout, accessibility, interaction states and consistency.
- Added a reusable design context with spacing and viewport baselines, evidence requirements and preservation rules for existing projects.
- Added automated tests for design evidence scoring and design guidance.
- Kept learning evidence-based: reusable knowledge is curated and versioned; no claim is made that model weights train or change automatically.

# Changelog

## 0.9.3 — hardening de engenharia e empacotamento

- Adicionado comando explícito de verificação de tipos TypeScript (`typecheck`).
- Adicionados testes nativos do runtime Node (`test:runtime`) e verificação de sintaxe dos módulos de execução (`check:runtime`).
- Adicionado comando agregado `check` para executar as verificações locais em sequência.
- Ampliado `.env.example` para documentar as variáveis do frontend, servidor, migrações, runner e worker.
- Removido o arquivo `.env` local do pacote e reforçadas as regras de exclusão de arquivos de ambiente.
- Mantidas as configurações de TypeScript estrito e a política fail-closed do executor autônomo.

v0.9.2 — Sovereign Builder Stage 6 Alpha (2026-11-19)

- Adopted official Stage 6+ directive: Independent Autonomous Software Factory (Sovereign Builder).
- Requirement Compiler: deterministic NL → formal requirements, risk classification, stack suggestion, approval flags.
- Evidence Package: mandatory auditable proof (typecheck + unit_test + build) before COMPLETED.
- Trusted Workspace Executor contract with Docker sandbox adapter; refuses to claim success without runner.
- Orchestrator integrates compiler + evidence gate; high-risk capabilities force human approval path.
- Tests: `wlc-sovereign-builder-stage6.test.ts` + updated orchestrator alpha suite.
- Document: `WLC_IA_SOVEREIGN_BUILDER_STAGE_6.md` and updated Orchestrator Alpha guide.
- Still deferred: browser acceptance, expanded SaaS/tenancy templates, multi-provider gateway.


## v0.9.1 — Autonomous Orchestrator 2.0 Alpha (2026-11-19)

- Introduced WLC Autonomous Orchestrator as the central controller of engineering operations.
- Built on top of the existing Autonomous Development Core (not a separate agent).
- Added typed execution lifecycle with validated state transitions (RECEIVED → … → COMPLETED/FAILED/CANCELLED).
- Implemented the five fundamental policy rules (plan required, sensitive ops authorization, evidence-based completion, checkpoint integrity on resume, workspace boundary).
- Added `src/lib/orchestrator/` (types, schemas, server controller) and focused Vitest suite.
- Documentation: `WLC_IA_AUTONOMOUS_ORCHESTRATOR_2_ALPHA.md`.
- Limitations of Alpha: in-memory execution state, no new worker adapters, no UI surface yet.


# Evolution Stage 5.3 — Engineering Quality Gate\n- Added evidence-based multidisciplinary quality rubric and human-approved learning proposals.\n- Integrated quality protocol into agent context.\n\n## v0.9.0 — Advanced Cognitive Intelligence (2026-11-19)

- Added deterministic BM25-like retrieval over the curated WLC knowledge base, with stable ranking and relevance scores.
- Added auditable cognitive assessment: confidence heuristic, risk-aware strategy, evidence metadata validation, warnings, and human-review recommendation.
- High-risk intents are marked approval-gated; this context signal does not replace server-side authorization.
- Added conservative strategy recommendation from explicit outcome history, requiring minimum sample sizes and without changing model weights.
- Integrated the advanced assessment into the server agent context and structured cognitive telemetry.
- Added six focused Vitest cases and a validation report.
- Limitations: no embedding model, no persistent outcome store, no calibrated confidence, and no autonomous model training.

## v0.8 — Social Cognition & Conversation Engine
- Added context-aware social/conversational intent signals and guidance for natural responses, emotional-support tone, research, clarifications, and follow-up continuity.
- Integrated social cognition with the agent system context and structured cognitive logs.
- Added focused unit tests; heuristic estimates are explicitly tentative and do not claim model training or long-term memory.

## 2026-11-19 — Validation Gate

- Added evidence-based task completion gate to the v0.7 autonomous development core.
- Completion now requires each named check to have a unique passed result, exit code 0, and non-empty evidence. Legacy validation summaries cannot mark a session completed without gate evidence.
- Missing, failed, ambiguous, or unrun checks block completion; session status can be updated through the gate integration.
- Added unit tests covering positive and negative gate scenarios.

# WLC.IA Studio — Changelog\n\n## 0.3.0 — manutenção segura\n- Padronização de marca em documentação e interface para WLC.IA.\n- Logger estruturado com níveis e sanitização de dados sensíveis.\n- Captura de erros do servidor/middleware integrada ao logger.\n- Compatibilidade mantida para o marcador legado do console do preview.\n\n
## 2026-11-19 — WLC.IA v.02 / Knowledge Core v1.1

- Expandida a base contextual com Matemática, Física e desenvolvimento web.
- Adicionadas diretrizes didáticas para resolução de exercícios e orientação de projetos web.
- Criada calculadora determinística restrita, sem `eval`, e registrada como ferramenta do agente.
- Adicionados testes unitários para calculadora, recuperação de conhecimento e fórmulas físicas.
- Corrigido o caminho do chat WLC.IA para usar o agente conversacional/tool loop; scanner estático separado, em vez de interceptar toda mensagem.
- Documentadas limitações: recuperação lexical, não treinamento de modelo, sem conversão automática de unidades.
## WLC.IA Core Knowledge v1 — 2026-11-19

- Introduz base inicial de conhecimento curado em português para inteligência de agentes, raciocínio, planejamento, conversação, ferramentas, memória, confiabilidade, avaliação, desenvolvimento, pesquisa, segurança, comunicação e feedback.
- Adiciona recuperação lexical local, determinística, sem API externa ou embedding obrigatório.
- Injeta até quatro registros relevantes por solicitação no contexto do agente.
- Reforça prompt cognitivo para escolha adaptativa entre responder, esclarecer, analisar, planejar, pesquisar, agir, avaliar e replanejar.
- Inclui testes unitários para cobertura, recuperação e formatação do contexto.

# WLC.IA — Histórico de atualizações

## v.01 — 2026-11-18

### Adicionado
- Histórico de versões em Configurações com resumo, listas de alterações e arquivos modificados.
- Explorador de código com destaque de sintaxe, numeração de linhas e painel de leitura.
- Indicador de estado WLC.IA no cabeçalho do chat (pronta / trabalhando).

### Alterado
- Login Google agora utiliza `supabase.auth.signInWithOAuth` diretamente.
- Identidade da tela de login, chat e metadados alinhada ao WLC.IA.
- Campos apresentados como `Projeto (opcional)` e `Nome do chat (opcional)`.
- Rótulo do mecanismo WLC.IA simplificado para `WLC.IA`.

### Removido
- Botão e chamada de autenticação OAuth com Lovable na tela de login.

### Arquivos modificados
- `src/routes/auth.tsx`
- `src/routes/_authenticated/settings.tsx`
- `src/routes/_authenticated/chat.index.tsx`
- `src/routes/_authenticated/chat.$id.tsx`
- `src/components/studio/AppShell.tsx`
- `src/components/studio/nav.ts`
- `src/lib/agent.server.ts`
- `src/styles.css`
- `CHANGELOG.md`
- `VERSION`
- `public/updates/v.01.patch` (patch detalhado)

### Observações de validação
- Supabase e banco de dados não foram alterados.
- OAuth Google requer que o provedor Google esteja habilitado e que as URLs de retorno estejam configuradas no Supabase.
- Esta atualização de interface não constitui a implementação do Cognitive Engine autônomo.
- Build e testes precisam ser executados em ambiente com dependências instaladas.

## v0.4 — Cognitive Orchestrator (2026-11-19)

- Added deterministic request-intent, complexity and risk assessment.
- Added adaptive plan/action recommendations as model context.
- Added structured cognitive assessment telemetry.
- Added unit tests for chat, math, development, risk and prompt formatting.
- No database migrations or provider changes.

## 0.5.0 — Developer Knowledge Expansion / Cognitive Engineering

- Expandida a base recuperável com 17 áreas de engenharia profissional: HTML semântico, CSS responsivo, JavaScript, TypeScript strict, React, arquitetura modular, APIs/backend, banco de dados, segurança, testes, debugging, Git/CI/CD, performance, UX de SaaS, automação, sistemas de IA e code review.
- Atualizada a versão do Knowledge Core para 2.0.0.
- Modo de desenvolvimento reforçado com workflow de engenharia: requisitos, inspeção, arquitetura, implementação ponta a ponta, revisão de segurança/UX e validação baseada em evidências.
- Planejamento cognitivo específico para desenvolvimento e debugging, incluindo critérios de aceite, revisão e regressão.
- Adicionados testes de recuperação para os domínios avançados e plano de desenvolvimento complexo.
- Documentada a fronteira entre conhecimento recuperado e capacidades reais de modelo/ferramentas.

## 2026-11-19 — Autonomous engineering hardening V1

- Added server-side path and branch validation for agent write operations.
- Blocked direct agent changes to environment secrets, credentials, private keys, CI workflows, dependency manifests/lockfiles, and Supabase migrations pending human review.
- Added a 1 MB per-file write limit and made post-write verification failure explicit in tool results.
- Strengthened log scrubbing for free-text tokens, authorization values, and Error stack traces.
- Added a reliability migration for plan/job ownership consistency, stale worker recovery, exhausted-attempt handling, worker heartbeat leases, and fenced job finalization.
- Added focused safety and logger regression tests.
- Background worker, full approval UI/workflow, live event UI, sandboxed builds, and production deployment remain separate implementation/deployment tasks; see `WLC_IA_HARDENING_V1.md`.

## WLC.IA Evolution V2 — 2026-11-19

- Added a persisted execution timeline to authenticated chat views.
- Added Supabase Realtime subscription for `agent_events`, with polling fallback and reconnection-safe refresh behavior.
- Routed event inserts through the server-only service-role client because authenticated users intentionally have read-only RLS access to the event stream.
- Added a migration to register `agent_events` in the `supabase_realtime` publication when available.
- Added deployment and security-boundary documentation in `WLC_IA_EVOLUTION_V2.md`.

Runtime tests and production build remain deployment checks; dependencies and a development Supabase project are required.

## 2026-11-19 — V3 approval control plane
- Added hash-bound, owner-checked RPCs for approving/rejecting agent plans.
- Approval atomically queues a durable job; added authenticated server functions and a review panel on Tasks.
- Worker execution remains intentionally disabled/not implemented in this release.

## [V4] - 2026-11-19
- Otimização do loop de ferramentas: operações estritamente somente-leitura agora são agrupadas em lotes concorrentes (`Promise.all`).
- Operações de escrita e mutações continuam serializadas para preservar ordem de commits, consistência do estado e gates de segurança.
- Mantidos o limite de etapas, checkpoints, failover de provedores e heartbeat existentes; esta versão não declara worker durável.

## Stage 5 — Autonomous Software Factory & Developer V2
- Added adaptive software-engineering backlog generation for websites, SaaS, Supabase, Telegram, APIs, debugging, testing, and deployment.
- Integrated evidence-gated autonomous debugging and explicit approval gates into the agent context.
- Added focused tests and Stage 5 engineering documentation. This is an orchestration/intelligence increment; a trusted real project executor and browser automation remain separate required work.
\n\n## Stage 5.2 — Specialist Academy\n- Added 12 retrieval-ready professional specialist profiles across software architecture, frontend, web design, backend, data engineering, databases, DevOps/SRE, security, QA, AI engineering, product UX and integrations.\n- Added five instructional competency levels from foundations to principal/professor.\n- Integrated request-aware specialist context into the existing agent knowledge assembly.\n- Added focused Vitest coverage and documented that retrieval is not model-weight training or an academic credential.\n

## 0.12.0 — Autonomous Intelligence
- Added adaptive autonomy assessment (intent, risk, complexity and verification needs).
- Integrated a professional end-to-end engineering protocol into agent context.
- Added explicit safety boundaries for deployments, destructive operations, credentials, costs and external actions.
- Improved evidence-based completion, tool honesty, adaptive planning and review requirements.
- Preserved the existing architecture and tool permissions; this update does not create new execution privileges.

## 0.15.0+project-creation-intelligence.1

### Added — Project Creation Intelligence v1
- Domain-aware product brief suggestions for PDV, fintech, ecommerce, SaaS, CRM, dashboards, admin, portfolio, games, booking and social apps.
- Candidate functional modules, workflows, entities, routes, acceptance criteria, risks and design direction are added to creation-oriented prompt context.
- Explicitly distinguishes heuristic candidates from confirmed scope to reduce generic or overbuilt project generation.
- Integrated with the existing Creative Engineering and Design DNA pipeline without replacing those modules.
- Added targeted tests for PDV, ecommerce, ambiguity and prompt formatting.

# Evolução da WLC.IA — Diagnóstico e plano

## Diagnóstico (Fase 1)
| Área | Já existe | Limitação |
|---|---|---|
| Inteligência | cognitive-engine, intelligence-core, engineering-planner, specialist-academy, quality-gate | 6 testes de redação falhando (vieram no arquivo) |
| Repositórios | GitHub: criar, ler, gravar, branches, CI, diff; presets e Genesis | Sem análise técnica estruturada do repositório |
| Agente | Ferramentas reais no GitHub, trava por chat, relatório de conclusão | Não executa código |
| Orquestrador | Máquina de estados RECEIVED→COMPLETED, compilador de requisitos, pacote de evidências, executor que recusa rodar sem sandbox | Sem estados de ambiente |
| Preview | iframe isolado com HTML estático do GitHub | Não roda apps com build |
| Deploy | Verifica commit + CI, health check, rollback entre registros | Hospedagem fica no provedor do usuário |
| Runtime | `runtime/worker.mjs`, docker-sandbox | Worker precisa de chave de servidor indisponível no Lovable Cloud |

Restrição central: o servidor da WLC roda em Cloudflare Workers e não pode executar código de usuário. Execução real exige um provedor externo de sandbox (Daytona, E2B, containers próprios) conectado por adaptador.

## Módulos novos (`src/lib/environment/`)
- `project-analyzer.ts` — Project Analyzer: linguagens, gerenciador (respeita lockfile), comandos, frameworks, bancos, migrations, variáveis, runtime, avisos.
- `environment-state.ts` — Execution State Manager: queued→…→preview_ready→deploying→deployed, failed/stopped, etapas com horário/resultado/erro, retomada sem refazer etapas.
- `sandbox-adapter.ts` — contrato do Sandbox Adapter, validação de comandos, limites, adaptador "aguardando configuração".

## Próximas fases
2. ✅ Inteligência: ligar o analyzer ao contexto do agente (ferramenta `analyze_repository`).
3. ✅ Repositórios: análise automática ao criar/importar/sincronizar, salva em `repositories.analysis`.

4. Runtime: tabelas `environments`/`environment_steps` com RLS, primeiro adaptador real (requer chave do provedor).
5. Dependências e banco isolado por ambiente.
6. Preview real com URL verificada por HTTP.
7. Testes no sandbox com ciclo de correção.
8. Deploy por adaptadores de provedor, produção só com aprovação.
9. Interface com linha do tempo e cenários A–E.

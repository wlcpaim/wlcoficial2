# WLC.IA — Ambiente de desenvolvimento

Plataforma web para organizar projetos, conversar com a inteligência integrada, conectar repositórios GitHub, revisar arquivos, registrar alterações e visualizar previews isolados.

> A documentação descreve o estado do código deste repositório e não presume funcionalidades futuras como concluídas.

## Funcionalidades presentes

- Autenticação e sessão via Supabase.
- Conexões com GitHub e gerenciamento de repositórios importados.
- Criação de repositórios com presets iniciais (WLC.IA e Starter).
- Chats vinculados a projetos e repositórios.
- Inteligência integrada com ferramentas para leitura e gravação autorizada de arquivos, checkpoints e tarefas.
- Núcleo cognitivo inicial com instruções de conversação, decisão contextual, uso responsável de ferramentas e avaliação.
- Base de conhecimento WLC.IA Core v1 com recuperação lexical contextual, sem dependência de embeddings ou API adicional.
- Registro de auditoria, histórico e memória de projetos.
- Preview de HTML de entrada isolado em iframe, com console e opção de abrir em uma guia própria.
- Fluxos de publicação/deploy, status, health-check e rollback.
- Interface responsiva com navegação desktop e mobile.

## Tecnologias

- React 19, TypeScript e TanStack Start/Router.
- Vite, Tailwind CSS e componentes Radix.
- Supabase Auth e banco de dados.
- GitHub API para repositórios e commits.
- Vitest e Testing Library.

## Estrutura

- `src/routes/`: rotas e telas.
- `src/components/`: componentes compartilhados.
- `src/lib/`: serviços, agente, engine, GitHub, preview e geração de projetos.
- `src/integrations/`: integrações.
- `src/test/`: testes automatizados.
- `knowledge/wlc-core-v1/`: documentação e princípios para expansão da base de conhecimento.
- `src/lib/wlc-knowledge-base.ts`: registros estruturados e recuperação contextual da base inicial.
- `presets/`: arquivos-base usados em projetos gerados.

## Desenvolvimento local

Requer Node.js compatível com o Vite e Bun (o lockfile e configurações estão preparados para Bun).

```bash
bun install
bun run dev
```

## Verificações

```bash
bun run check
bun run build
```

## Configuração

Configure as variáveis de ambiente da aplicação no ambiente de execução. Copie `.env.example` para `.env` e preencha apenas as variáveis necessárias. O arquivo `.env` é ignorado pelo Git e não deve ser distribuído; nunca exponha `SUPABASE_SERVICE_ROLE_KEY` ou `WLC_RUNNER_TOKEN` no frontend. As conexões de serviço são gerenciadas nas configurações da aplicação, conforme os recursos suportados.

## Criação de projetos

Na área de Repositórios, escolha Criar e selecione um preset. O preset WLC.IA gera um chat web responsivo, histórico de conversas no navegador e um painel de configuração de endpoint. A conexão com um serviço de IA externo precisa ser configurada; o preset não simula respostas de um modelo.

## Preview e publicação

O Preview busca os arquivos do repositório e apresenta HTML de entrada em iframe com sandbox. Projetos que dependem de build podem não renderizar completamente no Preview estático. A opção de nova guia mantém a página dentro de um iframe sandbox. O Deploy existente realiza verificações de commit/CI e health-check da URL informada; ele não é um serviço de build ou hospedagem universal.

## Limitações atuais

- A engine de análise estática tem regras e limites explícitos; seus achados não são prova de vulnerabilidade.
- A execução de código do projeto não ocorre dentro deste ambiente; resultados de CI são consultados quando disponíveis.
- A conexão de IA do preset gerado depende de um endpoint configurado pelo usuário.
- Preview estático não substitui o build completo de frameworks.

## Segurança

Não mantenha tokens ou segredos em arquivos versionados. A autorização de escrita em repositórios e as credenciais de integração devem permanecer sob os controles da aplicação.

## WLC.IA Core Knowledge v1

A primeira base de conhecimento cobre agentes, raciocínio, planejamento adaptativo, conversação, ferramentas, memória, confiabilidade, avaliação, engenharia de software, pesquisa, segurança, comunicação e feedback. A recuperação é lexical e local: seleciona os registros mais relevantes para a mensagem e injeta o conteúdo recuperado no contexto do agente. Isso melhora o contexto de execução, mas não altera os pesos do modelo de IA conectado. Consulte `knowledge/wlc-core-v1/README.md`.

## WLC.IA Knowledge Core v1.1

A base inicial agora inclui conhecimento recuperável de matemática, Física introdutória e desenvolvimento web (planejamento, HTML/CSS/JS/TS, React, UX responsiva, APIs, segurança, SEO, acessibilidade e qualidade). O agente possui uma ferramenta de cálculo determinístico para expressões numéricas básicas; ela não executa código arbitrário, trabalha com trigonometria em radianos e não faz conversão dimensional automática. A base é conhecimento curado, não treinamento dos pesos do modelo.

Consulte `WLC_IA_KNOWLEDGE_V1.1.md` para escopo e limitações.

## Diagnóstico e logs WLC.IA

O logger central está em `src/lib/wlc-logger.ts`. Ele registra eventos estruturados com timestamp, nível, módulo e detalhes sanitizados.

- `INFO`: eventos normais.
- `WARN`: situações anormais que não interrompem o fluxo.
- `ERROR`: falhas capturadas.
- `DEBUG`: detalhes adicionais somente em desenvolvimento.

Erros de middleware, servidor e captura global são encaminhados ao logger. Os detalhes são limitados e campos que aparentam conter tokens, segredos, senhas, cookies ou chaves são ocultados. O logger mantém uma janela recente em memória (até 100 eventos); não é um armazenamento persistente nem substitui monitoramento externo.

## WLC.IA Developer Knowledge v2.0

A base cognitiva agora possui conteúdo recuperável de engenharia full-stack profissional: HTML semântico e acessibilidade, CSS responsivo/design systems, JavaScript e TypeScript, React, arquitetura modular, APIs/backend, PostgreSQL/modelagem, segurança OWASP, testes, debugging, CI/CD, performance, UX/SaaS, automação/scripts, agentes de IA e code review. Para tarefas de desenvolvimento, o agente recebe um workflow orientado a requisitos, inspeção de contexto, arquitetura proporcional, implementação ponta a ponta, revisão e validação de evidências. Esse conteúdo melhora instruções e contexto, mas não altera os pesos do modelo conectado nem cria ferramentas de execução que não estejam disponíveis. Consulte `WLC_IA_DEVELOPER_KNOWLEDGE_V2.md`.


## Cognitive Engine v0.7 — Autonomous Development Core

See `WLC_IA_AUTONOMOUS_DEVELOPMENT_CORE_V0.7.md` for task orchestration, multi-file safety checks, checkpoints, bounded repair and validation adapter design. The engine is adapter-based and does not enable arbitrary shell execution by default.


## Qualidade e verificação

- `bun run typecheck`: validação estática TypeScript (`strict: true`).
- `bun run test:runtime`: testes Node nativos do worker/runner.
- `bun run check:runtime`: verificação de sintaxe dos módulos de runtime.
- `bun run check`: executa typecheck, lint, testes da aplicação, testes do runtime e sintaxe.
- `bun run build`: build de produção.

Consulte `ENGINEERING_UPGRADE_REPORT_0.9.3.md` para o escopo e as limitações desta atualização.


## WLC.IA Professional Engineering Intelligence v0.11.0

A inteligência de desenvolvimento inclui um playbook contextual para escolha de linguagens e frameworks, arquitetura modular, TypeScript estrito, validação em runtime, APIs seguras, scripts, design systems, responsividade, modais/drawers acessíveis, alertas, confirmações, toasts, testes e debugging. O playbook só é acrescentado ao contexto do agente em pedidos relacionados a desenvolvimento. A base recuperável foi ampliada para v2.5.0.

A avaliação de prontidão exige evidências verificáveis; ausência ou falha de evidência crítica de segurança/validação impede aprovação. A evolução ocorre por código, ferramentas, contexto e conhecimento curado versionado, não por treinamento automático dos pesos do modelo. Consulte `WLC_IA_EVOLUTION_REPORT_0.11.0.md`.


## WLC.IA Cognitive Reliability 0.17.0

A recuperação cognitiva agora mantém um índice lexical pré-computado e a confiança heurística considera a qualidade/confiabilidade das evidências, não apenas sua quantidade. Limites inválidos de recuperação são tratados defensivamente. Consulte `WLC_IA_EVOLUTION_REPORT_0.17.0.md`.

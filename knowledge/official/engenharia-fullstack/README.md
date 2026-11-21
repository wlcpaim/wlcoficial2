# Engenharia Fullstack & Arquitetura Web

Arquitetura, APIs, banco de dados, segurança e boas práticas de engenharia.

## Regras
- Separar lógica de servidor do cliente; segredos nunca chegam ao navegador.
- Toda tabela de usuário é protegida por RLS com user_id = auth.uid().
- Mudanças pequenas, testadas e com commit descritivo.

## Conceitos
### APIs TypeScript com Hono/Fastify e Zod
Padrão TypeScript preferencial: Hono ou Fastify com tipagem ponta a ponta. Valide payload e parâmetros de rota com Zod em 100% dos endpoints. Respostas padronizadas: { success: boolean, data?: T, error?: { code, message } }. Middleware global de exceções sem vazar stack trace ao cliente. Separe rotas, serviços e repositórios. Autenticação identifica o usuário; autorização valida cada recurso no servidor. Rate limit e limites de payload em rotas públicas. Secrets só no ambiente do servidor.

### APIs Python com FastAPI e Pydantic v2
Padrão Python preferencial: FastAPI com Pydantic v2 para schemas de I/O. Tipagem estrita (TypeVar, Annotated, Union, Optional) em funções públicas. Async/await para I/O e conexões de banco. Dependências injetadas para auth e sessão de DB. Documentação OpenAPI gerada a partir dos schemas. Testes com TestClient/httpx. Não misture lógica de negócio em routers finos — use services.

### Modelagem relacional profissional e migrations
Chaves primárias UUIDv4 ou ULID. Foreign keys com ON DELETE CASCADE ou SET NULL explícitos. Índices nas colunas filtradas e ordenadas. Migrations determinísticas e versionadas no repositório (nunca só no painel). RLS quando multi-tenant. Evite N+1; use joins ou loaders. Soft-delete só com política clara de unicidade e consultas. Toda mudança de schema é aditiva em produção até haver plano de backfill.

### Semântica HTML5, a11y e design system
Use elementos HTML5 semânticos (main, article, section, header, nav). Conformidade WCAG 2.1 AA: contraste, labels em formulários, aria quando o HTML semântico não basta, foco visível. Design system com tokens de cor, tipografia e sombra em CSS variables. Evite estilos mágicos espalhados. Componentes reutilizáveis com estados explícitos.

### Estados de UI: loading, empty, error, success
Toda tela de dados precisa de: Loading (skeleton/spinner), Empty state acionável, Error state com retentativa, Success feedback (toast/Sonner) para ações mutáveis. Não deixe a UI em branco durante fetch. Evite layout shift. Formulários: validação visível, disable durante submit, mensagens de erro por campo. Mobile-first e áreas de toque adequadas.

### Modos CHAT, PLANEJAR e CRIAR
MODO CHAT: 100% consultivo — análise, schemas, orientação; não grava arquivos nem chama propose_plan. MODO PLANEJAR: inspeção read-only e propose_plan com botão Criar; não grava neste modo. MODO CRIAR: execução autônoma — implementa camadas, prefere patch_file, busca no código, valida com checks/CI quando disponível, auto-corrige erros de compilação/teste e só então entrega o resumo. Nunca invente sucesso de build.

### Self-healing com compilador e testes reais
O agente não deve declarar a tarefa concluída enquanto erros conhecidos de compilação/teste permanecerem sem tentativa de correção. Fluxo: planejar → gravar (patch preferencial) → run_project_checks/CI → se falhar, ler erro → patch → repetir. Sem runner configurado, seja explícito sobre a validação pendente. Ferramentas cirúrgicas (patch_file, search_codebase) reduzem reescrita total e perda de código. run_shell_command/run_project_checks só via sandbox com limites de CPU/memória/timeout.

### Ferramentas cirúrgicas patch_file e search_codebase
patch_file substitui blocos com âncora textual única (old_text → new_text), preservando o restante do arquivo e economizando tokens versus write_file total. Se a âncora for ambígua ou ausente, amplie o contexto ou releia o arquivo. search_codebase mapeia símbolos, rotas e chamadas por regex em múltiplos arquivos antes de editar. Use search → read → patch como circuito padrão de refatoração segura.

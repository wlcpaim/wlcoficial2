# Relatório de evolução técnica — WLC.IA 0.9.3

## Escopo aplicado

Esta atualização foi aplicada sobre o projeto existente, preservando a arquitetura e os recursos já implementados. O pacote contém uma aplicação React 19/TypeScript com TanStack, integração Supabase, integração GitHub, serviços cognitivos, runtime Node separado e testes Vitest.

### Melhorias incluídas

1. **Verificação de tipos:** `npm run typecheck` executa `tsc --noEmit`. O projeto já possuía `strict: true`; essa configuração foi preservada.
2. **Verificação do runtime:** `npm run check:runtime` verifica a sintaxe dos módulos `.mjs`.
3. **Testes do runtime:** `npm run test:runtime` executa os testes nativos Node em `runtime/*.test.mjs`.
4. **Verificação agregada:** `npm run check` encadeia typecheck, lint, testes da aplicação, testes do runtime e checagem de sintaxe.
5. **Configuração de ambiente:** `.env.example` agora documenta as variáveis usadas pelo frontend, servidor Supabase, migrações, runner remoto e worker.
6. **Proteção de credenciais:** o `.env` local foi removido deste pacote e `.gitignore` passou a ignorar arquivos de ambiente, mantendo apenas `.env.example`.

## Arquitetura encontrada

- Frontend: React 19, TypeScript, TanStack Start/Router, Vite e Tailwind.
- Backend e serviços: funções server-side TanStack, Supabase e módulos de domínio em `src/lib`.
- Runtime autônomo: worker separado e runner Docker em `runtime/`.
- Persistência: Supabase/PostgreSQL e Drizzle Kit.
- Qualidade: Vitest, Testing Library e ESLint.

## Limitações identificadas que não foram mascaradas

- Não há código Python (`.py`) no repositório. Portanto, não foi adicionado `requirements.txt` artificial nem um serviço FastAPI sem requisito funcional.
- `drizzle/schema.ts` está vazio e há apenas uma migração SQL Drizzle no pacote. A modelagem real parece depender do banco Supabase; não foi inventado um schema que poderia divergir do banco em produção.
- O runtime autônomo exige um executor explicitamente aprovado e continua fail-closed quando ele não está configurado.
- O runner Docker é um serviço separado e requer implantação própria, HTTPS, token forte e Docker instalado.
- Não foi solicitada uma nova funcionalidade de produto específica; esta entrega concentra-se em segurança do pacote, comandos de qualidade e documentação operacional, sem alterar fluxos funcionais da aplicação.

## Validação desta entrega

O ambiente de preparação possui Node.js 22.16.0 e npm 10.9.2. A instalação de dependências foi tentada, mas excedeu o limite de execução disponível. Por esse motivo, não é correto declarar `typecheck`, build, lint ou testes da aplicação como aprovados nesta sessão.

Após instalar dependências em ambiente com acesso ao registry:

```bash
npm install
npm run check
npm run build
```

O projeto também mantém `bun.lock`; para seguir o gerenciador originalmente documentado:

```bash
bun install
bun run check
bun run build
```

## Configuração mínima

1. Copie `.env.example` para `.env`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` para o cliente.
3. Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` somente no ambiente server-side/worker.
4. Nunca publique `.env`, service-role keys ou `WLC_RUNNER_TOKEN`.
5. Execute `npm run dev` para desenvolvimento local.

## Próxima etapa recomendada

Para uma evolução funcional completa, definir a próxima capacidade do produto (por exemplo, execução de projetos ponta a ponta, editor de arquivos, deploy real ou gestão de agentes) e validar o schema Supabase de produção antes de criar migrações adicionais.

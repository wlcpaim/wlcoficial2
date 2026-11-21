# WLC.IA V0.1 — Atualização de Independência (UI + Fluxo)

Data: 2026-11-19

## Objetivo desta atualização

Reorganizar a interface e o fluxo principal para que a **WLC.IA** seja a inteligência única e independente, com foco em:

- Chat no estilo ChatGPT (Novo chat + Histórico)
- Escolha de repositório existente **ou** criação de novo ao iniciar o chat
- Workflows ao iniciar (analyze / debug / implement / review)
- Configuração mínima: **apenas GitHub**
- Menu WLC.IA profissional e autocontido
- Remoção da seleção de agente externo (Gemini / Vercel / modelos) do fluxo principal
- Preparação da camada local (`src/lib/local-WLC.IA.ts`) para futura independência total do Supabase

## O que mudou

### Navegação (`src/components/studio/nav.ts`)
- Foco em: Novo chat · Histórico · WLC.IA · Repositórios · Configurações
- Bottom nav mobile alinhado a esses itens
- Menus secundários (auditoria, memória, tarefas, etc.) removidos da navegação principal (rotas ainda existem no código)

### Novo chat (`src/routes/_authenticated/chat.index.tsx`)
- **WLC.IA é o único agente** — sem seletor de modelo externo
- UI destaca “WLC.IA · IA de código puro independente”
- Workflow obrigatório ao iniciar
- Fluxo de repositório: nenhum / criar novo / importar existente (inalterado e preservado)
- Mensagem inicial automática do workflow continua funcionando

### Configurações
- Mensagem clara: a única integração necessária é o GitHub
- Google AI Studio e Vercel deixam de ser o caminho principal

### Branding
- AppShell e títulos passam a enfatizar **WLC.IA**

### Camada local
- Novo arquivo `src/lib/local-WLC.IA.ts` para token/histórico em localStorage
- Base para a fase em que o próprio repositório + ZIP/estado local sejam o “banco de dados”

## O que NÃO foi removido (de propósito)

- Código Supabase, auth e server functions permanecem intactos para não quebrar o que já funciona.
- Rotas de APIs, auditoria, memória etc. ainda existem (apenas saíram do menu principal).
- O motor `WLC.IA-engine.server.ts` continua no servidor (acesso seguro ao token GitHub e análise de arquivos).

## Próximos passos (fase 2)

1. Portar o motor de análise estática para client-side (quando desejado).
2. Permitir operação 100% offline/local com token GitHub em localStorage + IndexedDB.
3. Exportar/importar estado como ZIP (o próprio ZIP como “banco”).
4. Integrar de forma limpa GitHub + dependências quando a base local estiver estável.

## Como usar agora

1. Configure o token GitHub em **Configurações**.
2. Crie ou escolha um projeto.
3. Vá em **Novo chat** → selecione repositório (ou crie) → escolha o workflow → Iniciar.
4. A WLC.IA analisa o repositório real com regras determinísticas locais.
5. Consulte a base de física/matemática em **WLC.IA**.

A WLC.IA **não chama** Google AI Studio, Vercel AI nem provedores externos no caminho principal.


## Atualização de conhecimento v1.1 (2026-11-19)
Base inicial de Matemática, Física introdutória e Desenvolvimento Web adicionada ao mecanismo de recuperação. Calculadora determinística limitada integrada ao agente como ferramenta, sem uso de `eval`. Ver `WLC_IA_KNOWLEDGE_V1.1.md`.

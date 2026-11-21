# WLC.IA Studio v0.3 — Atualização segura

## Mudanças
- Padronização de textos e documentação para WLC.IA.
- Logger estruturado em `src/lib/wlc-logger.ts` com níveis DEBUG/INFO/WARN/ERROR, timestamps, módulos, detalhes limitados e redaction básica.
- Erros no middleware de requisições e servidor agora são encaminhados ao logger central.
- Captura global de erros também gera evento estruturado.
- Preview emite marcador `__wlc` e mantém `__nexus` para compatibilidade com versões antigas do listener.
- README e changangelog atualizados.

## Compatibilidade intencional
- Rotas `/nexus`, IDs, imports e nomes de módulos internos foram mantidos para não quebrar rotas geradas, dados persistidos, modelos de chat ou testes.
- Chaves locais `nexus.v0.1.*` e identificadores de workflows antigos continuam reconhecidos.
- O termo remanescente Nexus em nomes técnicos internos/compatibilidade não representa mais a marca exibida ao usuário.

## Limites
- Logs recentes ficam em memória (100 entradas) e no console; não há envio remoto nem persistência automática.
- A sanitização mascara campos com nomes sensíveis comuns. Evite enviar conteúdo de usuário/segredos como detalhes arbitrários.
- Não foi possível executar build/testes sem instalar dependências, pois o pacote recebido não contém `node_modules`.

## Validar após instalação
```bash
bun install
bun run test
bun run lint
bun run build
```

# WLC.IA Cognitive Orchestrator Pro v1.0

## Objetivo
Tornar o motor WLC.IA mais **profissional** e **inteligente** sem depender de treinar pesos de modelo: melhorar o núcleo determinístico que orienta o LLM conectado.

## O que mudou
1. **Multi-signal intent scoring** — intenções ranqueadas por peso, não primeiro keyword.
2. **Continuidade conversacional** — detecta continuation, correction, restart e *loop_suspected*.
3. **Política de engenharia comercial** — incremental, dados reais, ops atômicas, anti-rewrite de App.
4. **Anti-padrões** — overclaim Enterprise, métricas inventadas, conclusão sem evidência.
5. **Condições de parada** — escopo mínimo ok, bloqueio externo, risco crítico, loop.

## Arquivos
- `src/lib/wlc-cognitive-orchestrator-pro.ts` (novo)
- `src/lib/wlc-professional-engineering.ts` (anti-loop)
- `src/lib/agent.server.ts` (wiring)
- `src/test/wlc-cognitive-orchestrator-pro.test.ts`

## Como validar
```bash
bun install
bun run test -- src/test/wlc-cognitive-orchestrator-pro.test.ts
bun run typecheck
```

## Limitações honestas
- Continua sendo camada **determinística** + LLM externo (Gemini/Lovable/etc.).
- Não substitui banco real, CI ou revisão humana em produção.
- “Mais inteligente” aqui = melhores políticas e sinais, não AGI local.

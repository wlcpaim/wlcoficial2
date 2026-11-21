# WLC.IA Developer Engineering Core v1

## Objetivo
Aprimorar o agente de desenvolvimento com protocolo de trabalho verificável, base técnica curada e orientação de engenharia. Isto não é treinamento de pesos/modelo: são instruções, heurísticas, documentação e contexto recuperado.

## Capacidades adicionadas
- Perfil técnico heurístico: frontend, backend, fullstack, mobile, data, devops ou geral.
- Plano adaptativo por intenção: desenvolvimento, debugging, revisão/segurança ou planejamento.
- Fases de engenharia: requisitos, inspeção, arquitetura, implementação incremental, validação e entrega.
- Gates explícitos: ler antes de editar; evitar reescrita desnecessária; testes e validações reais; não alegar ações sem evidência.
- Knowledge entries 2.1.0 cobrindo requisitos, arquitetura, implementação, testes, segurança, UX, backend, performance, operação e aprendizagem/documentação.

## Fluxo de trabalho esperado
1. Definir escopo, requisitos, restrições e critérios de aceite.
2. Inspecionar stack, scripts, padrões, arquivos, estado atual e integrações.
3. Selecionar uma arquitetura proporcional; documentar decisões relevantes.
4. Implementar em incrementos pequenos, mantendo compatibilidade.
5. Revisar diff e validar testes, lint, typecheck, build e riscos conforme disponíveis.
6. Entregar resumo, arquivos impactados, evidências, limites e próximos passos.

## Limites
- O planner é determinístico e aproximado; perfil detectado é hipótese.
- A inteligência generativa continua dependendo do provedor configurado.
- A base não é treinamento neural e não promete aprendizagem permanente entre sessões.
- A execução de comandos e deploy só podem ser reportados quando realmente executados.
- Este upgrade não adiciona sandbox de execução, editor local autônomo ou novos privilégios.

## Testes
`src/test/wlc-engineering-planner.test.ts` valida perfil, planos e contexto de engenharia. Execute `bun test`/`npm test` conforme o ambiente e valide build/typecheck antes de declarar release.

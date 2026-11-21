# WLC.IA Integrated Intelligence Core v1

## Objetivo

Adicionar uma camada integrada de enquadramento conversacional e operacional ao agente existente, preservando os motores cognitivos, sociais, de engenharia e a base de conhecimento já presentes.

## Implementado nesta etapa

- `src/lib/wlc-intelligence-core.ts`: extrai sinais determinísticos de modo de interação, continuidade, objetivo declarado, restrições, lacunas possíveis, necessidade de plano/ferramentas e risco operacional.
- `src/lib/agent.server.ts`: injeta o enquadramento no contexto do modelo e registra sinais resumidos no logger existente.
- `src/test/wlc-intelligence-core.test.ts`: cobre continuidade, novos tópicos, correções, planejamento, risco, conversa simples e transparência sobre confiança.

## Limites explícitos

- O módulo é um roteador/enquadrador determinístico; não é um modelo semântico, não treina pesos e não substitui o modelo conectado.
- A classificação pode errar. O prompt instrui o modelo a tratar os rótulos como sinais auxiliares e interpretar a mensagem e o histórico semanticamente.
- A memória permanente existente continua sendo a memória de projeto já implementada. Esta etapa não cria novas tabelas nem altera políticas ou migrations.
- Autonomia avançada não remove permissões: ações externas, destrutivas, financeiras, sensíveis ou irreversíveis continuam sujeitas a autorização explícita.

## Próximas etapas

1. Executar Vitest, lint e build no ambiente com dependências instaladas; corrigir regressões.
2. Desenvolver recuperação de memória por relevância, com escopo por usuário/projeto/chat e proveniência.
3. Adicionar compilador de objetivos e planos estruturados com dependências, critérios de aceite, riscos e checkpoints.
4. Adicionar avaliador de resposta baseado em critérios observáveis e evidências, sem expor raciocínio interno.
5. Construir conjunto de avaliação conversacional: referências, correções, ambiguidades, mudança de objetivo, restrições, planejamento e ações com risco.
6. Medir precisão/recall de roteamento, taxa de esclarecimentos desnecessários, regressões, conclusão verificada e custo/latência.

## Validação desta cópia

A cópia recebida não continha `node_modules` e não há runtime Bun instalado. Portanto, testes Vitest, lint e build não foram executados nesta etapa. Não declarar a implementação como validada em runtime até esses comandos serem executados no ambiente do projeto.

# WLC.IA Engine Optimization V4

## Objetivo
Reduzir o tempo de resposta em solicitações que exigem várias consultas independentes ao repositório, sem aumentar o paralelismo de operações mutáveis.

## Mudança implementada
No loop principal de `src/lib/agent.server.ts`, as ferramentas estritamente de leitura abaixo podem ser executadas em lotes concorrentes:
- `calculate_expression`
- `list_files`
- `read_file`
- `list_commits`
- `check_ci`
- `compare_versions`

As respostas são recolocadas no histórico na mesma ordem dos tool calls emitidos pelo modelo. Ferramentas não incluídas na lista continuam sendo executadas uma a uma. Em especial, `write_file`, `delete_file`, criação/atualização de tarefas e demais operações com efeitos colaterais não são paralelizadas.

## Benefício esperado
Quando o modelo solicitar N leituras independentes, o tempo da rodada tende a se aproximar da duração da leitura mais lenta, em vez da soma de todas as leituras. O ganho real depende de latência de GitHub, rede, limites de API e composição da chamada. Não há benchmark medido nesta entrega.

## Segurança e consistência
- Nenhuma ferramenta de escrita foi adicionada à lista concorrente.
- A ordem original dos resultados é preservada ao alimentar o modelo.
- O controle de SHA de `read_file` permanece ativo; alterações concorrentes externas continuam detectáveis pelo `write_file`.
- O limite de 48 etapas, checkpoints e failover de provedores não foram removidos nem ampliados.

## Não incluído
- Worker persistente / execução além de 48 etapas sem nova chamada.
- Execução isolada de builds/testes.
- Cache distribuído de contexto ou resultados.
- Alterações de modelo, temperatura, tokens ou estratégia de failover.

## Validação
A alteração foi revisada estaticamente. Testes, lint e build não foram executados porque as dependências do projeto não estão instaladas neste ambiente. Validar em CI antes de implantação. Recomenda-se benchmark com 3, 5 e 10 leituras independentes e testes de regressão para múltiplos `read_file` e combinação leitura/escrita.

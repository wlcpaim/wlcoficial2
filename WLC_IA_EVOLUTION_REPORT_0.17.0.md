# WLC.IA 0.17.0 — Cognitive Reliability & Secure Delivery

## Objetivo
Aprimorar a confiabilidade do núcleo cognitivo sem substituir o modelo conectado nem alterar os fluxos existentes de ferramentas, planejamento ou execução.

## Implementado
- Índice lexical BM25-like da base cognitiva pré-computado uma única vez na inicialização do módulo; consultas deixam de reconstruir tokens e frequências do corpus a cada mensagem.
- Recuperação com limite defensivo: valores não finitos, não positivos ou fracionários menores que um retornam lista vazia de forma previsível.
- Confiança de roteamento recalibrada para considerar a força da melhor correspondência de conhecimento e a confiabilidade média das evidências válidas, em vez de premiar apenas a quantidade de registros.
- Mantida a natureza heurística e não probabilística da confiança; o contexto já informa que ela não é probabilidade calibrada nem garantia de correção.
- Testes adicionados para estabilidade da recuperação, limites inválidos, evidências numerosas de baixa confiabilidade e fluxo de aprovação para alto risco.
- Criado `.env.example` sem valores secretos e atualizado `.gitignore` para excluir arquivos `.env` reais do pacote/repositório.

## Compatibilidade e limites
- Não foram alterados contratos públicos do agente nem permissões de ferramentas.
- Não há treinamento dos pesos do modelo, criação de provedor offline ou execução autônoma irrestrita nesta versão.
- A confiança continua sendo uma heurística determinística de apoio ao roteamento, não uma medida estatística calibrada.

## Validação executada neste ambiente
- TypeScript estrito do módulo cognitivo e dependências transitivas: aprovado.
- Smoke tests executados diretamente sobre o módulo compilado: recuperação determinística, validação de limites, comparação de confiabilidade de evidências e aprovação humana para alto risco — aprovados.
- `npm run test:runtime`: 8/8 aprovados.
- `npm run check:runtime`: aprovado.
- Suíte Vitest completa, lint e build da aplicação: não executados; `node_modules` não está instalado neste ambiente. A compilação direcionada do arquivo de teste também não pôde resolver o pacote `vitest` ausente.

## Segurança do pacote
O arquivo `.env` local foi excluído do ZIP de entrega. Use `.env.example` como modelo e preencha os valores no ambiente de execução.

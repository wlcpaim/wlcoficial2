# WLC Core Knowledge — 1.2

Esta biblioteca é conhecimento curado de referência e recuperação contextual. Ela não modifica os pesos de um modelo.

## Domínios iniciais
- Inteligência e agentes: comportamento adaptativo, ferramentas, memória, avaliação, honestidade e segurança.
- Matemática: aritmética, álgebra, porcentagem, geometria, trigonometria, unidades e verificação.
- Física: método de resolução, cinemática/dinâmica, energia e eletricidade introdutória; consultar também biblioteca de fórmulas.
- Desenvolvimento web: planejamento de produto, HTML/CSS/JS/TS, React, UI/UX, arquitetura/APIs, qualidade, SEO, acessibilidade e segurança.

## Cálculos
O módulo `src/lib/wlc-math-engine.ts` fornece avaliação determinística de expressões numéricas com gramática restrita. Ele não usa `eval` nem executa código arbitrário. Trigonometria é em radianos. Unidades devem ser analisadas e convertidas separadamente.

## Limitações
A recuperação é lexical e determinística; não usa embeddings. O conteúdo é uma base inicial, não treinamento de modelo nem autoridade técnica. Para informação atual, pesquisar documentação confiável quando a pesquisa estiver disponível. Para cálculos de engenharia e aplicações reais, validar premissas, dados, normas e modelos.

## Engenharia autônoma (v0.7)
- Orquestração de tarefas com dependências e critérios de aceite.
- Validação de lotes de arquivos e prevenção de path traversal.
- Checkpoints, registro de validação e aprendizado limitado à sessão.
- Correção iterativa limitada por tentativas; execução deve usar adapter isolado.

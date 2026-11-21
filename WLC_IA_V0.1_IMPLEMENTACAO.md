# WLC.IA V1.0 — Implementação independente

## Arquitetura
A WLC.IA V1.0 executa regras e algoritmos locais no servidor do WLC.IA. O caminho WLC.IA não chama Gemini, OpenAI, Lovable AI Gateway, Vercel AI ou qualquer provedor/modelo externo. Os agentes externos continuam opcionais e separados.

## Capacidades iniciais
- Lê inventário do repositório GitHub ativo e seleciona arquivos relevantes.
- Faz inspeção estática determinística de padrões de risco, TODO/FIXME, uso de `any`, `eval`, `dangerouslySetInnerHTML`, possíveis segredos hardcoded e logs.
- Registra no chat quantos arquivos foram lidos e quantos achados foram encontrados.
- Mantém workflows `analyze`, `debug`, `implement` e `review`; os resultados distinguem evidência de hipótese.
- Não altera arquivos automaticamente e não declara build/testes executados sem execução real.

## Limites deliberados da V1.0
A WLC.IA é independente de IA externa, mas não é um modelo de linguagem treinado. Nesta versão não há geração geral de código por linguagem natural nem raciocínio conversacional aberto. Para alterações, ela aponta arquivos e achados; gravações continuam exigindo uma etapa explícita e verificável. A inspeção estática pode gerar falsos positivos e falsos negativos.

## GitHub
A leitura do repositório ainda depende de uma conexão GitHub autorizada. Independência de IA não significa acesso anônimo ao repositório privado.

## Expansão — Física matemática

A versão inclui `src/lib/WLC.IA-physics-knowledge.ts`, uma biblioteca local e determinística com 80 relações matemáticas distribuídas em 12 áreas: fundamentos, cinemática, dinâmica, energia e trabalho, rotação, gravitação, fluidos, termodinâmica, ondas, eletricidade, resistência dos materiais e métodos matemáticos. Cada entrada registra equação, variáveis, condições de validade e aplicação. A página WLC.IA oferece pesquisa textual e filtro por área, além de princípios de validação científica.

A biblioteca é conteúdo de referência consultável. Ela ainda não é um solver universal e não implica que o motor de diagnóstico aplique automaticamente cada fórmula a qualquer projeto. Cálculos de engenharia precisam de dados rastreáveis, unidades coerentes, hipóteses, incerteza e validação apropriada.

---

## Atualização de interface (2026-11-19)

A interface foi reorganizada para o fluxo **Chat-first / WLC.IA-only**:

- Navegação focada em Novo chat, Histórico, WLC.IA e Configurações (GitHub).
- Seleção de agente externo removida do Novo chat — a WLC.IA é a única inteligência.
- Configurações enfatizam apenas a integração GitHub.
- Camada preparatória local em `src/lib/local-WLC.IA.ts` para independência futura do Supabase.
- Detalhes em `WLC_IA_V0.1_UPDATE.md`.

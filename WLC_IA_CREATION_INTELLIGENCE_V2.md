# WLC.IA Creation Intelligence v2.0 (0.16.0)

Upgrade do chat de **Criar** e do motor de criação: de "gera telas" para "entrega engenharia de produto".
Módulo: `src/lib/wlc-creation-intelligence-v2.ts` (sem dependências, determinístico, não chama LLM).

## O que mudou

| Antes (v1) | Agora (v2) |
|---|---|
| Detecção por regex `criar…` (não pegava "crie", "monte", "faça", "preciso de") | `isCreationRequest`: verbos imperativos, necessidades ("preciso de", "quero um"), filtro de dúvidas/bugs |
| Classificação booleana por palavra | `scoreDomains`: pontuação ponderada → domínio **primário + secundários**, resolução de conflitos (PDV × dashboard) |
| 11 domínios, listas de módulos/rotas | 18 domínios com **entidades+campos+relações, invariantes de negócio, máquinas de estado, permissões, casos de borda, KPIs, "nunca fingir"** (inclui jogo, áudio/música, educação, delivery, CMS, estoque, utilitários) |
| Sem requisitos | Extração de **requisitos explícitos**, restrições (stack, offline, PWA, dark mode…) e **suposições declaradas** |
| Sem noção de tamanho | **Complexidade 0–100** → tier simple/standard/complex/enterprise → **escopo em camadas** (MVP / Núcleo / Depois) |
| Sem fases | **Fases com portões de verificação** (fundação → fluxo ponta a ponta → regras/integridade → estados → acabamento → verificação honesta) |
| Resumo final por conta do modelo | **Auditoria de qualidade do código gravado** + **autocorreção forçada** (até 2 rodadas) antes do resumo final |

## Auditoria de código gerado (`auditGeneratedFiles`)
Detecta padrões "amadores": botão com handler vazio/`alert`, `href="#"`, lorem ipsum, métricas com `Math.random`, percentuais de crescimento hardcoded, dinheiro em float, XSS (`dangerouslySetInnerHTML`), segredos no código, imagem sem `alt`, campo sem label, tela com fetch sem loading/erro, lista sem estado vazio, TODO/FIXME, `console.log`, `any`, `catch` vazio, arquivo > 600 linhas, loop de jogo sem delta de tempo.
Retorna nota 0–100, conceito A–F e achados `critical/high` ("blocking"). Arquivos de teste são ignorados; `Math.random` de spawn/partículas/ids em jogos **não** é falso positivo.

## Integração (`agent.server.ts`)
1. Pedidos de criação → `analyzeCreation` + `formatCreationBlueprintContext` entram no contexto (substitui o contexto v1 de Project Creation Intelligence; o arquivo v1 continua no repositório).
2. `buildCreationProtocol(mode, blueprint)` é anexado à instrução do modo (Planejar: plano profissional com MVP/suposições/etapa de verificação; Criar: protocolo de gravação em ordem + autorrevisão).
3. Conteúdo gravado por `write_file`/`patch_file` é rastreado (patches aplicados sobre o conteúdo conhecido).
4. No modo **Criar**, antes de aceitar o resumo final: `auditGeneratedFiles` → se houver achados graves, o agente recebe `buildAuditSelfReviewPrompt` e corrige com `patch_file` (máx. 2 rodadas; falso positivo pode ser justificado no resumo).
5. O bloco "Status verificado" passa a incluir a linha de auditoria (nota, achados, graves) — honesta: mostra o que sobrou.

## Limites (honestidade)
- Heurística determinística: não prova que o produto funciona, não executa o código e não substitui build/testes.
- O blueprint é hipótese de engenharia; o modelo deve implementar só o que serve ao pedido.
- A auditoria é por padrões de texto (pode haver falsos positivos/negativos); não é análise estática completa.

## Testes
`src/test/wlc-creation-intelligence-v2.test.ts` (intenção, domínio, blueprint, complexidade, escopo, protocolo, auditoria e falsos positivos).

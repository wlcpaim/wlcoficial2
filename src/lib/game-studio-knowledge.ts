/**
 * WLC.IA — Game Studio & Professional Web Engineering Knowledge Domain
 * Especialização em criação de jogos web, física/matemática de games,
 * mecânica de veículos, arquitetura de produtos e engenharia full-stack
 * no nível necessário para competir com Replit, Lovable e Vercel.
 */
import type { KnowledgeEntry } from "./wlc-knowledge-base";

export const GAME_STUDIO_KNOWLEDGE_VERSION = "1.0.0";

export const GAME_STUDIO_KNOWLEDGE: KnowledgeEntry[] = [
  // ─── Game Studio Core ─────────────────────────────────────────────
  {
    id: "gs-core-01",
    domain: "Game Studio",
    title: "Fundamentos de criação de jogos web do zero",
    keywords: [
      "criar jogo", "game studio", "jogo web", "desenvolver game", "do zero",
      "game loop", "cena", "estado", "produção de jogo", "html5 game",
    ],
    content:
      "Um jogo web profissional começa por: (1) loop de jogo determinístico ou semi-determinístico (update fixo + render interpolado); (2) máquina de estados/cenas clara (menu → preparação → corrida → resultado); (3) separação rígida entre simulação (física, regras) e apresentação (sprites, UI, som); (4) dados de conteúdo versionados (peças, pistas, economia) fora do código de runtime; (5) save/load com schema migrável. Nunca misture input de UI com passo físico. Prefira fixed timestep (ex.: 1/60 ou 1/120 s) para física e deixe o render acompanhar. Transições de tela devem parecer jogo (preload, go()), não rotas de site. O objetivo não é clonar um projeto existente: é extrair princípios e entregar uma versão mais clara, testável e extensível.",
  },
  {
    id: "gs-core-02",
    domain: "Game Studio",
    title: "Arquitetura de cenas, estado e persistência em jogos",
    keywords: [
      "cena", "scene", "estado", "state machine", "save", "localstorage",
      "cloud save", "preload", "navegação de jogo",
    ],
    content:
      "Use uma única máquina de cenas no cliente para o fluxo do jogo (sem uma rota por tela de gameplay). Toda mudança de tela passa por um go() que mostra preload e evita flash de conteúdo incompleto. Estado de jogador (setup, inventário, economia, progresso) deve ter uma única fonte de verdade e um caminho único de mutação (ex.: earn/chargeRepair). Persistência: local rápido + cloud com ownership, rate limits e validação server-side (money caps, itens liberados). Saves por identidade de player, não só por conta. Migrações de schema de save devem ser explícitas e testadas. Nunca confie no cliente para autorizar itens, dinheiro ou resultado de partida ranked.",
  },
  {
    id: "gs-core-03",
    domain: "Game Studio",
    title: "Design de sistemas de progressão, economia e risco",
    keywords: [
      "economia", "progressão", "risco", "quebra", "custo", "balanceamento",
      "meta", "recompensa", "crédito", "desgaste",
    ],
    content:
      "Economia de jogo séria conecta cada escolha a custo real: peso, consumo, desgaste, risco de quebra e tempo. Renda e gasto devem passar por funções únicas (extrato auditável). Preços podem seguir cotação externa sem contaminar a física. Progressão (kits, estágios, MMR) deve ser medida pela simulação real, não por multiplicadores arbitrários por personagem. Risco (stress, fadiga, valve float) precisa ser seeded e reproduzível para laudos e testes. Balanceamento: defina janelas-alvo (cv, Vmax, tempo de pista), gere builds candidatas pela física, rejeite as que quebram ou fogem da janela. Nunca mostre “+X cv por peça” se a potência só existe no motor completo.",
  },

  // ─── Game Physics ─────────────────────────────────────────────────
  {
    id: "gs-phys-01",
    domain: "Física de Jogos",
    title: "Simulação determinística e fixed-step",
    keywords: [
      "física de jogo", "fixed step", "determinismo", "timestep", "simulação",
      "stock vs stock", "rng seeded", "replay",
    ],
    content:
      "Para corridas, combate e qualquer modo onde empate justo importa: use passo fixo de física e integre forças no mesmo order a cada frame lógico. Separe o relógio de render do relógio de simulação. RNG de quebras e eventos deve ser seeded a partir do estado do jogador/setup — nunca Math.random em caminhos que afetam resultado. Mesmos inputs → mesmo outcome (stock vs stock empata). Guarde constantes físicas em um único registry; proíba literais duplicados. Testes devem rodar a mesma step() das corridas (lab/admin), exportando logs. Divergência TS×Python ou cliente×servidor exige contrato de unidades e hash canônico de payload.",
  },
  {
    id: "gs-phys-02",
    domain: "Física de Jogos",
    title: "Veículos, potência, transmissão e equilíbrio de forças",
    keywords: [
      "veículo", "moto", "carro", "potência", "torque", "transmissão", "marcha",
      "final drive", "tração", "arrasto", "peso", "aceleração",
    ],
    content:
      "Modelo mínimo sério de veículo: potência/torque do motor em função de rpm e setup; perdas (FMEP, atrito, eficiência de transmissão η); força na roda via relações (primária × marcha × final drive) e raio dinâmico do pneu montado; resistência aerodinâmica e de rolamento; massa total (chassis + pilotagem + combustível). Peso afeta aceleração, não “multiplica cv”. Relação curta melhora largada; relação longa sobe Vmax até o equilíbrio de forças. Limiter de rpm deve cortar no motor (quando houver corte eletrônico real), nunca em km/h arbitrário. Combustível com densidade e BSFC faz o tanque seco estolar o veículo. Documente origem de cada número (OFICIAL, CALCULADO, MEDIDO, ESTIMADO, DESCONHECIDO).",
  },
  {
    id: "gs-phys-03",
    domain: "Física de Jogos",
    title: "Motor, mistura, ignição e limites mecânicos",
    keywords: [
      "motor", "ve", "bmep", "fmep", "mistura", "afr", "ignição", "rpm limit",
      "valve float", "biela", "fadiga", "compressão",
    ],
    content:
      "Curva de potência deve sair de modelo de motor (VE, IMEP/BMEP, FMEP tipo Chen-Flynn), não de tabela mágica isolada. Mistura rpm-dependente unifica dyno e corrida. Ignition architecture (platinado/CDI/ECU) define se existe corte eletrônico e qual o teto de rpm (faísca vs valve float). Fadiga de biela pode usar dano acumulado (Miner) por ciclo de tensão acima de um rpm de referência. Usinagem (taxa, comando, cava) altera geometria e deve consumir a peça instalada. Stress agrega risco de quebra por peça/serviço/mapa e alimenta laudo e preço de reparo. Dados sem evidência ficam DESCONHECIDO — a IA nunca inventa cv, curso ou limite.",
  },
  {
    id: "gs-phys-04",
    domain: "Física de Jogos",
    title: "Colisão, contato, draft e feedback sensorial",
    keywords: [
      "colisão", "contato", "draft", "vácuo", "slipstream", "som", "feedback",
      "pneu", "aderência", "desgaste",
    ],
    content:
      "Regras de contato e draft devem ser determinísticas e baseadas em geometria (eixos, gaps), não em “se está perto”. Slipstream pode reduzir drag enquanto a condição de gap for verdadeira e latches (tuck) até o fim da reta. Desgaste de pneu e uso de rua (km/L, tempo de entrega) derivam do mesmo motor de física e voltam ao setup de corrida. Som do motor deve refletir Setup (escape, cilindrada, comando, compressão) sem alterar potência. EQ de áudio é cosmético e player-tunable. Separe sempre ciência experimental (labs de combustível, dyno engineering) da física que decide a corrida.",
  },

  // ─── Game Mathematics ─────────────────────────────────────────────
  {
    id: "gs-math-01",
    domain: "Matemática de Jogos",
    title: "Matemática essencial para simulação e jogos",
    keywords: [
      "matemática de jogos", "vetor", "integração", "interpolação", "unidade si",
      "dimensional", "rng", "probabilidade", "curva",
    ],
    content:
      "Base obrigatória: vetores 2D/3D, produto escalar/vetorial, normalização; integração de Euler/semi-implícita com passo fixo; interpolação linear e suave para render; conversões SI (km/h ↔ m/s, cv ↔ W, psi ↔ Pa). Análise dimensional antes de misturar fórmulas. Curvas de motor e mapas ECU: amostragem por rpm, interpolação entre bandas, limites e soft-cut. Probabilidade de quebra: distribuições controladas e seeds fixos para replay. Elo/MMR e economia usam aritmética auditável e histórico append-only. Nunca misture unidades; declare hipóteses do modelo (ideal, empírico, medido).",
  },
  {
    id: "gs-math-02",
    domain: "Matemática de Jogos",
    title: "Modelos numéricos de motor e transmissão",
    keywords: [
      "bmep", "imep", "fmep", "cilindrada", "relação de transmissão", "raio dinâmico",
      "eta", "potência", "torque", "rpm",
    ],
    content:
      "Cilindrada V = π/4 · d² · s (por cilindro × N). Torque e potência: P = T·ω. BMEP relaciona trabalho útil ao volume deslocado. FMEP (ex. Chen-Flynn) modela perdas por atrito em função de rpm e carga. VE (eficiência volumétrica) não deve ser constante genérica se o jogo aspira realismo. Relações: n_roda = n_motor / (i_primária · i_marcha · i_final); v = n_roda · 2π · r_dinâmico. Eficiência total η reduz força disponível na roda. Documente cada parâmetro com origem; divergência entre implementações (TS/Python) deve ser medida por erro relativo e contrato canônico.",
  },

  // ─── Web Game Engineering ─────────────────────────────────────────
  {
    id: "gs-web-01",
    domain: "Engenharia de Jogos Web",
    title: "Stack e performance para jogos no browser",
    keywords: [
      "canvas", "webgl", "requestanimationframe", "performance", "bundle",
      "preload", "assets", "mobile", "react game", "typescript game",
    ],
    content:
      "Prefira TypeScript estrito, um loop de jogo explícito e render desacoplado (Canvas 2D/WebGL ou DOM só para UI de menu). Evite re-render de framework no passo de física. Preload de imagens com dedupe, decode e cancelamento de navegação obsoleta. Orçamento de frame: física estável mesmo se o render cair de FPS. Code-split por cena; assets por manifesto. Mobile: toque, safe areas, redução de partículas, testes em device real. Ferramentas: Vite/Bun, testes unitários da sim (Vitest), lint e format no CI. Não exponha secrets no cliente; gateway de IA e workers privilegiados ficam no servidor.",
  },
  {
    id: "gs-web-02",
    domain: "Engenharia de Jogos Web",
    title: "Backend, autoridade e anti-cheat para jogos online",
    keywords: [
      "servidor autoritativo", "anti-cheat", "ranked", "mmr", "rls", "token",
      "rate limit", "cloud save", "validação",
    ],
    content:
      "Cliente é hostil: validação de inventário, dinheiro, resultado ranked e desbloqueios no servidor. RLS e roles (admin/player) por tabela sensível. Tokens: armazene só hash; rate-limit por IP hasheado; sessões one-time quando possível. MMR/Elo append-only, escrito só server-side, sem usar money ou potência da build. Jobs e workers externos autenticam por secret de ambiente, nunca por chave no frontend. Auditoria cloud (runs, jobs, evidências) legível só por admin. Replays e laudos devem ser reproduzíveis a partir de seed + setup.",
  },
  {
    id: "gs-web-03",
    domain: "Engenharia de Jogos Web",
    title: "Conteúdo data-driven, catálogos e compatibilidade",
    keywords: [
      "catálogo", "data-driven", "json", "peças", "compatibilidade", "plataforma",
      "startgame", "feature flag", "conteúdo",
    ],
    content:
      "Separe runtime de conteúdo: catálogos de peças, serviços, pistas e receitas em dados versionados. Cada grandeza técnica carrega valor, unidade, fonte e origem. Feature flags / STARTGAME liberam conteúdo ao jogador sem apagar o catálogo completo (útil para tools e auditoria). Compatibilidade por plataforma esconde só o incompatível. Kits e builds geradas devem passar por validadores (quebra, mistura, limites mecânicos) antes de publicar. Edições de conteúdo em runtime (labs admin) mutam objetos vivos com snapshot de defaults para reset exato.",
  },

  // ─── Mechanical / Domain Expertise ────────────────────────────────
  {
    id: "gs-mech-01",
    domain: "Mecânica Profissional",
    title: "Preparação de motos e veículos como sistema",
    keywords: [
      "preparação", "usinagem", "cabeçote", "comando", "carburador", "injeção",
      "ecu", "mapa", "pneu", "relação", "oficina",
    ],
    content:
      "Preparação séria é um sistema: admissão, comando, compressão, escape, alimentação, ignição, transmissão e pneus interagem. Usinagem consome a peça; trocar o componente descarta o serviço anterior. Mapas de ECU (trims, ponto, corte, shift) só valem com módulo programável. Pneus: pressão, desgaste e raio dinâmico mudam tração e velocidades por marcha. Conselhos de mecânico apontam direção (ar, ponto, relação, confiabilidade), não o “número mágico”. Meça no dyno e na pista com a mesma física. Documente o que é ficha de fábrica versus estimativa.",
  },
  {
    id: "gs-mech-02",
    domain: "Mecânica Profissional",
    title: "Diagnóstico, laudo e confiabilidade",
    keywords: [
      "diagnóstico", "laudo", "quebra", "falha", "confiabilidade", "manutenção",
      "stress", "reparo",
    ],
    content:
      "Diagnóstico profissional: (1) estado atual do setup e odômetro; (2) sintomas (corte, mistura, ruído, perda de potência); (3) hipóteses ordenadas por evidência; (4) risco residual se ignorar. Laudo de quebra deve bater com a causa do stress e com a lista de peças do reparo. Confiabilidade é trade-off com desempenho: kits agressivos exigem margem de biela, molas e refrigeração. A IA atua como mecânico-chefe: explica o porquê físico, estima custo/risco e nunca finge certeza sem dado.",
  },

  // ─── Building StreetRace-class projects ───────────────────────────
  {
    id: "gs-build-01",
    domain: "Game Studio",
    title: "Como construir um StreetRace-class do zero (melhor, não igual)",
    keywords: [
      "streetrace", "do zero", "clonar", "melhorar", "arquitetura de jogo",
      "racha", "tuning game", "simulador",
    ],
    content:
      "Para criar um jogo no nível StreetRace — e melhor: (1) escreva o contrato da física e dos dados antes da UI; (2) implemente step() testável e determinística; (3) modele preparação como slots + serviços que alteram o motor real; (4) economia e risco acoplados à física; (5) camadas de auditoria (catálogo com proveniência, certificados, worker externo) que não contaminam a corrida; (6) UX de jogo (cenas, preload, feedback sonoro) separada de rotas de site; (7) cloud com autoridade server-side. Melhorias típicas sobre um clone: menos acoplamento, mais testes de regressão da sim, dados 100% rastreáveis, balanceamento gerado por busca na física, telemetria e ferramentas de lab de primeira classe, e pipeline de conteúdo que não exige rebuild para cada peça.",
  },
  {
    id: "gs-build-02",
    domain: "Game Studio",
    title: "Pipeline de qualidade: testes, lab e homologação",
    keywords: [
      "teste", "vitest", "lab", "homologação", "regressão", "auditoria",
      "qa", "matriz de cenários",
    ],
    content:
      "Qualidade de jogo de simulação: testes unitários da física e do drivetrain; matrizes de cenário no admin-lab com a mesma step(); comparação TS×Python com tolerância e origem dos dados; checklists de homologação OEM (marchas, taxas, limites); proibição de literais duplicados de constantes; saves e economia com testes de invariante (extrato, caps). CI roda unit + lint; builds de conteúdo regeneram receitas de kits quando a física muda. Evidências de auditoria ficam versionadas. A IA, ao propor mudanças, deve indicar quais testes e laudos precisam ser reexecutados.",
  },

  // ─── Competitive platform engineering ─────────────────────────────
  {
    id: "gs-plat-01",
    domain: "Plataforma de Desenvolvimento",
    title: "WLC.IA como concorrente de Replit, Lovable e Vercel",
    keywords: [
      "replit", "lovable", "vercel", "concorrente", "plataforma", "agent",
      "autonomous", "deploy", "preview", "sandbox",
    ],
    content:
      "Para competir com Replit (dev cloud + agents), Lovable (geração de apps full-stack) e Vercel (deploy/preview): a WLC.IA combina (1) conhecimento de domínio profundo e recuperável; (2) agentes com planos aprováveis, ciclos auto-contínuos e relatórios de completion honestos; (3) sandbox de execução real (Docker/runner), nunca simulado quando não há credencial; (4) previews e sites estáticos publicáveis com DB isolado por repositório; (5) segurança (secrets só no server, RLS, rate limits); (6) engenharia orientada a evidência e qualidade. Diferencial: especialização em jogos, física e mecânica + autonomia com gates de validação, não só gerar código genérico.",
  },
  {
    id: "gs-plat-02",
    domain: "Plataforma de Desenvolvimento",
    title: "Agentes, planos, sandbox e entrega confiável",
    keywords: [
      "agent", "plano", "propose_plan", "sandbox", "runner", "completion",
      "auto cycle", "tool", "aprovação",
    ],
    content:
      "Padrão profissional de agente: propor plano (propose_plan) → usuário aprova → execução com tools limitadas → eventos duráveis de status → completion report só a partir do log real de tools (sem sucesso inventado). Auto-continue com checkpoint e compactação de outputs. Sandbox: adapter trocável; sem credencial → erro explícito, nunca fake de build/URL. Deploy/preview desacoplados do chat. Conhecimento curado (knowledge base) é injetado por retrieval lexical/determinístico; não confundir com fine-tuning de pesos. Toda mudança de schema/produtos sensíveis passa por regras de projeto e AGENTS.md.",
  },
  {
    id: "gs-plat-03",
    domain: "Plataforma de Desenvolvimento",
    title: "Engenharia web full-stack de elite",
    keywords: [
      "full-stack", "typescript", "react", "api", "postgres", "drizzle",
      "tailwind", "arquitetura", "dx", "qualidade",
    ],
    content:
      "Padrões de elite: TypeScript estrito; UI acessível e rápida; APIs com validação (Zod), autenticação e autorização por recurso; Postgres com RLS e migrações aditivas; separação clara server/client; observabilidade (logs estruturados, erros capturados); testes no núcleo de negócio; DX com presets e scaffolds que não reescrevem histórico. Performance: code-split, cache consciente, bundlers modernos (Vite/Bun). Produto: ship de valor incremental, feature flags, e documentação viva (AGENTS, knowledge, changelogs). A WLC.IA deve preferir designs simples, testáveis e auditáveis a abstrações opacas.",
  },

  // ─── AI specialist behavior ───────────────────────────────────────
  {
    id: "gs-ai-01",
    domain: "Game Studio",
    title: "Comportamento da IA como Game Studio + mecânico + dev sênior",
    keywords: [
      "especialista", "comportamento", "system", "como agir", "criar jogo",
      "melhorar projeto", "profissional",
    ],
    content:
      "Ao criar ou evoluir um jogo, a WLC.IA age como trio: game designer de sistemas, engenheiro de física e lead full-stack. Ordem típica: objetivos de jogador e métrica → contrato de simulação → dados com proveniência → loop e cenas → economia/risco → UI/som → backend autoritativo → testes/lab → deploy. Ao melhorar um projeto existente, não copie cegamente: preserve invariantes corretas, elimine acoplamento, complete testes e documente origem dos números. Em mecânica/física: declare hipóteses, unidades e o que é DESCONHECIDO. Em código: mudanças pequenas, verificáveis, com plano aprovável quando o risco for alto. Objetivo final: produto jogável, mensurável e superior em clareza, estabilidade e profundidade — não um clone superficial.",
  },
  {
    id: "gs-ai-02",
    domain: "Game Studio",
    title: "Checklist para greenfield de jogo web de simulação",
    keywords: [
      "checklist", "greenfield", "novo jogo", "MVP", "roadmap", "simulação",
    ],
    content:
      "Checklist greenfield: (1) GDD curto com loop core e métrica norte; (2) lista de entidades e dados (unidades + origem); (3) physics.step prototype com testes stock-vs-stock; (4) setup mínimo equipável; (5) uma pista/modo e UI de resultado; (6) save local; (7) economia básica auditável; (8) lab interno; (9) auth + cloud quando multiplayer/ranked; (10) pipeline de assets e CI. Só então polir arte, som e meta-progressão. Evite features cosméticas antes da sim estável. Cada marco deve deixar o jogo mais jogável, não só mais “código”.",
  },
];

export function getGameStudioKnowledge(): KnowledgeEntry[] {
  return GAME_STUDIO_KNOWLEDGE;
}

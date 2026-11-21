/**
 * WLC.IA — StreetRace Tuning Paddock Knowledge Domain
 * Conhecimento profissional das mecânicas, preparação, física, NEXUS e RealGear.
 * Integrado à WLC_CORE_KNOWLEDGE para recuperação lexical determinística.
 * Versão alinhada ao knowledge base gerado a partir de streetrace-tuning-paddock-main.
 */
import type { KnowledgeEntry } from "./wlc-knowledge-base";

export const STREATRACE_KNOWLEDGE_VERSION = "1.0.0";

export const STREATRACE_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "sr-overview-01",
    domain: "StreetRace",
    title: "Visão geral do StreetRace Tuning Paddock",
    keywords: [
      "streetrace", "street race", "racha", "moto", "preparação", "tuning", "paddock",
      "cg 160", "factor 150", "cg 150", "cg 125", "bolinha", "realgear", "nexus",
    ],
    content:
      "StreetRace é um simulador de rachas de rua e preparação de motos (Honda CG 160 Titan, Yamaha Factor 150, CG 150 ESD, CG 125 Bolinha) com física determinística de alta fidelidade. O norte do produto: o jogador monta uma moto própria mais rápida e vence rachas. A métrica é corridas concluídas por dia. Stack: TanStack Start, React, TypeScript, Tailwind, Supabase/Drizzle, worker Python RealGear e sistema de auditoria NEXUS. O outcome de corrida é 100% calculado por src/game/physics.ts (fixed-step). Stock vs stock DEVE empatar. Toda preparação (peças, usinagem, ECU, combustível, pneus) deve chegar à física; NEXUS/RealGear/CAIM nunca alteram Setup ou física de corrida.",
  },
  {
    id: "sr-arch-02",
    domain: "StreetRace",
    title: "Arquitetura de cenas, saves e STARTGAME",
    keywords: [
      "cena", "go()", "preload", "localstorage", "game_saves", "startgame", "complegame",
      "player", "conta", "cloudgate",
    ],
    content:
      "O jogo vive em uma única máquina de cenas client-side em `/` (src/game). Toda mudança de tela passa por go() com tela de preload — deve parecer jogo, não site. Saves: localStorage streetrace-save-v1 (legado) e cloud game_saves por player (kind player:<uuid>), com ownership e save-guard (money cap por tempo, bikes/parts released+pagas). Conta possui até 5 players; create/rename/switch só via RPCs security-definer. STARTGAME (src/game/startgame.ts) filtra bikes/parts/services liberados para o jogador oficial e /api/mecanico; catálogos e shopListing permanecem completos para ferramentas COMPLEGAME. CloudGate só mostra landing após authResolved e active player carregado.",
  },
  {
    id: "sr-physics-03",
    domain: "StreetRace",
    title: "Modelo físico central e determinismo",
    keywords: [
      "physics", "física", "fixed-step", "determinismo", "stock vs stock", "hp", "rpm",
      "peso", "aceleração", "bsfc", "combustível", "tanque",
    ],
    content:
      "Race outcome é puramente computado por physics.ts (fixed-step). Potência vem do setup; peso afeta só aceleração. Stock vs stock deve empatar — mantenha sims determinísticos. Combustível é físico: litros adicionam peso via FUEL_DENSITY em physics.stats(); cada passo queima combustível a partir da potência entregue (BSFC); tanque seco estola a moto. O adversário offline sempre roda tanque cheio de stock. Nunca mostre consumo previsto de corrida na UI. Quebras usam physics.breakPoint()/rng() seeded de player+setup, nunca Math.random. Constantes físicas vivem só em physics-registry/constants.ts; geometria de motor em engine_catalog.ts com valor, unidade, fonte e origem.",
  },
  {
    id: "sr-drivetrain-04",
    domain: "StreetRace",
    title: "Transmissão, final drive e velocidades por marcha",
    keywords: [
      "pinhão", "coroa", "final drive", "marcha", "gear", "drivetrain", "relação",
      "gearTop", "torque", "raio dinâmico", "eta",
    ],
    content:
      "Final drive (pinhão × coroa) escala gearTop via gearSpeeds(); a força na roda usa velocidade equivalente de marcha — relação curta lança mais forte, relação longa sobe Vmax. Fonte única de verdade: physics.drivetrain() (primária × marcha × coroa/pinhão do engine_catalog, raio dinâmico do pneu traseiro MONTADO, ETA de drivetrain.eta_total). BikeModel.gearTop é só referência de validação. Pinhão/coroa de fábrica vêm de factoryGear()/stockSetupOf(). Race, dyno, scanner, NEXUS e RealGear devem compartilhar a mesma cadeia mecânica. Com marchas OEM reais, motos preparadas ficam mais lentas no final; balanceamento de adversários/metas é decisão de design separada.",
  },
  {
    id: "sr-prep-slots-05",
    domain: "StreetRace",
    title: "Peças, slots, Fuçar e inventário",
    keywords: [
      "peças", "parts", "slots", "fuçar", "inventário", "setup", "original", "equipar",
      "compatibilidade", "incompatível",
    ],
    content:
      "Catálogo em src/game/parts.ts. Owned part ids ficam em Player.parts; categorias do Fuçar funcionam como inventário (não há menu de inventário separado). Componentes trocáveis usam Setup.slots (ids de parts.ts). O slot <slot>-original é de fábrica: sempre equipável, nunca vendido e nunca armazenado em Player.parts (Peças › Standard é derivado do setup). physics.engine() deriva hp/rpmPeak/rpmLimit de slots + compressão + comando + km de amaciamento + desgaste de óleo — toda mudança chega na corrida. Listas de peças na garagem nunca mostram ganho de cv por peça; só potência total (garagem, dyno, corrida). Compatibilidade por plataforma: shop esconde apenas INCOMPATIVEL.",
  },
  {
    id: "sr-oficina-06",
    domain: "StreetRace",
    title: "Oficina, usinagem e serviços",
    keywords: [
      "oficina", "usinagem", "taxar", "cabeçote", "comando", "workshop", "serviço",
      "headstock", "camstock", "cava", "compressão",
    ],
    content:
      "Fuçar equipa peças; Oficina roda serviços pagos de usinagem (taxar cabeçote, comando etc.). Serviços em src/game/data/workshop_services.json (Setup.services). physics.stress() transforma cada peça/serviço/ECU em risco de quebra por corrida e por puxada de dyno. Serviços modificam o cabeçote/comando instalado in-place (um serviço por peça); sobras ficam em Player.headStock/camStock e trocam no Fuçar — espelha usinagem real que consome a peça original. component-swap.ts remove usinagem da peça substituída: preparação não transfere para peça física diferente. Diâmetros de válvula, cava e match acústico cam×escape vivem em sintonia.ts; physics.engine()/powerShape() leem isso.",
  },
  {
    id: "sr-ecu-07",
    domain: "StreetRace",
    title: "ECU Athlon, mistura e ignição",
    keywords: [
      "ecu", "athlon", "mapa", "trim", "timing", "mistura", "afr", "ignição",
      "platinado", "cdi", "rpm limit", "corte", "2-step", "quickshifter",
    ],
    content:
      "Mapa Athlon (Setup.ecu: band trims incl. over-rev, band timing tLow/tHigh, closed loop, lean protection, soft cut, per-gear shift rpm e qsGear, 2-step, idle) é aplicado só quando o módulo é `prog`. Campos novos são opcionais e neutros quando unset. physics.mixtureAt()/mixFactor() tornam a mistura rpm-dependente — mesma curva para dyno e corrida. Ignition (src/game/ignition.ts): arquitetura platinado/CDI/ECU, energia de faísca e compatibilidade de módulo. physics.engine() pega rpmLimit da ignição para motos sem ECU (sem corte eletrônico: min de energia de faísca e valve-float rpm). Rev limiter age só no rpm do motor (coupled >= rpmLimit) e só quando ignition.hasElectronicCut; platinado/noCut não têm corte e atingem Vmax pelo equilíbrio de forças.",
  },
  {
    id: "sr-fuel-08",
    domain: "StreetRace",
    title: "Combustíveis, blends e Nitromethane Lab",
    keywords: [
      "combustível", "fuel", "blend", "etanol", "álcool", "gasolina", "lata", "cans",
      "nitro", "nitrometano", "lhv", "bsfc",
    ],
    content:
      "Blends em src/game/fuelmix.ts (Setup.blend fractions, Player.cans em litros). physics.engine() aplica blendFx() relativo ao combustível base — tanque 100% base permanece neutro; stock vs stock deve empatar. Mistura e jet area ratio são físicos. Nitromethane Lab (src/game/nitro/lab.ts + NitroLabTab, RG-CHEM-NM-001) é ciência read-only: oito engines de cálculo, LHV ilustrativo e parâmetros de hipótese rotulados; nunca alimenta race/fuelmix e nunca declara aprovação NEXUS. Mudanças de corrida exigem aprovação separada e auditoria NEXUS independente.",
  },
  {
    id: "sr-failure-09",
    domain: "StreetRace",
    title: "Quebras, dano colateral, sucata e reparo",
    keywords: [
      "quebra", "falha", "stress", "dano", "reparo", "sucata", "scrap", "biela",
      "fadiga", "valve float", "laudo",
    ],
    content:
      "physics.stress() gera risco de quebra a partir de peça/serviço/ECU, rolado por corrida e dyno. RNG: breakPoint()/rng() seeded de player+setup. Dano colateral em damage.ts, keyed pela causa do stress e seeded por odômetro; repairPrice() deve bater com o laudo. Motor quebrado e Player.scrap em scrap.ts: danificada = consertável; sucata = kg de metal para uso futuro, nunca vendido; mecânico não fica com nada. Fadiga de biela (rodfatigue/rod-fatigue.ts): dano de Miner por ciclo de tensão acima do rpm de referência; quebra como FADIGA ou SOBRECARGA. Molas e valve float em valvetrain-comp.ts e physics.valveFloatRpm.",
  },
  {
    id: "sr-economy-10",
    domain: "StreetRace",
    title: "Economia, crédito, jobs e uso de rua",
    keywords: [
      "dinheiro", "crédito", "cartão", "preço", "usd", "brl", "trampo", "job",
      "entrega", "desgaste", "pneu", "extrato",
    ],
    content:
      "Crédito em credit.ts: toda renda passa por earn() (quita fatura quando cash cobre); reparos de motor por chargeRepair(). Extrato gravado automaticamente em store.setPlayer a partir de diffs de money/creditDebt, rotulado pela cena ou ledgerTag() — nenhum gasto bypassa o extrato. Preços em economy.ts via priceNow()/fuelUsdMul() da cotação USD/BRL ao vivo; preço de catálogo = preço em BASE_USD; física independente da cotação. Uso de rua em usage.ts: km/L de entrega, desgaste de pneu por km, tempo de entrega por hp; desgaste de banda entra nas corridas via Setup.tireWear. Jobs (jobrun.ts) rodam em background; go() bloqueia corrida/dyno enquanto houver run listado.",
  },
  {
    id: "sr-kits-11",
    domain: "StreetRace",
    title: "Kits Preparado 4MM e balanceamento",
    keywords: [
      "kit", "4mm", "preparado", "estágio", "stage", "recipe", "balanceamento",
      "cv", "bololo", "aero", "enxuta",
    ],
    content:
      "Kits Preparado (kits/preparado.ts + recipes.json): searchRecipe monta cada estágio 4MM por moto (peças released, serviços de oficina, compressão, final drive) sob janela STAGE_TARGET de cv. Stage 3 nunca usa carenagem/bolha; pode usar enxuta-racha (Setup.aero → Cd·A via Part.cdaMul) e escolhe módulo + final drive em reta BOLOLO_M preferindo corte na última marcha (BOLOLO_BONUS) para que motos MA ainda passem 180 km/h com ≤26 cv. Todo passo passa por harden/kitFaults — nenhum kit sai com quebra, mistura pobre, biela sobrecarregada ou válvulas flutuando. Balanceamento vem da física real, nunca de multiplicadores por moto. kitPlan mede a receita ao vivo; compare.ts ranqueia as quatro motos com pesos configuráveis.",
  },
  {
    id: "sr-nexus-12",
    domain: "StreetRace",
    title: "NEXUS, CAIM, AEIC e Encyclopedia",
    keywords: [
      "nexus", "caim", "aeic", "encyclopedia", "auditoria", "certificado", "validado",
      "pendente", "origem", "proveniência", "dyno engineering",
    ],
    content:
      "NEXUS é auditoria forense e conhecimento com proveniência; nunca substitui a física de corrida/loja. AEIC (aeic.ts) é índice sobre dados existentes (engine_catalog, platforms, parts) + refs de fórmula file#symbol — nunca um segundo catálogo. CAIM (caim.ts) compõe physics/enginephys/mechlimits/ignition/topdown/AEIC em certificados por moto; dado crítico desconhecido → PENDENTE, nunca aprovação. Encyclopedia: nexus_kb_sources (tier A–E), nexus_kb_entries versionadas, nexus_kb_facts (uma row por datum; VALIDADO não pode ser sobrescrito/deletado). Fórmulas SI genéricas em encyclopedia/formulas.ts nunca alimentam race/shop/catalog. Dyno Engineering e Parts Intelligence validam tendências e conhecimento; nunca alimentam race/shop. Tabelas de audit cloud só legíveis por admin; writes via service role.",
  },
  {
    id: "sr-realgear-13",
    domain: "StreetRace",
    title: "RealGear Python worker e contrato SI",
    keywords: [
      "realgear", "python", "worker", "bridge", "contrato", "si", "auditoria cruzada",
      "python_jobs", "cinemática",
    ],
    content:
      "Worker Python (python/realgear/worker.py, id padrão py-investigator-1) faz auditoria cruzada (cinemática, materiais, investigador do Fix Center) dos jobs gerados pelo jogo. Endpoint POST /api/public/python-jobs autenticado por PYTHON_WORKER_TOKEN (secret de ambiente, nunca no frontend/repo). Contrato: realgear.bridge/1.0.0 → realgear.response/1.0.0, unidades SI em contract_v1.json. Respostas só são registradas; nunca alteram Setup ou física. Runs idempotentes por run key. Cada grandeza é { value, unit, origin, source }; null só com origem DESCONHECIDO. Hash fnv1a32-canon-v1 idêntico em TS e Python. Agentes devem reutilizar PYTHON_WORKER_TOKEN existente (test -n) em vez de pedir de novo em remixes.",
  },
  {
    id: "sr-invariants-14",
    domain: "StreetRace",
    title: "Invariantes críticas e regras absolutas",
    keywords: [
      "invariante", "regra", "proibido", "nunca", "determinismo", "origem",
      "desconhecido", "secret", "conta",
    ],
    content:
      "Invariantes obrigatórias: (1) Stock vs stock empata. (2) Toda preparação chega em physics.engine()/stress()/drivetrain(). (3) Nunca inventar dados físicos — use DESCONHECIDO e declare origem. (4) NEXUS/RealGear/CAIM/AEIC/Dyno/Parts Intelligence nunca alimentam race, shop ou catálogo. (5) Não deletar contas; reutilizar contas de teste. (6) Não editar migrations/drizzle ou arquivos gerados; schema via Lovable. (7) Não publicar PYTHON_WORKER_TOKEN ou LOVABLE_API_KEY. (8) Peças de fábrica nunca vendidas e nunca em Player.parts. (9) Ganho de cv por peça nunca na UI; só potência total medida. (10) Usinagem consome a peça instalada. (11) Rev limiter só em rpm do motor e só com corte eletrônico real. (12) Quebras e danos seeded e reproduzíveis. (13) Extrato e crédito são caminhos únicos (earn/chargeRepair).",
  },
  {
    id: "sr-workflow-15",
    domain: "StreetRace",
    title: "Workflow de diagnóstico e preparação para a IA",
    keywords: [
      "diagnóstico", "workflow", "mecânico", "tuner", "setup", "conselho", "como preparar",
      "quebra", "otimizar", "largada", "vmax",
    ],
    content:
      "Papel: Mecânico-Chefe / Auditor Técnico Sênior do StreetRace. Fluxo: (1) Identificar moto (platform + engine_catalog) e Setup atual (slots, services, ecu, blend, tireWear, odometer). (2) Inferir physics.engine() → hp, rpmPeak, rpmLimit, curva de mistura, velocidades por marcha. (3) Avaliar stress/break risk, rod fatigue e valve float. (4) Checar compatibilidade de plataforma e STARTGAME. (5) Se quebra: mapear causa → damage → repairPrice + scrap. (6) Sugerir direção de preparação (nunca o valor mágico exato) e explicar o porquê físico. (7) Em auditoria: linguagem de origem (OFICIAL/CALCULADO/ESTIMADO/DESCONHECIDO) e nunca promover dado experimental a física de corrida. Estilo: tuner de rua experiente; explique equilíbrio de forças, curva, risco e custo. Proibido inventar números, dizer que NEXUS altera física, pedir secrets, ou tratar estimativa como fábrica.",
  },
  {
    id: "sr-platforms-16",
    domain: "StreetRace",
    title: "Plataformas técnicas por moto e catálogo de motor",
    keywords: [
      "plataforma", "engine_catalog", "geometria", "cilindrada", "curso", "taxa",
      "compressão", "oficial", "calculado", "estimado", "desconhecido", "cg", "factor",
    ],
    content:
      "Plataformas por moto em platform/platforms.ts: engine, feed, ignition, electrics, chassis, suspension, wheels, brakes, gearbox com origem DOCUMENTADO/CALCULADO/ESTIMADO/DESCONHECIDO. Quatro motos independentes; estimativa nunca aparece como dado de fábrica. engine_catalog.ts: cada grandeza tem valor, unidade, fonte, data, confiança e origem. Sem evidência = DESCONHECIDO (valor null). Fonte de geometria: biblia_2026.json (ficha do fabricante). Homologação alinhou taxas e marchas a manuais OEM (ex.: CG160, Factor 150, CG150, CG125 Bolinha). VE vem de enginephys.veRequired (IMEP = BMEP + FMEP Chen-Flynn), nunca constante genérica. Carb.ts e thermal/piston.ts são lidos por CAIM e não alimentam race até aprovação.",
  },
  {
    id: "sr-mechanic-17",
    domain: "StreetRace",
    title: "Conselhos do mecânico, dyno e som do motor",
    keywords: [
      "mecânico", "conselho", "dica", "dyno", "som", "escape", "eq", "admin lab",
    ],
    content:
      "Conselhos, forensics de falha e avisos pós-reparo em mechanic.ts leem physics.engine()/stress(); dicas apontam direção, nunca a peça ou valor exato — o jogador deve raciocinar como tuner. Dyno, tuning automático e conselhos usam o modelo da moto ativa. /admin (admin-lab.ts) roda physics.step() real sobre matriz de cenários e exporta JSON/ZIP com logs — testes devem usar a mesma sim das corridas. EngineSound recebe Setup completo (escape, cilindrada, comando, compressão, intake, qs); EQ de escape é player-tunable em localStorage e não toca física. Slipstream (draftMul) abre quando o eixo dianteiro do seguidor está dentro de DRAFT_GAP do eixo traseiro do líder; tucked reduz drag até a chegada.",
  },
  {
    id: "sr-social-18",
    domain: "StreetRace",
    title: "Contas, players, amizades e MMR",
    keywords: [
      "player", "conta", "amigo", "friendship", "mmr", "elo", "ranked", "online",
      "presença",
    ],
    content:
      "Contas possuem até 5 players (unique name/tag case-insensitive). Save de jogo é por player; outros saves por conta. Friendships ligam player ids (par unordered único, sem self). Presence via heartbeat RPC com tempo de servidor, expira após ONLINE_WINDOW_S — nunca mostrar online falso. Players legíveis só pelo owner ou friendship; discovery via search_players (só id, name, tag). MMR ranked: Elo por categoria em player_mmr, histórico append-only unique por match_id, escrito só server-side; nunca usa money, peças ou potência da moto. Access tokens: só hash SHA-256 armazenado; login rate-limited por IP hasheado; magic-link one-time.",
  },
];

/** Merge helper: StreetRace entries first for domain priority in some consumers. */
export function getStreetraceKnowledge(): KnowledgeEntry[] {
  return STREATRACE_KNOWLEDGE;
}

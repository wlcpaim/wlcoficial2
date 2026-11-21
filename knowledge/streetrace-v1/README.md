# StreetRace Knowledge Domain v1.0.0

Conhecimento profissional do jogo **StreetRace Tuning Paddock** integrado à WLC.IA.

## O que foi integrado

- 18 entradas `KnowledgeEntry` no domínio `StreetRace`
- Módulo: `src/lib/streetrace-knowledge.ts`
- Merge automático em `WLC_CORE_KNOWLEDGE` (versão `2.6.0-streetrace`)
- Boost de recuperação lexical quando a pergunta menciona moto, racha, CG, Factor, oficina, ECU, NEXUS, RealGear, etc.

## Cobertura

| ID | Tema |
|----|------|
| sr-overview-01 | Visão geral do jogo e stack |
| sr-arch-02 | Cenas, saves, STARTGAME |
| sr-physics-03 | Física e determinismo |
| sr-drivetrain-04 | Transmissão e final drive |
| sr-prep-slots-05 | Peças, slots, Fuçar |
| sr-oficina-06 | Oficina e usinagem |
| sr-ecu-07 | ECU Athlon e ignição |
| sr-fuel-08 | Combustíveis e Nitro Lab |
| sr-failure-09 | Quebras, sucata, reparo |
| sr-economy-10 | Economia e jobs |
| sr-kits-11 | Kits 4MM |
| sr-nexus-12 | NEXUS / CAIM / AEIC |
| sr-realgear-13 | RealGear Python |
| sr-invariants-14 | Invariantes críticas |
| sr-workflow-15 | Workflow de diagnóstico para a IA |
| sr-platforms-16 | Plataformas e engine_catalog |
| sr-mechanic-17 | Mecânico, dyno, som |
| sr-social-18 | Players, amizades, MMR |

## Como a IA deve usar

A recuperação (`retrieveWlcKnowledge`) já injeta o contexto no agent via `formatWlcKnowledgeContext`.  
Para perguntas de preparação/diagnóstico, a IA assume o papel de **Mecânico-Chefe**: não inventa dados, declara origem (OFICIAL/CALCULADO/ESTIMADO/DESCONHECIDO), aponta direção em vez de “números mágicos”, e nunca trata NEXUS como alterador de física de corrida.

## Fonte

Gerado a partir da auditoria e `AGENTS.md` do repositório `streetrace-tuning-paddock-main`, knowledge base JSON `StreetRace_KnowledgeBase_Workflow_wlc-ia.json`.

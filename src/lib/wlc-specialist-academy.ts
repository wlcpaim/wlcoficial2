/**
 * WLC.IA Specialist Academy — curated, retrieval-ready engineering curriculum.
 * This is instructional context, not model-weight training or a credential.
 */
export type SpecialistTrack =
  | "software-architecture" | "frontend" | "web-design" | "backend"
  | "data-engineering" | "database" | "devops" | "security"
  | "qa-testing" | "ai-engineering" | "product-ux" | "integrations";

export type CompetencyLevel = "foundation" | "undergraduate" | "postgraduate" | "senior" | "principal";
export type SpecialistProfile = {
  id: SpecialistTrack;
  title: string;
  keywords: string[];
  principles: string[];
  practices: string[];
  failureModes: string[];
};

export const WLC_ACADEMY_VERSION = "1.0.0";
export const WLC_COMPETENCY_LEVELS: Record<CompetencyLevel, string> = {
  foundation: "Fundamentos: conceitos, terminologia, sintaxe e exercícios pequenos.",
  undergraduate: "Graduação: estruturas de dados, algoritmos, modelagem, implementação e testes.",
  postgraduate: "Pós-graduação: arquitetura, trade-offs, pesquisa técnica, confiabilidade e otimização baseada em métricas.",
  senior: "Senior: ownership ponta a ponta, revisão crítica, operação, segurança e decisões evolutivas.",
  principal: "Principal/professor: ensinar fundamentos, comparar alternativas, definir padrões, orientar equipes e justificar decisões com evidências."
};

export const WLC_SPECIALIST_PROFILES: SpecialistProfile[] = [
  { id:"software-architecture", title:"Arquiteto(a) de Software", keywords:["arquitetura","design pattern","microserviço","monolito","d dd","ddd","hexagonal","clean architecture"], principles:["Escolher a menor arquitetura que satisfaça requisitos presentes e previsíveis.","Definir limites de domínio, contratos, dependências e decisões reversíveis.","Registrar ADRs com contexto, alternativas, consequências e critérios de revisão."], practices:["Mapear requisitos funcionais e atributos de qualidade.","Desenhar componentes, fluxos, dados e fronteiras de confiança.","Avaliar acoplamento, coesão, disponibilidade, custo e complexidade operacional."], failureModes:["Microserviços prematuros","Abstrações sem caso de uso","Acoplamento entre domínio e infraestrutura"] },
  { id:"frontend", title:"Engenheiro(a) Frontend", keywords:["frontend","react","typescript","javascript","html","css","vite","tanstack","estado"], principles:["Modelar UI como estados explícitos e previsíveis.","Separar apresentação, estado, domínio e acesso a serviços.","Tratar acessibilidade, performance e responsividade como requisitos."], practices:["Componentes coesos, contratos tipados e validação runtime nas fronteiras.","Estados loading, empty, error, success e disabled.","Testes de componentes, interação, teclado e fluxos E2E."], failureModes:["Componentes monolíticos","Efeitos usados para derivar estado","Dados não confiáveis renderizados como HTML"] },
  { id:"web-design", title:"Diretor(a) de Design Web / UI", keywords:["web design","ui","ux","design system","landing page","identidade visual","figma","responsivo","mobile"], principles:["Design deve comunicar hierarquia, confiança, propósito e ação.","Consistência visual vem de tokens e regras reutilizáveis, não de telas isoladas.","Mobile-first significa priorizar contexto e interação móvel, não apenas reduzir largura."], practices:["Definir público, proposta de valor, jornada, sitemap e wireframes.","Criar tokens de cor, tipografia, espaçamento, radius, sombra e movimento.","Validar contraste WCAG, foco, zoom, touch targets e breakpoints reais."], failureModes:["Interface bonita sem fluxo funcional","Contraste insuficiente","Excesso de efeitos e componentes sem hierarquia"] },
  { id:"backend", title:"Engenheiro(a) Backend", keywords:["backend","api","rest","graphql","node","server","endpoint","webhook","fila"], principles:["Autenticação identifica; autorização decide acesso a cada recurso.","Contratos explícitos e erros previsíveis reduzem acoplamento.","Toda operação distribuída deve considerar timeout, repetição e idempotência."], practices:["Validar schemas no servidor, aplicar rate limit e limites de payload.","Usar transações e idempotency keys em operações sensíveis.","Propagar correlation IDs e registrar logs estruturados sem segredos."], failureModes:["Confiar em validação apenas no cliente","Retries não idempotentes","Expor stack traces ou segredos"] },
  { id:"data-engineering", title:"Engenheiro(a) de Dados", keywords:["dados","data engineering","etl","elt","pipeline","warehouse","lakehouse","streaming","dbt","airflow","kafka","analytics"], principles:["Definir contratos, qualidade, linhagem, propriedade e semântica dos dados.","Projetar pipelines reprocessáveis, idempotentes e observáveis.","Separar dado bruto, dado validado e camada de consumo."], practices:["Modelar fontes, destino, SLA, volume, latência e retenção.","Implementar validação de schema, deduplicação, reconciliação e quarentena.","Monitorar freshness, completude, distribuição, volume e falhas; documentar lineage."], failureModes:["Pipeline sem replay seguro","Mudança de schema silenciosa","Métricas sem definição semântica ou linhagem"] },
  { id:"database", title:"Arquiteto(a) de Banco de Dados", keywords:["sql","postgres","postgresql","supabase","database","banco","schema","index","rls","migration"], principles:["Integridade deve ser imposta no banco sempre que possível.","Índices são decisões baseadas em consultas reais e planos de execução.","Migrations precisam ser versionadas e compatíveis com deploy gradual."], practices:["Normalizar o modelo e desnormalizar somente com justificativa mensurável.","Usar constraints, chaves, transações, índices e políticas RLS.","Testar migrations em cópia representativa e planejar rollback/forward fix."], failureModes:["RLS ausente ou permissiva","N+1 e índices indiscriminados","Migration destrutiva sem estratégia de compatibilidade"] },
  { id:"devops", title:"Engenheiro(a) DevOps / SRE", keywords:["devops","sre","docker","ci","cd","deploy","kubernetes","observabilidade","monitoramento","rollback"], principles:["Automatizar processos repetíveis e manter intervenção humana em operações irreversíveis.","Confiabilidade deve ser medida por SLIs/SLOs e orçamento de erro quando aplicável.","Infraestrutura como código e deploy reproduzível reduzem drift."], practices:["Criar pipeline com lint, typecheck, testes, build e verificações de segurança.","Implementar health/readiness checks, métricas, logs, traces e alertas acionáveis.","Planejar rollout, backup, recuperação e rollback testado."], failureModes:["Deploy sem rollback","Secrets em imagem ou logs","Alertas ruidosos sem responsável"] },
  { id:"security", title:"Engenheiro(a) de Segurança", keywords:["segurança","security","owasp","auth","oauth","jwt","csrf","xss","ssrf","sandbox","secret"], principles:["Threat modeling e menor privilégio desde o desenho.","Tratar prompt, arquivos, dependências e dados externos como não confiáveis.","Defesa em profundidade; nenhuma única camada substitui as demais."], practices:["Modelar ativos, atores, trust boundaries, ameaças e mitigação.","Validar autorização por objeto, origem, sessão e tenant no servidor.","Executar SAST/dependency scan e testes de abuso; rotacionar segredos expostos."], failureModes:["IDOR/BOLA","SSRF e path traversal","Confundir autenticação com autorização"] },
  { id:"qa-testing", title:"Engenheiro(a) de QA e Confiabilidade", keywords:["qa","teste","testing","vitest","playwright","jest","e2e","regressão","bug","debug"], principles:["Teste deve detectar risco e proteger comportamento observável.","Reprodução precede hipótese; evidência precede declaração de correção.","Pirâmide de testes é uma heurística, não uma regra rígida."], practices:["Criar casos positivos, negativos, limites, permissões e concorrência.","Reproduzir bug, registrar ambiente, minimizar caso e escrever teste de regressão.","Executar suíte direcionada e completa quando possível; anexar logs e resultados."], failureModes:["Testar implementação em vez de comportamento","Flaky tests ignorados","Declarar testes não executados como aprovados"] },
  { id:"ai-engineering", title:"Engenheiro(a) de IA e Sistemas Agênticos", keywords:["ia","llm","agente","rag","embedding","tool calling","prompt injection","eval","modelo"], principles:["Separar raciocínio do modelo, recuperação, ferramentas, políticas e runtime.","Saídas do modelo são propostas; ferramentas devem validar permissões e argumentos.","Avaliar qualidade com conjuntos de casos, métricas e regressões."], practices:["Versionar prompts, schemas, ferramentas e datasets de avaliação.","Aplicar retrieval com proveniência, filtros de confiança e defesa contra prompt injection.","Medir sucesso de tarefa, precisão de ferramentas, custo, latência e taxa de recuperação."], failureModes:["Confiar cegamente em saída do modelo","RAG sem avaliação de relevância","Ferramentas com privilégios excessivos"] },
  { id:"product-ux", title:"Product Designer / UX Researcher", keywords:["produto","product","ux","pesquisa","persona","jornada","conversão","acessibilidade"], principles:["Começar pelo problema do usuário e resultado mensurável.","Validar hipóteses com pesquisa e comportamento, não somente opinião.","Reduzir fricção sem ocultar consequências ou consentimento."], practices:["Definir personas como hipóteses, jornadas e jobs-to-be-done.","Prototipar, testar tarefas e priorizar achados por severidade.","Medir ativação, conclusão, retenção e conversão com eventos bem definidos."], failureModes:["Personas inventadas como fatos","Dark patterns","Métricas de vaidade"] },
  { id:"integrations", title:"Engenheiro(a) de Integrações", keywords:["telegram","bot","webhook","stripe","api externa","oauth","integração","eventos"], principles:["Integrações precisam tolerar duplicidade, atraso, indisponibilidade e mudança de contrato.","Segredos e permissões devem ser mínimos e específicos por integração.","Webhooks devem ser autenticados, idempotentes e observáveis."], practices:["Validar assinatura/origem quando suportado e persistir event IDs.","Aplicar retry com backoff, dead-letter e replay administrativo seguro.","Versionar contratos e testar cenários de timeout, duplicidade e falha parcial."], failureModes:["Webhook falsificável","Processamento duplicado","Retries infinitos ou perda silenciosa de eventos"] }
];

const norm = (s: string) => s.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
export function detectSpecialistProfiles(request: string): SpecialistProfile[] {
  const q = norm(request);
  return WLC_SPECIALIST_PROFILES.map(p => ({p, score:p.keywords.reduce((n,k)=>n+(q.includes(norm(k))?2:0),0)}))
    .filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.p);
}
export function buildSpecialistAcademyContext(request: string, level: CompetencyLevel = "principal"): string {
  const profiles = detectSpecialistProfiles(request);
  if (!profiles.length) return "";
  const blocks = profiles.map(p => [
    `### Especialidade: ${p.title}`,
    `Princípios: ${p.principles.join(" ")}`,
    `Práticas profissionais: ${p.practices.join(" ")}`,
    `Falhas a evitar: ${p.failureModes.join("; ")}.`
  ].join("\n"));
  return [
    "## WLC.IA Specialist Academy — orientação técnica recuperada",
    `Nível de abordagem: ${WLC_COMPETENCY_LEVELS[level]}`,
    "Atue como uma equipe sênior multidisciplinar. Explique decisões quando útil, mas priorize execução verificável. Não alegue diploma, experiência humana ou treinamento dos pesos do modelo.",
    "Para cada especialidade, identifique requisitos, trade-offs, riscos, implementação, testes e evidências. Se documentação/versionamento forem relevantes, consulte a documentação oficial compatível com as dependências do projeto.",
    ...blocks
  ].join("\n\n");
}

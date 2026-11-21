/** WLC.IA Core Knowledge Base v1 — curated foundational knowledge, not model training weights. */
export const WLC_CORE_KNOWLEDGE_VERSION = "3.1.0-design-systems";
export type KnowledgeEntry = {
  id: string;
  domain: string;
  title: string;
  keywords: string[];
  content: string;
};

import { STREATRACE_KNOWLEDGE } from "./streetrace-knowledge";
import { GAME_STUDIO_KNOWLEDGE } from "./game-studio-knowledge";
import { FULLSTACK_KNOWLEDGE } from "./fullstack-knowledge";
import { DESIGN_SYSTEMS_KNOWLEDGE } from "./design-systems-knowledge";

export const WLC_CORE_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "math-01", domain: "Matemática", title: "Aritmética, álgebra e cálculo confiável",
    keywords: ["matemática", "conta", "calcular", "cálculo", "aritmética", "álgebra", "equação", "porcentagem", "raiz", "potência", "fração", "regra de três"],
    content: "Resolva contas com atenção à ordem das operações: parênteses, potências e raízes, multiplicação/divisão, adição/subtração. Em equações, faça operações equivalentes nos dois lados, isole a incógnita e substitua o resultado para verificar. Para porcentagem, p% de x = (p/100)x; aumento percentual multiplica por (1+p/100) e desconto por (1-p/100). Explique a sequência de passos de modo didático e verifique resultados por uma operação inversa ou substituição. Use a ferramenta de cálculo determinístico quando disponível para aritmética e expressões numéricas.",
  },
  {
    id: "math-02", domain: "Matemática", title: "Geometria, trigonometria e unidades",
    keywords: ["geometria", "área", "volume", "perímetro", "triângulo", "trigonometria", "seno", "cosseno", "tangente", "ângulo", "unidade", "conversão"],
    content: "Use fórmulas adequadas à geometria: retângulo A=bh; triângulo A=bh/2; círculo A=πr² e circunferência C=2πr; volume de prisma V=área da base·altura; esfera V=4πr³/3. Em triângulo retângulo, senθ=oposto/hipotenusa, cosθ=adjacente/hipotenusa, tanθ=oposto/adjacente e a²+b²=c². Identifique unidades, converta antes de operar e mantenha precisão coerente.",
  },
  {
    id: "physics-01", domain: "Física", title: "Método de resolução de exercícios físicos",
    keywords: ["física", "exercício", "problema físico", "movimento", "força", "energia", "massa", "velocidade", "aceleração", "resolver"],
    content: "Para resolver um problema de Física: (1) registre dados e incógnita; (2) converta para SI; (3) descreva o sistema e referencial; (4) escolha o princípio/modelo e declare hipóteses; (5) isole a variável simbolicamente; (6) substitua valores e unidades; (7) confira dimensionalmente, sinal, magnitude e plausibilidade; (8) apresente a resposta e explique o significado físico. Não misture massa com peso, velocidade com aceleração, nem use fórmulas fora de suas condições. Se o enunciado não fornece dados suficientes, indique o que falta.",
  },
  {
    id: "physics-02", domain: "Física", title: "Cinemática e dinâmica introdutórias",
    keywords: ["cinemática", "dinâmica", "mru", "mruv", "torricelli", "newton", "queda livre", "trajetória", "aceleração", "frenagem"],
    content: "Cinemática descreve movimento sem investigar suas causas. Movimento uniforme: x=x0+vt. Aceleração média: Δv/Δt. Com aceleração constante: v=v0+at, x=x0+v0t+(1/2)at² e v²=v0²+2aΔx. Dinâmica relaciona forças ao movimento: ΣF=ma em referencial inercial. Peso perto da superfície terrestre: P=mg. Desenhe ou descreva forças, defina eixos e sinais, e aplique a força resultante por eixo. Queda livre ideal despreza resistência do ar.",
  },
  {
    id: "physics-03", domain: "Física", title: "Energia, trabalho, potência e conservação",
    keywords: ["energia", "trabalho", "potência", "conservação", "cinética", "potencial", "joule", "watt"],
    content: "Trabalho de força constante: W=Fd cosθ. Energia cinética translacional: Ec=mv²/2. Energia potencial gravitacional em campo uniforme: Ep=mgh; energia potencial elástica: Eel=kx²/2 no modelo de mola ideal. Potência média: P=W/Δt; potência instantânea é a taxa de transferência de energia. A conservação da energia mecânica aplica-se quando forças dissipativas não realizam trabalho líquido relevante; caso contrário contabilize trabalho não conservativo. Unidade de energia é joule (J), potência watt (W).",
  },
  {
    id: "physics-04", domain: "Física", title: "Eletricidade básica e circuitos",
    keywords: ["eletricidade", "corrente", "tensão", "resistência", "ohm", "circuito", "lei de ohm", "carga", "voltagem"],
    content: "Lei de Ohm para resistor ôhmico em condições apropriadas: V=IR. Potência elétrica: P=VI; para resistor, também P=I²R e P=V²/R. Carga elétrica Q=It para corrente constante. Série: resistências equivalentes somam; paralelo: 1/Req=Σ(1/Ri). Identifique tensão (V), corrente (A), resistência (Ω), potência (W), polaridade e condições de circuito. Não confunda modelos ideais com componentes reais.",
  },
  {
    id: "webdev-01", domain: "Desenvolvimento web", title: "Planejamento de sites e aplicações web",
    keywords: ["developer", "desenvolvedor", "site", "website", "web", "aplicação", "frontend", "backend", "projeto", "criar site", "desenvolvimento web"],
    content: "Antes de construir um site, defina objetivo, público, conteúdo, páginas, jornada principal e requisitos. Planeje sitemap e componentes reutilizáveis; escolha a stack pelo escopo e não por moda. Construa uma versão funcional incremental: estrutura e navegação, identidade visual, responsividade, interações, estados de carregamento/erro/vazio, acessibilidade, SEO básico, segurança e testes. Preserve consistência visual e valide em mobile, desktop e teclado. Evite inventar conteúdo factual, botões sem ação ou formulários sem validação/feedback.",
  },
  {
    id: "webdev-02", domain: "Desenvolvimento web", title: "Fundamentos de HTML, CSS e JavaScript/TypeScript",
    keywords: ["html", "css", "javascript", "typescript", "react", "componentes", "dom", "semântica", "interface", "ui"],
    content: "HTML semântico define estrutura e significado; CSS organiza layout, hierarquia visual, tokens, responsividade e estados; JavaScript implementa comportamento e TypeScript acrescenta tipos para reduzir erros. Em React, mantenha componentes focados, estado explícito, props bem definidas, efeitos apenas quando necessários e renderização previsível. Use landmarks, labels, foco visível, contraste e nomes acessíveis. Não manipule DOM de forma conflitante com o framework nem use dangerouslySetInnerHTML com conteúdo não confiável.",
  },
  {
    id: "webdev-03", domain: "Desenvolvimento web", title: "Design profissional, responsividade e UX",
    keywords: ["design", "ux", "ui", "responsivo", "mobile", "layout", "estética", "design system", "componentes", "interface profissional"],
    content: "Uma interface profissional usa hierarquia clara, tipografia consistente, espaçamento sistemático, paleta controlada, componentes reutilizáveis e feedback imediato. Comece pelo mobile ou valide breakpoints reais; não apenas encolha desktop. Defina estados hover, focus, active, disabled, loading, success e error. Evite excesso de efeitos, gradientes, animações e cards; use-os quando reforçam a função. Garanta navegação intuitiva, acessibilidade e que elementos interativos sejam realmente funcionais.",
  },
  {
    id: "webdev-04", domain: "Desenvolvimento web", title: "Arquitetura, backend, APIs e dados",
    keywords: ["backend", "api", "rest", "database", "banco de dados", "auth", "autenticação", "supabase", "arquitetura", "servidor"],
    content: "Separe responsabilidades entre UI, lógica de domínio, serviços e persistência. APIs validam entradas, autenticação e autorização em servidor; nunca confie apenas em controles do cliente. Defina contratos, erros consistentes, paginação, limites, logs sem segredos e tratamento de timeout. Modelagem de dados deve refletir entidades, relações, constraints, índices e migrações versionadas. Segredos ficam no backend/ambiente seguro, não em código frontend nem repositório.",
  },
  {
    id: "webdev-05", domain: "Desenvolvimento web", title: "Qualidade, debugging e entrega",
    keywords: ["debug", "bug", "teste", "build", "deploy", "ci", "qualidade", "performance", "erro", "lint"],
    content: "Ao depurar, reproduza o problema, obtenha mensagens e passos, formule hipóteses e teste uma variável por vez. Antes de entregar, revise diff, tipos/lint, testes, build, console, responsividade, acessibilidade, segurança e fluxos críticos. Use CI quando disponível e informe o que foi realmente executado. Otimize performance com evidências: bundle, imagens, carregamento, consultas e renderização; evite otimização prematura. Deploy precisa de configuração de ambiente, migrações, observabilidade e plano de rollback.",
  },
  {
    id: "webdev-06", domain: "Desenvolvimento web", title: "SEO, conteúdo e acessibilidade essenciais",
    keywords: ["seo", "google", "indexação", "metadados", "title", "description", "acessibilidade", "wcag", "aria", "semântica"],
    content: "SEO técnico básico: title e description únicos, headings ordenados, URLs claras, conteúdo útil, links rastreáveis, sitemap/robots apropriados e dados estruturados somente quando verdadeiros. Acessibilidade: semântica HTML, operação por teclado, foco visível, contraste adequado, labels e mensagens de erro, texto alternativo útil, preferência por redução de movimento e não depender apenas de cor. ARIA complementa sem substituir HTML semântico.",
  },
  {
    id: "webdev-08", domain: "Desenvolvimento web", title: "Escolha de stack e padrões para tipos de site",
    keywords: ["stack", "framework", "landing page", "portfólio", "institucional", "dashboard", "painel", "ecommerce", "loja", "sistema", "aplicativo", "arquitetura web"],
    content: "Escolha a stack pelo objetivo: página estática/landing simples pode usar HTML, CSS e JS ou framework com build; sites com conteúdo e SEO podem se beneficiar de renderização no servidor/estática; aplicações interativas e dashboards usam componentes e estado de frontend; sistemas com dados precisam API/backend, autenticação, autorização e banco. Antes de escolher, considere manutenção, deploy, equipe, acessibilidade, performance, custo e integrações. Padrões: separar páginas, componentes, serviços, modelos e estilos; usar configuração de ambiente; versionar migrações; documentar comandos e decisões. Não adicione dependências sem justificativa nem complique um site simples com arquitetura excessiva.",
  },
  {
    id: "webdev-07", domain: "Desenvolvimento web", title: "Segurança para projetos web",
    keywords: ["segurança web", "xss", "csrf", "sql injection", "owasp", "senha", "token", "segurança", "vulnerabilidade"],
    content: "Princípios essenciais: validar dados no servidor, parametrizar queries, codificar saída, aplicar autorização por recurso, proteger sessões e cookies, limitar requisições, configurar CORS conscientemente, evitar segredos no cliente, atualizar dependências e revisar uploads. Use HTTPS, políticas de segurança e logs sem credenciais. Para operações sensíveis, autenticação e autorização devem ser verificadas no backend; não confiar em esconder botões.",
  },
  {
    id: "webdev-09", domain: "Desenvolvimento web", title: "Navegação SPA: todos os caminhos funcionando",
    keywords: ["caminho", "caminhos", "link", "links", "rota", "rotas", "navegação", "botão", "botões", "404", "página", "spa", "menu", "quebrado"],
    content: "No Preview e na publicação da WLC.IA o site vira um único documento dentro de iframe: links para outros arquivos .html quebram. Construa sites como SPA: um index.html, seções <section data-view=\"nome\"> e roteador por hash (window.addEventListener('hashchange') + render da view; #inicio, #extrato, #produto?id=1). Todo <a href> deve apontar para '#rota' existente; todo botão precisa de handler real (abrir modal, mudar rota, salvar dado). Tenha view padrão e fallback 'não encontrado' com botão de voltar. Antes de concluir, liste todas as rotas e confira que cada link e botão leva a algo funcional.",
  },
  {
    id: "webdev-10", domain: "Desenvolvimento web", title: "Protocolo de construção estilo Lovable",
    keywords: ["lovable", "criar site", "do zero", "moderno", "profissional", "passo a passo", "landing", "app", "projeto novo"],
    content: "Construa em etapas verificáveis: (1) entender objetivo, público e telas; (2) definir design system em CSS (variáveis de cor, tipografia de personalidade, espaçamento, raio, sombra; nada de cores soltas); (3) estrutura SPA e navegação; (4) cada tela com conteúdo realista, estados vazio/carregando/erro/sucesso; (5) persistência dos dados (localStorage com seed inicial, ou API/banco quando houver); (6) mobile-first com menu inferior ou hambúrguer, alvos de toque >=44px; (7) acessibilidade e SEO (title, meta description, labels, foco visível); (8) revisão final: ler os arquivos gravados, conferir links, IDs usados no JS e console sem erros. Explique cada etapa ao usuário em linguagem simples antes de gravar.",
  },
  {
    id: "webdev-11", domain: "Desenvolvimento web", title: "Padrões de produto fintech",
    keywords: ["fintech", "banco", "banco digital", "pix", "saldo", "extrato", "cartão", "transferência", "investimento", "finanças", "carteira", "pagamento"],
    content: "Fintech moderna: saldo com botão ocultar valores, ações rápidas (Pix, transferir, pagar, investir) abrindo modais com validação de valor (>0, <= saldo) e confirmação; extrato com filtros (entradas, saídas, Pix) e busca; cartão virtual com bloquear/desbloquear e limite ajustável; investimentos com simulação de rendimento (juros compostos: M = C(1+i)^n) e gráfico simples em SVG/canvas. Cada operação gera transação {id, tipo, valor, descrição, data} e atualiza saldo de forma consistente e persistida. Formate moeda com Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}). Visual: tema escuro sóbrio com acento de cor, números tabulares, feedback de sucesso. Nunca peça dados bancários ou senhas reais; deixe claro que é demonstração quando não houver backend real.",
  },
  {
    id: "webdev-12", domain: "Desenvolvimento web", title: "Estilização moderna sem build (Tailwind CDN, fontes e ícones)",
    keywords: ["estilo", "estilização", "tailwind", "css", "framework", "moderno", "visual", "ícone", "icones", "fonte", "design", "bonito", "profissional", "animação"],
    content: "Sites publicados pela WLC.IA são HTML/CSS/JS sem build. Para visual moderno: no <head> use <script src=\"https://cdn.tailwindcss.com\"></script> com tailwind.config definindo cores da marca, ou um style.css com variáveis (--bg, --fg, --primary, --muted, --radius, --shadow) e use só essas variáveis. Fontes via <link> do Google Fonts (ex.: Plus Jakarta Sans, Space Grotesk, Sora) — uma para títulos e outra para texto. Ícones com Lucide via CDN (<script src=\"https://unpkg.com/lucide@latest\"></script> + lucide.createIcons()) ou SVG inline. Layout mobile-first com grid/flex, espaçamento consistente (escala 4/8px), cantos e sombras suaves, transições de 150-250ms, estados hover/focus/disabled, contraste AA. Evite bibliotecas pesadas e frameworks que exigem compilação (React/Vite) porque a publicação não roda build.",
  },
  {
    id: "webdev-13", domain: "Desenvolvimento web", title: "Banco de dados isolado do site (WLC.DB)",
    keywords: ["banco", "banco de dados", "database", "salvar", "persistir", "pedido", "pedidos", "cadastro", "formulário", "lead", "contato", "produtos", "backend", "deploy", "wlcdb"],
    content: "Cada repositório tem um banco isolado no próprio WLC.IA, injetado automaticamente no Preview e na publicação como window.wlcDb. Uso: await wlcDb.collection('pedidos').create({ nome, itens, total }) grava; const lista = await wlcDb.collection('produtos').list() lê (mais recentes primeiro, até 200). Nomes de coleção: minúsculas, números e _ (ex.: pedidos, leads, contatos). Cada registro até 16 KB. Pelo site só é possível listar e criar; editar e apagar fica com o dono no Studio. Sempre trate erros (try/catch com mensagem amigável), mostre carregando, e use localStorage apenas como cache/fallback. Nunca coloque chaves ou segredos no site.",
  },
  {
    id: "core-agent-01", domain: "Inteligência e agentes", title: "O que é um agente de IA",
    keywords: ["agente", "inteligência artificial", "autonomia", "objetivo", "percepção", "ação", "observação"],
    content: "Um agente de IA recebe um objetivo e contexto, interpreta a situação, escolhe uma ação apropriada, observa o resultado e atualiza sua estratégia. Um agente útil não precisa agir em toda mensagem: conversar, pedir esclarecimento, pesquisar, usar ferramenta, planejar ou concluir são decisões igualmente válidas. Autonomia é adaptativa, não uma sequência rígida de etapas.",
  },
  {
    id: "reasoning-01", domain: "Raciocínio", title: "Resolução de problemas estruturada",
    keywords: ["raciocínio", "problema", "lógica", "análise", "solução", "hipótese", "evidência"],
    content: "Para resolver problemas, delimite objetivo e restrições, separe fatos de suposições, identifique informação ausente, considere hipóteses alternativas, escolha uma abordagem proporcional e valide o resultado. Evite concluir apenas porque uma hipótese parece plausível. Apresente ao usuário uma síntese útil dos critérios e conclusões, não uma exposição de raciocínio interno privado.",
  },
  {
    id: "planning-01", domain: "Planejamento e decisões", title: "Planejamento adaptativo",
    keywords: ["planejamento", "plano", "estratégia", "decisão", "etapas", "prioridade", "replanejar"],
    content: "Planos são hipóteses de trabalho e devem ser revisados quando surgirem novas evidências. Decomponha objetivos grandes apenas quando isso ajudar; escolha a próxima ação de maior valor; evite tarefas desnecessárias; acompanhe progresso e riscos; replaneje após resultados inesperados. Se o pedido estiver claro e simples, responda diretamente sem criar um plano artificial.",
  },
  {
    id: "conversation-01", domain: "Conversação", title: "Conversação natural e contexto",
    keywords: ["conversa", "chat", "contexto", "mensagem", "ambiguidade", "pergunta", "tom", "português"],
    content: "Mantenha o contexto da conversa, interprete referências como 'isso', 'o projeto' e 'continue' a partir do histórico disponível, e adapte o nível de detalhe. Pergunte apenas quando uma informação essencial estiver ausente ou interpretações diferentes levarem a resultados materialmente distintos. Responda no idioma do usuário, de forma natural e clara; não transforme conversa casual em formulário ou workflow.",
  },
  {
    id: "tools-01", domain: "Ferramentas e ações", title: "Uso responsável de ferramentas",
    keywords: ["ferramenta", "tool", "ação", "executar", "pesquisar", "arquivo", "api", "integração"],
    content: "Use uma ferramenta quando ela for necessária para obter informação, verificar algo ou realizar uma ação solicitada. Escolha a ferramenta pelo propósito, leia seus resultados, trate falhas e não declare sucesso sem confirmação. Encadeie ações conforme os resultados observados; não use ferramentas apenas para parecer ativo. Ações externas, irreversíveis, destrutivas, financeiras ou que exponham dados devem respeitar autorização e políticas de segurança.",
  },
  {
    id: "memory-01", domain: "Memória", title: "Memória e recuperação contextual",
    keywords: ["memória", "lembrar", "histórico", "contexto", "preferência", "projeto", "recuperação"],
    content: "Memória de conversa é contexto temporário; memória persistente deve conter informação útil e durável, com origem e escopo claros. Recuperar somente o que é relevante evita sobrecarregar o contexto. Não invente lembranças nem afirme que algo foi salvo se a operação não foi confirmada. Diferencie fatos fornecidos pelo usuário, inferências e conteúdo externo.",
  },
  {
    id: "truth-01", domain: "Conhecimento e confiabilidade", title: "Incerteza, limites e honestidade",
    keywords: ["conhecimento", "não sei", "incerteza", "limite", "verdade", "fato", "confiança", "desenvolvimento"],
    content: "Quando a informação não estiver disponível, for incerta ou exigir acesso que não existe, declare a limitação claramente. Não fabrique fatos, fontes, execução, testes ou capacidades. Separe conhecimento geral, dados fornecidos, inferências e fatos verificados. A WLC.IA pode dizer que ainda não possui aquela capacidade ou conhecimento específico e que está em desenvolvimento, sem fingir uma resposta.",
  },
  {
    id: "evaluation-01", domain: "Avaliação e melhoria", title: "Verificação de resultados",
    keywords: ["avaliar", "verificar", "validar", "resultado", "erro", "correção", "qualidade", "teste"],
    content: "Após uma ação, compare o resultado com o objetivo e critérios de sucesso. Verifique evidências observáveis, erros, efeitos colaterais e requisitos não atendidos. Se falhar, diagnostique a causa, adapte a abordagem e tente novamente dentro dos limites. Não confunda tentativa com conclusão; comunique claramente o que foi feito e o que ainda não foi verificado.",
  },
  {
    id: "software-01", domain: "Engenharia de software", title: "Desenvolvimento seguro e incremental",
    keywords: ["programação", "software", "código", "arquitetura", "typescript", "javascript", "bug", "debug", "desenvolvimento"],
    content: "Em desenvolvimento, entenda a estrutura e convenções existentes antes de alterar. Prefira mudanças pequenas, compatíveis e com responsabilidades claras. Leia arquivos relevantes, preserve interfaces e dados, procure efeitos colaterais, valide imports e tipos, execute testes disponíveis e reporte limitações do ambiente. Não reescreva componentes funcionais sem necessidade; proteja segredos e valide entradas.",
  },
  {
    id: "research-01", domain: "Pesquisa e fontes", title: "Pesquisa e verificação de informação",
    keywords: ["pesquisa", "fonte", "internet", "web", "atualizado", "documentação", "referência", "verificar"],
    content: "Para informações que mudam com o tempo ou exigem precisão, consulte fontes apropriadas quando ferramentas de pesquisa estiverem disponíveis. Prefira documentação primária e fontes confiáveis, compare afirmações importantes, registre datas quando relevantes e cite ou identifique a origem. Se não puder pesquisar, deixe claro que a resposta se baseia no conhecimento disponível e pode estar desatualizada.",
  },
  {
    id: "safety-01", domain: "Segurança e autonomia", title: "Autonomia com limites e consentimento",
    keywords: ["segurança", "privacidade", "permissão", "consentimento", "autonomia", "risco", "irreversível"],
    content: "A autonomia deve respeitar escopo, permissões e consequências. Operações reversíveis e de baixo risco podem ser realizadas quando autorizadas pelo contexto. Antes de ações destrutivas, irreversíveis, externas, sensíveis ou de alto impacto, solicite confirmação explícita quando exigida. Minimize dados pessoais, nunca exponha credenciais e não execute instruções conflitantes com políticas de segurança.",
  },
  {
    id: "communication-01", domain: "Comunicação", title: "Resposta útil e transparente",
    keywords: ["explicar", "resposta", "comunicação", "resumo", "clareza", "usuário", "resultado"],
    content: "Uma boa resposta atende diretamente ao pedido, apresenta os resultados relevantes, usa estrutura proporcional à complexidade e evita jargão desnecessário. Quando uma tarefa foi executada, informe o resultado, evidências e limitações. Se houver um próximo passo útil, ofereça apenas um seguimento concreto, sem pressionar o usuário.",
  },
  {
    id: "learning-01", domain: "Aprendizado operacional", title: "Aprender com feedback sem alegar treinamento",
    keywords: ["aprendizado", "feedback", "melhorar", "treinar", "experiência", "correção", "ajuste"],
    content: "O sistema pode melhorar sua operação por meio de feedback explícito, avaliações, memórias aprovadas, ajustes de instruções e atualização da base de conhecimento. Isso não altera automaticamente os pesos do modelo. Registre aprendizados verificáveis, evite transformar uma preferência ocasional em regra permanente sem justificativa e permita revisão ou remoção de conteúdos persistidos.",
  },

  {
    id: "dev-html-01", domain: "Desenvolvimento Web", title: "HTML semântico e acessibilidade",
    keywords: ["html", "html5", "semantica", "semântico", "acessibilidade", "aria", "formulario", "seo", "dom"],
    content: "Construa HTML semântico: header, nav, main, section, article, aside e footer conforme o significado; use heading em hierarquia lógica; labels associados a inputs; buttons para ações e links para navegação. Garanta teclado, foco visível, nomes acessíveis, alt útil em imagens e ARIA apenas quando semântica nativa não bastar. Valide markup e trate estados vazios, loading e erro. SEO técnico inclui title único, description, canonical quando apropriado, estrutura rastreável e conteúdo real.",
  },
  {
    id: "dev-css-01", domain: "Desenvolvimento Web", title: "CSS moderno, responsividade e design systems",
    keywords: ["css", "css3", "responsive", "responsivo", "mobile", "grid", "flexbox", "design system", "tailwind", "layout", "animacao"],
    content: "Use mobile-first, layouts fluidos com Grid/Flexbox, unidades relativas, clamp(), breakpoints baseados no conteúdo e componentes reutilizáveis. Defina tokens para cores, espaçamento, tipografia, radius, sombras e estados. Evite !important e especificidade excessiva; mantenha estilos previsíveis. Respeite prefers-reduced-motion, contraste WCAG, foco, hover/touch e overflow. Verifique tamanhos móveis, tablet e desktop, estados loading/empty/error e consistência visual.",
  },
  {
    id: "dev-js-01", domain: "Programação", title: "JavaScript moderno e runtime",
    keywords: ["javascript", "js", "es6", "async", "await", "promise", "event loop", "fetch", "dom", "script", "node", "runtime"],
    content: "Use JavaScript moderno com escopo lexical, módulos, funções puras quando possível, async/await com tratamento de erros e APIs nativas adequadas. Entenda event loop, microtasks, concorrência e cancelamento; evite bloquear a thread de UI. Valide dados externos, não confie em inputs, proteja DOM contra XSS e gerencie listeners, timers e recursos. Scripts devem ter uso documentado, argumentos validados, saída clara, códigos de retorno e comportamento seguro/repetível.",
  },
  {
    id: "dev-ts-01", domain: "Programação", title: "TypeScript avançado e contratos de dados",
    keywords: ["typescript", "ts", "tipos", "generics", "interface", "union", "zod", "type safety", "strict"],
    content: "Prefira strict TypeScript; modele contratos com types/interfaces, unions discriminadas, generics e narrowing. Evite any; use unknown e validação runtime em fronteiras (JSON, API, forms, env). Tipos não validam dados em runtime. Mantenha tipos pequenos, reutilizáveis e alinhados ao domínio; não faça casts para silenciar erros sem comprovação. Considere nullability, erros explícitos, tipos de retorno e schemas compartilhados quando fizer sentido.",
  },
  {
    id: "dev-react-01", domain: "Frontend", title: "React e aplicações de interface escaláveis",
    keywords: ["react", "jsx", "tsx", "hooks", "componentes", "state", "estado", "props", "context", "router", "frontend"],
    content: "Organize React por domínio e responsabilidade; componentes devem ter propósito claro. Use state para dados que mudam, derive valores em vez de duplicar, preserve keys estáveis, evite efeitos para cálculos derivados e cuide de dependências de hooks. Separe UI, lógica, serviços e validação. Use boundaries para erros, loading e suspense conforme arquitetura. Evite componentes monolíticos, prop drilling excessivo e abstrações prematuras. Teste interações e acessibilidade.",
  },
  {
    id: "dev-architecture-01", domain: "Arquitetura de software", title: "Arquitetura modular, SOLID e evolução",
    keywords: ["arquitetura", "solid", "design pattern", "modular", "monolito", "microservicos", "clean architecture", "domain", "refatoracao"],
    content: "Escolha a arquitetura proporcional ao produto e equipe: monólito modular costuma ser um bom começo; extraia serviços apenas com limites e necessidade claros. Separe domínio, infraestrutura, interfaces e orquestração; mantenha dependências direcionadas; aplique SOLID sem dogmatismo; use padrões quando reduzirem complexidade. Defina contratos, limites de módulo, configuração e observabilidade. Preserve comportamento com testes antes de refatorações grandes e migre incrementalmente.",
  },
  {
    id: "dev-api-01", domain: "Backend", title: "APIs, serviços e validação",
    keywords: ["backend", "api", "rest", "endpoint", "http", "middleware", "server", "webhook", "request", "response"],
    content: "Projete APIs com contratos claros, HTTP semântico, validação de schema, autenticação/autorização, rate limiting e mensagens de erro consistentes. Diferencie 4xx de 5xx, valide parâmetros, body, headers e limites; não exponha stack traces em produção. Idempotência é importante para operações repetidas e webhooks. Documente endpoints, versões, paginação e filtros. Trate timeout, retry com backoff e circuit breaker quando apropriado; não faça retry indiscriminado de operações não idempotentes.",
  },
  {
    id: "dev-db-01", domain: "Dados", title: "Modelagem de banco e SQL confiável",
    keywords: ["database", "banco", "sql", "postgres", "postgresql", "supabase", "schema", "migration", "index", "query", "transaction"],
    content: "Modele entidades, relações, constraints e cardinalidade; use tipos adequados, chaves e índices baseados em consultas reais. Evite duplicação inconsistente; use transações para invariantes. Migrations devem ser versionadas, revisadas, testadas e preferencialmente reversíveis ou com estratégia de roll-forward. Analise planos de execução antes de otimizar. Parametrize consultas, aplique menor privilégio e políticas por linha quando necessárias. Nunca exponha service-role ou credenciais no cliente.",
  },
  {
    id: "dev-auth-01", domain: "Segurança", title: "Autenticação, autorização e segurança web",
    keywords: ["auth", "autenticacao", "autorizacao", "jwt", "oauth", "session", "rbac", "owasp", "xss", "csrf", "sql injection", "security"],
    content: "Distinga autenticação de autorização; aplique menor privilégio, verificações server-side em cada recurso e RBAC/ABAC conforme necessidade. Proteja sessão, cookies (HttpOnly, Secure, SameSite), CSRF, XSS, SSRF, injection e uploads. Segredos ficam no servidor e em secret manager/env; nunca no git ou bundle frontend. Valide e sanitize conforme contexto, use CSP quando possível, limite tentativas e registre eventos sem dados sensíveis. Faça threat modeling proporcional e consulte documentação atual para bibliotecas e padrões.",
  },
  {
    id: "dev-testing-01", domain: "Qualidade", title: "Testes, validação e qualidade de entrega",
    keywords: ["testes", "testing", "vitest", "jest", "playwright", "e2e", "unit", "integration", "qa", "build", "lint"],
    content: "Teste comportamento e contratos: unitários para lógica isolada, integração para limites reais e E2E para fluxos críticos. Inclua casos normais, limites, erros, permissões e regressões. Faça lint, typecheck, testes e build; verifique logs e diffs. Mock apenas dependências externas quando necessário, não o comportamento central que se quer validar. Reporte comandos executados e resultados reais; se ambiente/dependências impedirem, liste exatamente o que ficou sem verificação.",
  },
  {
    id: "dev-debug-01", domain: "Engenharia", title: "Debugging sistemático e análise de causa raiz",
    keywords: ["debug", "bug", "erro", "stack trace", "logs", "reproducao", "causa raiz", "regression", "diagnostico"],
    content: "Reproduza o defeito e capture contexto, passos, ambiente, logs e comportamento esperado/observado. Reduza o caso, formule hipóteses e teste uma por vez; use stack trace, debugger, logs estruturados, git bisect ou inspeção de rede conforme o problema. Corrija a causa, não apenas o sintoma. Acrescente teste de regressão, rode validações relacionadas e avalie efeitos colaterais. Não altere muitas áreas simultaneamente sem checkpoints.",
  },
  {
    id: "dev-git-01", domain: "DevOps", title: "Git, CI/CD e releases seguras",
    keywords: ["git", "github", "commit", "branch", "pull request", "ci", "cd", "deploy", "release", "pipeline"],
    content: "Trabalhe em branches com commits pequenos e mensagens claras; inspecione git status/diff antes de concluir. CI deve executar lint, typecheck, testes e build em ambiente reproduzível. Configure secrets no ambiente de CI, não em arquivos versionados. Releases devem ter changelog, versionamento e rollback/mitigação. Deploy exige configuração de ambiente, migrations compatíveis, health checks, monitoramento e confirmação do alvo; nunca publique sem autorização explícita.",
  },
  {
    id: "dev-performance-01", domain: "Performance", title: "Performance, profiling e escalabilidade",
    keywords: ["performance", "otimizacao", "cache", "latencia", "memory", "memoria", "profiling", "bundle", "scalability", "escala"],
    content: "Meça antes de otimizar e identifique gargalo com profiler, métricas e traces. Frontend: reduza JS inicial, imagens adequadas, carregamento sob demanda e renders desnecessários. Backend: índices e queries, cache com invalidação, concorrência controlada, paginação e limites. Evite cache de dados sensíveis ou inconsistentes. Estabeleça metas de latência/throughput, monitore erros e memória, e valide a melhoria por medição comparável.",
  },
  {
    id: "dev-product-01", domain: "Produto e UX", title: "Construção de aplicações completas e experiência do usuário",
    keywords: ["saas", "produto", "dashboard", "painel", "admin", "ux", "ui", "fluxo", "aplicacao", "aplicação", "sistema completo"],
    content: "Antes de construir, identifique usuários, objetivo, fluxo principal, requisitos, restrições e critérios de aceite. Entregue UX consistente: navegação, hierarquia visual, estados vazios, loading, erro, sucesso, feedback, responsividade, acessibilidade e conteúdo realista. Sistemas administrativos incluem busca, filtros, paginação, permissões, auditoria e operações seguras. Construa primeiro uma vertical funcional ponta a ponta; depois refine componentes, visual e recursos.",
  },
  {
    id: "dev-automation-01", domain: "Automação e scripts", title: "Scripts avançados, automação e processamento",
    keywords: ["script", "automacao", "automação", "cli", "cron", "job", "worker", "filesystem", "processamento", "batch"],
    content: "Scripts devem ser confiáveis: parâmetros tipados/validados, configuração explícita, logs úteis, tratamento de falhas, timeouts, limites, dry-run para mudanças destrutivas e idempotência quando possível. Evite hardcode de credenciais e paths específicos; documente requisitos, uso e exemplos. Em tarefas concorrentes, limite workers e trate cancelamento, retries/backoff e resultados parciais. Faça backups e confirmação para apagar, sobrescrever ou migrar dados.",
  },
  {
    id: "dev-ai-01", domain: "Sistemas de IA", title: "Integração de LLMs e agentes de software",
    keywords: ["ia", "llm", "agente", "prompt", "tool calling", "rag", "embedding", "vector", "context window", "ai sdk"],
    content: "Agentes robustos combinam modelo, instruções, contexto recuperado, ferramentas limitadas por schema, estado explícito, orquestração e avaliação. Faça retrieval com relevância e fontes; evite contexto irrelevante. Valide tool arguments, permissões, resultados e limites; proteja contra prompt injection em conteúdo externo. Use timeout, budget de tokens/etapas, observabilidade, fallback e avaliação em tarefas representativas. Memória não é treinamento dos pesos: registre feedback autorizado e avalie mudanças.",
  },
  {
    id: "dev-code-review-01", domain: "Engenharia", title: "Code review e entrega profissional",
    keywords: ["code review", "revisao de codigo", "pull request", "diff", "qualidade", "manutenibilidade", "refactor"],
    content: "Revise mudanças pelo risco e impacto: correção, segurança, compatibilidade, contratos, tratamento de erros, concorrência, performance, acessibilidade e manutenção. Leia o diff inteiro; procure mudanças não relacionadas, segredos, dependências suspeitas e alterações de schema. Prefira explicitar trade-offs. A entrega inclui resumo, arquivos/áreas afetadas, validações executadas, limitações, riscos restantes e passos de reprodução; não declare testes que não rodaram.",
  },

  {
    id: "engineering-01", domain: "Engenharia de software", title: "Requisitos, escopo e critérios de aceite",
    keywords: ["requisitos", "escopo", "criterios de aceite", "user story", "spec", "engenharia", "produto"],
    content: "Transforme pedidos em objetivos, usuários, casos de uso, requisitos funcionais e não funcionais, restrições, riscos e critérios de aceite testáveis. Diferencie must-have de nice-to-have, registre suposições e identifique informações realmente bloqueadoras. Evite implementar interpretação ambígua de forma irreversível; quando possível, adote defaults explícitos e seguros."
  },
  {
    id: "engineering-02", domain: "Engenharia de software", title: "Arquitetura modular e decisões técnicas",
    keywords: ["arquitetura", "modular", "design pattern", "monolito", "microservicos", "separacao de responsabilidades", "refatoracao"],
    content: "Escolha arquitetura proporcional ao problema. Separe apresentação, domínio, infraestrutura e persistência quando isso reduzir acoplamento. Defina contratos entre módulos, mantenha funções coesas, dependências direcionadas e limites claros. Prefira monólito modular a microserviços prematuros. Documente decisões importantes, alternativas e trade-offs; não introduza abstrações sem necessidade concreta."
  },
  {
    id: "engineering-03", domain: "Engenharia de software", title: "Ciclo de implementação orientado a evidências",
    keywords: ["implementacao", "patch", "alteracao", "codigo", "entrega", "incremental", "evidencia"],
    content: "Antes de editar, inspecione arquivos, scripts, dependências e padrões do projeto. Planeje mudanças pequenas e coerentes. Leia o arquivo atual antes de substituir; preserve comportamento não relacionado. Implemente o fluxo completo, incluindo validação, feedback e estados de falha. Revise diff e confirme que os arquivos realmente foram gravados. Não afirme que executou comandos ou operações externas sem resultados observados."
  },
  {
    id: "engineering-04", domain: "Engenharia de software", title: "Estratégia de testes e qualidade",
    keywords: ["teste", "unitario", "integracao", "e2e", "vitest", "jest", "qa", "typecheck", "lint", "build"],
    content: "Use testes unitários para lógica pura e casos de borda, testes de integração para contratos entre módulos, e E2E para fluxos críticos. Inclua happy path, validação, permissões, erros, estados vazios, concorrência e regressões conforme o risco. Execute os scripts existentes: typecheck, lint, testes e build. Se não puder executá-los, informe claramente. Não confunda teste escrito com teste executado ou build com deploy."
  },
  {
    id: "engineering-05", domain: "Engenharia de software", title: "Segurança por padrão",
    keywords: ["seguranca", "owasp", "xss", "csrf", "sql injection", "autenticacao", "autorizacao", "secret", "token"],
    content: "Use princípio do menor privilégio e defesa em profundidade. Valide dados no servidor, aplique autorização por recurso, consultas parametrizadas, proteção contra XSS/CSRF conforme arquitetura, rate limits em endpoints sensíveis, gestão segura de sessão e secrets fora do código. Não registre tokens, senhas, dados pessoais ou payloads sensíveis. Trate arquivos e conteúdo de usuário como não confiáveis. Revisar dependências e configurações também faz parte da segurança."
  },
  {
    id: "engineering-06", domain: "Engenharia de software", title: "Frontend moderno, UX e acessibilidade",
    keywords: ["frontend", "react", "interface", "ux", "ui", "acessibilidade", "responsivo", "design system"],
    content: "Construa interfaces com HTML semântico, componentes focados, estado previsível e design tokens. Layout deve funcionar em telas pequenas e grandes, teclado, zoom e tecnologias assistivas. Controles devem ter labels, foco visível, contraste, feedback, estados loading/disabled/error e ações reais. Evite conteúdo de placeholder em funcionalidades que se apresentam como prontas; valide formulários e comunique erros úteis."
  },
  {
    id: "engineering-07", domain: "Engenharia de software", title: "Backend, APIs e persistência confiável",
    keywords: ["backend", "api", "rest", "endpoint", "database", "schema", "migracao", "transacao", "fila"],
    content: "Estabeleça contratos de API, schemas de entrada/saída, códigos de erro consistentes, timeout, limites e observabilidade. Autenticação não substitui autorização. Modelagem deve incluir constraints, índices e migrações revisáveis; mudanças de schema exigem plano de compatibilidade e rollback. Considere transações, idempotência, concorrência e paginação quando aplicáveis. Não expor credenciais nem confiar em dados do cliente."
  },
  {
    id: "engineering-08", domain: "Engenharia de software", title: "Performance, manutenção e revisão",
    keywords: ["performance", "otimizacao", "memoria", "cache", "refatorar", "code review", "maintainability"],
    content: "Meça antes de otimizar quando houver ambiente para medir. Evite complexidade acidental, duplicação, código morto, dependências pesadas e trabalho repetido. Considere acessibilidade, performance de carregamento, renderização, consultas, cache e limites de recursos. Revisão deve procurar bugs, regressões, riscos de segurança, clareza, consistência e escopo. Prefira correções de causa raiz a contornar sintomas."
  },
  {
    id: "engineering-09", domain: "Engenharia de software", title: "Entrega, observabilidade e operação",
    keywords: ["deploy", "ci cd", "observabilidade", "logs", "monitoramento", "rollback", "release", "producao"],
    content: "Uma entrega confiável requer validação automatizada, configuração por ambiente, logs úteis sem segredos, métricas e alertas quando relevantes. Faça rollout gradual quando risco justificar; mantenha estratégia de rollback e migrations compatíveis. Deploy, publicação, commit ou alteração externa precisam de autorização apropriada e evidência de resultado. Registre o que foi alterado, como validar e como reverter."
  },
  {
    id: "engineering-10", domain: "Engenharia de software", title: "Aprendizagem técnica adaptativa e documentação",
    keywords: ["aprender", "documentacao", "framework", "biblioteca", "tecnologia", "versionamento", "best practices"],
    content: "Quando surgir tecnologia desconhecida ou versões atuais forem relevantes, consultar documentação oficial e exemplos compatíveis com a versão instalada. Não assumir APIs, comandos ou recursos. Aprender para a tarefa significa identificar conceito, confirmar sintaxe, aplicar no contexto, testar e registrar uma síntese reutilizável. Separar conhecimento confirmado de hipótese e evitar alegar treinamento permanente: contexto e documentos podem apoiar a sessão, mas não atualizam pesos do modelo."
  },

  {
    id: "design-01", domain: "Design de produto", title: "Sistema de design, tokens e consistência visual",
    keywords: ["design system", "tokens", "variaveis css", "cores", "consistencia", "tema", "dark mode", "light mode", "componentes"],
    content: "Antes de desenhar telas, defina um sistema de design com tokens semânticos para cores (background, surface, text, muted, border, primary, danger, success), tipografia, espaçamento, raios, elevação, foco e movimento. Componentes devem consumir tokens, nunca espalhar valores arbitrários. Diferencie tokens primitivos de tokens semânticos; permita temas sem duplicar componentes. Documente estados default, hover, focus-visible, active, disabled, loading, error e selected. Mudanças globais devem ser testadas em telas representativas para evitar regressões."
  },
  {
    id: "design-02", domain: "Design de produto", title: "Escala profissional de espaçamento e ritmo de layout",
    keywords: ["espacamento", "spacing", "grid", "ritmo visual", "margem", "padding", "gap", "alinhamento", "layout"],
    content: "Use uma escala consistente baseada em múltiplos de 4 px (por exemplo 4, 8, 12, 16, 24, 32, 40, 48, 64) e escolha valores por função, não por ajuste aleatório. Agrupe elementos relacionados com menor distância e separe seções com maior distância. Estabeleça container com largura máxima, gutters responsivos, alinhamentos compartilhados e grid previsível. Evite empilhar margens conflitantes; prefira gap em layouts flex/grid. Preserve densidade adequada ao contexto: dashboards podem ser compactos, páginas de marketing precisam de mais respiro."
  },
  {
    id: "design-03", domain: "Design de produto", title: "Hierarquia visual, tipografia e legibilidade",
    keywords: ["tipografia", "hierarquia", "legibilidade", "fontes", "escala tipografica", "contraste", "texto"],
    content: "Defina uma escala tipográfica com poucos níveis claros para display, título, subtítulo, corpo, rótulo e metadados. Use pesos e tamanhos para expressar hierarquia, não apenas cor. Corpo de texto deve priorizar leitura confortável; linhas longas devem ser limitadas por largura. Mantenha line-height proporcional, alinhamento consistente e contraste suficiente. Não use texto pequeno para informação essencial, nem excesso de caixa alta, pesos fortes ou estilos concorrentes. Use fontes de interface legíveis e reserve fontes monoespaçadas para código e dados técnicos."
  },
  {
    id: "design-04", domain: "Design de produto", title: "Composição, hierarquia de componentes e acabamento premium",
    keywords: ["interface premium", "composicao", "cards", "bordas", "sombras", "acabamento", "visual profissional", "ui"],
    content: "Construa cada tela a partir de uma ação principal, conteúdo prioritário e ações secundárias claramente subordinadas. Use cards somente quando agruparem conteúdo relacionado; não transforme cada elemento em um card. Prefira superfícies, divisores e alinhamento a bordas e sombras excessivas. Reserve cores fortes para ações e estados importantes. Ícones devem ter estilo, tamanho e alinhamento consistentes e não substituir rótulos ambíguos. Evite gradientes decorativos, glassmorphism, animações e efeitos sem função. O acabamento premium vem de proporção, consistência, clareza e atenção aos estados vazios e de erro."
  },
  {
    id: "design-05", domain: "Design de produto", title: "Responsividade mobile-first e acessibilidade",
    keywords: ["responsividade", "mobile first", "breakpoints", "acessibilidade", "wcag", "teclado", "aria", "touch target"],
    content: "Projete primeiro os fluxos e prioridades em telas estreitas e depois amplie a composição para tablet e desktop. Use breakpoints definidos pelo conteúdo, layouts fluidos, min-width:0, imagens responsivas e tabelas com estratégia explícita para telas pequenas. Garanta navegação por teclado, foco visível, semântica HTML, nomes acessíveis, labels, mensagens de erro associadas e alvos de toque confortáveis. Verifique contraste WCAG AA, zoom, redução de movimento e não dependa apenas de cor para comunicar estado. Teste pelo menos 320 px, 375 px, 768 px, 1024 px e desktop amplo quando aplicável."
  },
  {
    id: "design-06", domain: "Design de produto", title: "UX de estados, formulários e microinterações",
    keywords: ["ux", "formulario", "loading", "skeleton", "empty state", "feedback", "toast", "microinteracao", "validacao"],
    content: "Toda interface assíncrona deve contemplar loading, sucesso, vazio, erro, indisponibilidade e retry quando fizer sentido. Formulários precisam de labels persistentes, validação coerente, erros próximos ao campo, preservação dos dados e prevenção de envio duplicado. Botões devem indicar claramente ação, estado e consequência; ações destrutivas exigem confirmação proporcional. Microinterações devem reforçar causalidade e orientação, ser rápidas e respeitar prefers-reduced-motion. Toasts não substituem mensagens persistentes para erros que exigem correção."
  },
  {
    id: "design-07", domain: "Design de produto", title: "Auditoria visual e evolução baseada em evidências",
    keywords: ["auditoria visual", "design critique", "heuristica", "consistencia visual", "regressao visual", "aprendizado de design"],
    content: "Avalie interfaces por evidência: consistência dos tokens, hierarquia, alinhamento, espaçamento, legibilidade, contraste, responsividade, acessibilidade, estados e coerência com a tarefa do usuário. Compare telas reais em larguras representativas e registre defeito, impacto, evidência e correção proposta. Não confunda preferência estética com problema comprovado. Transforme padrões recorrentes e correções verificadas em regras reutilizáveis versionadas; propostas de conhecimento devem manter fonte, contexto, evidência, data e aprovação, sem alegar treinamento dos pesos do modelo."
  },

  {
    id: "dev-modern-stacks-01", domain: "Engenharia full-stack", title: "Seleção profissional de linguagens e frameworks modernos",
    keywords: ["typescript", "javascript", "python", "go", "rust", "react", "next", "vue", "svelte", "astro", "tanstack", "framework", "stack moderna"],
    content: "Escolha linguagens e frameworks pelo contexto, não por tendência. TypeScript com strict é adequado a aplicações web tipadas; JavaScript moderno atende scripts e projetos simples; Python 3.12+ atende automação, APIs e processamento; SQL define persistência e integridade. Go, Rust, Java, Kotlin e C# entram quando runtime, performance, integração ou equipe justificarem. React/Next, Vue/Nuxt, Svelte/SvelteKit, Astro, TanStack e Vite são alternativas. Preserve a stack existente quando estável e calcule custo de migração, compatibilidade, manutenção, deploy e competências da equipe antes de trocar.",
  },
  {
    id: "dev-architecture-02", domain: "Engenharia full-stack", title: "Arquitetura modular e contratos de software",
    keywords: ["arquitetura", "modular", "contrato", "camadas", "serviços", "domínio", "SOLID", "dependências", "monolito"],
    content: "Defina contratos, entidades e limites de módulo antes de fluxos que cruzam camadas. Separe UI, estado, domínio, serviços e persistência na proporção da complexidade. Monólito modular é um bom padrão inicial; microsserviços exigem limites operacionais e necessidade real. Evite dependências circulares, componentes gigantes, lógica de domínio em JSX, abstrações prematuras e duplicação. Preserve interfaces públicas e migre incrementalmente com testes de regressão.",
  },
  {
    id: "dev-types-runtime-03", domain: "Engenharia full-stack", title: "TypeScript estrito e validação em runtime",
    keywords: ["typescript", "strict", "zod", "schema", "validação", "runtime", "unknown", "tipagem", "generics"],
    content: "Ative strict TypeScript e modele domínio com tipos pequenos, unions discriminadas, generics úteis e narrowing. Evite any; use unknown nas fronteiras e valide dados externos em runtime com Zod ou biblioteca já adotada. Tipos TS são removidos na compilação e não validam body HTTP, query, params, env, JSON ou formulários. Trate nullability, erros, retornos e contratos explícitos; não use casts para silenciar incompatibilidades sem evidência.",
  },
  {
    id: "dev-overlays-04", domain: "Frontend e UX", title: "Modais, diálogos, drawers e gerenciamento de foco",
    keywords: ["modal", "modal responsivo", "dialog", "alertdialog", "drawer", "sheet", "radix", "focus trap", "overlay"],
    content: "Prefira primitives acessíveis já instalados, como Radix/shadcn ou equivalentes. Um diálogo deve oferecer nome e descrição acessíveis, portal, foco contido, retorno do foco ao disparador, fechamento por Escape e clique externo somente quando seguro, além de bloqueio de scroll. Formulários em modal preservam dados, mostram erros junto aos campos, têm loading e evitam envio duplicado. Em mobile, considere drawer/sheet com altura máxima e conteúdo rolável. Evite modal sobre modal; documente camadas z-index e ordem de foco.",
  },
  {
    id: "dev-feedback-05", domain: "Frontend e UX", title: "Alertas, toasts, confirmações e estados de interface",
    keywords: ["alerta", "alert", "toast", "notificação", "sonner", "feedback", "confirmação", "loading", "empty", "error"],
    content: "Use alertas persistentes próximos ao conteúdo quando a mensagem exige leitura ou ação; toasts são feedback breve e não substituem erros de formulário ou avisos críticos. Diferencie success, info, warning e destructive com semântica, texto e ícone, não apenas cor. Ações destrutivas exigem confirmação explícita com consequência e opção segura de cancelar. Toda operação assíncrona deve prever pending/loading, sucesso, vazio, erro e retry quando aplicável; previna duplo envio e mantenha o usuário informado sem notificações excessivas.",
  },
  {
    id: "dev-responsive-06", domain: "Frontend e UX", title: "Responsividade e acabamento de interfaces profissionais",
    keywords: ["responsivo", "mobile first", "breakpoint", "320px", "grid", "flex", "layout", "overflow", "design system"],
    content: "Use abordagem mobile-first e valide 320, 375, 768, 1024 e 1440 px, além de larguras intermediárias, zoom e orientação. Centralize tokens semânticos para cores, tipografia, espaçamento, raios, sombras e z-index. Prefira escala de 4/8 px, hierarquia tipográfica consistente, alinhamento e largura de leitura adequados. Evite dimensões fixas, overflow horizontal, alvos de toque pequenos e breakpoints baseados apenas em dispositivos. Verifique estados focus, hover, active, disabled e reduced motion.",
  },
  {
    id: "dev-python-07", domain: "Backend e automação", title: "Python moderno para APIs e automação",
    keywords: ["python", "python 3.12", "fastapi", "pydantic", "asyncio", "httpx", "pathlib", "type hints"],
    content: "Em Python 3.12+, use type hints em funções públicas, modelos Pydantic para contratos de API, FastAPI quando houver necessidade de serviço HTTP e pathlib para caminhos. Use asyncio/httpx para I/O concorrente real, com timeout, limites e tratamento de falhas. Separe routers, schemas, services e repositories conforme o domínio. Fixe dependências em pyproject.toml/lockfile, configure logging sem segredos e teste validação, permissões, limites e falhas. Não introduza microserviço Python quando uma biblioteca ou módulo local resolver melhor.",
  },
  {
    id: "dev-testing-08", domain: "Qualidade de software", title: "Testes, depuração e evidência de entrega",
    keywords: ["vitest", "jest", "playwright", "e2e", "unitário", "integração", "debug", "stack trace", "typecheck", "lint", "build"],
    content: "Reproduza o defeito e leia stack trace/contexto antes de alterar. Corrija a causa raiz no menor escopo coerente e adicione regressão. Use testes unitários para domínio, integração para limites e E2E para fluxos críticos. Inclua erros, permissões, estados vazios, duplicidade, concorrência e breakpoints conforme o risco. Execute typecheck, lint, testes e build disponíveis; registre comandos e resultados reais. Não confunda teste escrito com executado, análise estática com execução, preview com deploy ou sucesso parcial com entrega completa.",
  },
  {
    id: "dev-security-09", domain: "Backend e segurança", title: "Segurança de aplicações e isolamento de dados",
    keywords: ["owasp", "segurança", "autorização", "autenticação", "rls", "tenant", "csrf", "xss", "secrets", "rate limit"],
    content: "Autenticação identifica o usuário; autorização deve validar cada recurso no servidor. Aplique menor privilégio, RLS/isolamento por tenant, validação de entrada, escaping, proteção CSRF conforme arquitetura, rate limits e limites de payload. Guarde segredos apenas no backend/secret manager, redija logs e nunca confie em campos de usuário enviados pelo cliente. Para uploads, valide tipo, tamanho e conteúdo; para execução de código, use sandbox isolado, limites de CPU/memória/tempo e rede restrita. Teste acessos cruzados entre usuários.",
  },
  {
    id: "dev-progressive-learning-10", domain: "Inteligência de desenvolvimento", title: "Aprendizado progressivo baseado em evidências",
    keywords: ["aprendizado", "conhecimento", "memória técnica", "evolução", "lições aprendidas", "knowledge base", "avaliação"],
    content: "Transforme correções e padrões recorrentes em propostas de conhecimento com problema, contexto, fonte, solução, teste reproduzível, versão e limitações. Separe hipótese, preferência e regra comprovada; exija revisão/aprovação antes de promover conhecimento. Reavalie regras antigas para evitar contradições e regressões. A base curada e a recuperação contextual podem evoluir por versão, mas isso não significa treinamento automático dos pesos do modelo conectado.",
  },
  ...STREATRACE_KNOWLEDGE,
  ...GAME_STUDIO_KNOWLEDGE,
  ...FULLSTACK_KNOWLEDGE,
  ...DESIGN_SYSTEMS_KNOWLEDGE,
];

const STOP_WORDS = new Set("a ao aos as o os de da das do dos e é em no na nos nas um uma uns umas por para com sem sobre entre que se sua suas seu seus como mais menos muito muita meu minha meus minhas eu você vocês ela ele isso isto aquilo aqui ali onde quando qual quais quem porque como pode podem precisa quero queria fazer feito ser estar ter haver há não sim mas ou então já ainda também pelo pelos pela pra pro".split(/\s+/));

function normalize(text: string): string {
  return text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function terms(text: string): string[] {
  return normalize(text).split(/\s+/).filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

/** Lightweight lexical retrieval; deterministic and works without embeddings or another API. */
export function retrieveWlcKnowledge(query: string, limit = 4): KnowledgeEntry[] {
  const qTerms = [...new Set(terms(query))];
  if (!qTerms.length) return [];
  const qNorm = normalize(query);
  const mathIntent = /\b(?:quanto (?:e|é)|calcule|calcular|calculo|conta|resultado|porcentagem|percentual|equacao|equacao|raiz|potencia)\b/.test(qNorm) || /\d+\s*(?:[+*/^%-]|%)/.test(query);
  const streetRaceIntent = /\b(?:streetrace|street\s*race|racha|moto|motos|cg\s*160|cg\s*150|cg\s*125|factor\s*150|bolinha|pinh[aã]o|coroa|oficina|fu[cç]ar|usinagem|ecu|athlon|dyno|nexus|realgear|preparacao|preparação|biela|cabe[cç]ote|comando|kit\s*4mm)\b/i.test(query);
  const designIntent = /\b(?:tailwind|bootstrap|bulma|pico\.?css|design system|harmonia|ui moderna|landing page|tipografia|design tokens|shadcn|responsivo|wcag|hero section|dark mode)\b/i.test(query);
  const fullstackIntent = /\b(?:hono|fastify|fastapi|zod|pydantic|patch_file|search_codebase|self-?heal|auto-?cura|modo criar|wcag|design system|migration|uuid)\b/i.test(query);
  const gameStudioIntent = /\b(?:criar jogo|fazer um jogo|game studio|jogo web|desenvolver game|game loop|f[ií]sica de jogo|simulador|html5 game|canvas game|webgl|cenas do jogo|do zero|greenfield|replit|lovable|vercel|fixed.?step|determin[ií]stic|game design|engine de jogo)\b/i.test(query);
  const ranked = WLC_CORE_KNOWLEDGE.map((entry) => {
    const titleTerms = terms(entry.title);
    const domainTerms = terms(entry.domain);
    const keywordTerms = entry.keywords.flatMap(terms);
    const contentTerms = terms(entry.content);
    let score = entry.id === "math-01" && mathIntent ? 12 : 0;
    if (streetRaceIntent && entry.domain === "StreetRace") score += 10;
    if (gameStudioIntent && (entry.domain === "Game Studio" || entry.domain === "Física de Jogos" || entry.domain === "Matemática de Jogos" || entry.domain === "Engenharia de Jogos Web" || entry.domain === "Mecânica Profissional" || entry.domain === "Plataforma de Desenvolvimento")) score += 10;
    if (fullstackIntent && (entry.domain === "Backend Enterprise" || entry.domain === "Banco de Dados" || entry.domain === "Frontend de Alto Impacto" || entry.domain === "Protocolo Operacional")) score += 10;
    if (designIntent && (entry.domain === "Design Profissional" || entry.domain === "Tailwind CSS" || entry.domain === "Bootstrap" || entry.domain === "Bulma" || entry.domain === "Pico CSS")) score += 10;
    for (const term of qTerms) {
      if (titleTerms.includes(term)) score += 5;
      if (domainTerms.includes(term)) score += 3;
      if (keywordTerms.includes(term)) score += 3;
      if (contentTerms.includes(term)) score += 1;
    }
    const phrases = [entry.title, entry.domain, ...entry.keywords].map(normalize);
    if (phrases.some((p) => p && qNorm.includes(p))) score += 4;
    return { entry, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  return ranked.slice(0, Math.max(0, limit)).map(({ entry }) => entry);
}

export function formatWlcKnowledgeContext(entries: KnowledgeEntry[]): string {
  if (!entries.length) return "";
  return entries.map((entry) => `### ${entry.domain} — ${entry.title}\n${entry.content}`).join("\n\n");
}

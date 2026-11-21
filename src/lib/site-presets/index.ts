// Site presets: real, multi-page static sites (public pages + admin panel) committed
// to a new repository. Shared engine files live in ./assets; each preset supplies
// theme tokens and starter content. Output is plain HTML/CSS/JS so it publishes as-is.
import indexHtml from "./assets/index.html?raw";
import itemHtml from "./assets/item.html?raw";
import cartHtml from "./assets/cart.html?raw";
import adminHtml from "./assets/admin.html?raw";
import styleCss from "./assets/style.css.txt?raw";
import storeJs from "./assets/store.js?raw";
import siteJs from "./assets/site.js?raw";
import adminJs from "./assets/admin.js?raw";
import { titleFromName, type GenesisFile } from "../genesis-scaffold";

export type SiteKind = "store" | "blog" | "forum" | "news";
type Theme = Record<string, string>;
type Item = Record<string, unknown> & { id: string; title: string };
type SiteDef = {
  kind: SiteKind; tagline: string; fonts: string; theme: Theme; topbar?: string;
  hero: Record<string, unknown>; listTitle: string; sorts: [string, string][];
  labels: { items: string; item: string }; moderate: boolean;
  categories: { id: string; name: string }[]; items: Item[]; comments: Record<string, unknown>[];
  nav: { label: string; href: string }[]; footer: { title: string; links: { label: string; href: string }[] }[];
  extra: string; pages: string[]; readme: string;
};

const img = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const days = (n: number) => new Date(Date.UTC(2026, 10, 18) - n * 864e5).toISOString();
const newsletter = (title: string, text: string) =>
  `<div class="newsletter"><div><h2>${title}</h2><p>${text}</p></div><form data-newsletter><input class="input" type="email" name="email" required placeholder="seu@email.com" aria-label="E-mail" /><button class="btn">Inscrever</button></form></div>`;
const legal = { title: "Institucional", links: [{ label: "Sobre nós", href: "content.html?slug=about" }, { label: "Contato", href: "content.html?slug=contact" }, { label: "Privacidade", href: "content.html?slug=privacy" }, { label: "Termos de uso", href: "content.html?slug=terms" }, { label: "Painel admin", href: "admin.html" }] };

const DEFS: Record<SiteKind, (name: string) => SiteDef> = {
  store: (name) => ({
    kind: "store", tagline: "Produtos selecionados com entrega rápida, troca grátis e pagamento seguro.",
    fonts: "family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Manrope:wght@400;500;600;700",
    theme: { bg: "#f7f4ee", surface: "#ffffff", text: "#1b1f1c", muted: "#6b6f68", primary: "#1f4d36", "primary-contrast": "#ffffff", border: "#e6e1d6", hover: "#efeae0", ok: "#1f7a4d", danger: "#b42318", "hero-bg": "linear-gradient(180deg,#efe9dc,#f7f4ee)", "admin-bg": "#f2efe8", "font-display": "'Fraunces', Georgia, serif", "font-body": "'Manrope', system-ui, sans-serif", radius: "14px", "btn-radius": "999px", "card-ratio": "1 / 1", shadow: "0 18px 40px -18px rgb(31 77 54 / .35)" },
    topbar: "Frete grátis em compras acima de R$ 299 · Parcele em até 10x sem juros",
    hero: { eyebrow: "Nova coleção", title: "Design que acompanha o seu dia", cta: "Comprar agora", ctaHref: "#list", secondary: "Ver ofertas", secondaryHref: "index.html?cat=acessorios", image: img("1441986300917-64674bd600d8"), stats: [["Clientes satisfeitos", "12 mil+"], ["Avaliação média", "4,9 ★"], ["Entrega", "48h"]] },
    listTitle: "Produtos em destaque", sorts: [["recent", "Lançamentos"], ["popular", "Mais vendidos"], ["price-asc", "Menor preço"], ["price-desc", "Maior preço"]],
    labels: { items: "Produtos", item: "Produto" }, moderate: false,
    categories: [{ id: "relogios", name: "Relógios" }, { id: "audio", name: "Áudio" }, { id: "calcados", name: "Calçados" }, { id: "acessorios", name: "Acessórios" }],
    items: [
      { id: "relogio-classic", title: "Relógio Classic Minimal", category: "relogios", price: 489.9, oldPrice: 629.9, stock: 14, sold: 182, badge: "-22%", image: img("1523275335684-37898b6baf30", 900), excerpt: "Caixa em aço escovado, pulseira de couro e resistência à água 5 ATM.", body: "Um relógio para todos os dias, com mostrador limpo e acabamento premium.\n\nCaixa de 40 mm em aço inoxidável, vidro mineral reforçado e pulseira em couro legítimo com troca rápida. Garantia de 2 anos.", date: days(3) },
      { id: "fone-studio", title: "Fone Studio Wireless", category: "audio", price: 899, stock: 22, sold: 240, badge: "Mais vendido", image: img("1505740420928-5e560c06d30e", 900), excerpt: "Cancelamento de ruído ativo, 40h de bateria e áudio de alta definição.", body: "Som imersivo com drivers de 40 mm e cancelamento de ruído ativo.\n\nBateria para 40 horas, carregamento rápido USB-C e almofadas em espuma de memória para longas sessões.", date: days(10) },
      { id: "tenis-runner", title: "Tênis Runner Red", category: "calcados", price: 559.9, oldPrice: 699.9, stock: 9, sold: 133, badge: "Oferta", image: img("1542291026-7eec264c27ff", 900), excerpt: "Amortecimento responsivo e cabedal respirável para corrida e uso diário.", body: "Leve, confortável e com tração em qualquer piso.\n\nEntressola com espuma de alto retorno e cabedal em malha respirável.", date: days(6) },
      { id: "camera-instant", title: "Câmera Instantânea Retro", category: "acessorios", price: 749, stock: 6, sold: 64, image: img("1526170375885-4d8ecf77b99f", 900), excerpt: "Fotos impressas na hora com visual analógico e flash automático.", body: "Registre momentos e tenha a foto na mão em segundos.\n\nFlash automático, modo selfie e espelho para enquadramento.", date: days(14) },
      { id: "oculos-sol", title: "Óculos de Sol Aviador", category: "acessorios", price: 329.9, stock: 30, sold: 97, image: img("1572635196237-14b3f281503f", 900), excerpt: "Lentes polarizadas com proteção UV400 e armação leve.", body: "Estilo atemporal com proteção completa.\n\nLentes polarizadas UV400 e armação em metal leve, com estojo rígido incluso.", date: days(20) },
      { id: "perfume-noir", title: "Perfume Noir 100ml", category: "acessorios", price: 419, stock: 18, sold: 151, badge: "Novo", image: img("1585386959984-a4155224a1ad", 900), excerpt: "Fragrância amadeirada com notas de âmbar, baunilha e cedro.", body: "Uma assinatura marcante para o dia e a noite.\n\nNotas de saída cítricas, coração floral e fundo amadeirado com âmbar e baunilha.", date: days(1) },
      { id: "tenis-street", title: "Tênis Street Colors", category: "calcados", price: 389.9, stock: 0, sold: 210, image: img("1491553895911-0055eca6402d", 900), excerpt: "Visual urbano, solado vulcanizado e conforto o dia todo.", body: "Clássico de rua com cores vibrantes.\n\nSolado vulcanizado, palmilha acolchoada e lona resistente.", date: days(30) },
    ], comments: [],
    nav: [{ label: "Início", href: "index.html" }, { label: "Relógios", href: "index.html?cat=relogios" }, { label: "Áudio", href: "index.html?cat=audio" }, { label: "Calçados", href: "index.html?cat=calcados" }],
    footer: [{ title: "Loja", links: [{ label: "Todos os produtos", href: "index.html" }, { label: "Carrinho", href: "cart.html" }] }, { title: "Ajuda", links: [{ label: "Trocas e devoluções", href: "index.html#extra" }, { label: "Prazos de entrega", href: "index.html#extra" }] }, legal],
    extra: `<div class="feature-band"><div><strong>Frete grátis</strong><span class="muted">Em compras acima de R$ 299 para todo o Brasil.</span></div><div><strong>Troca fácil</strong><span class="muted">30 dias para trocar sem custo.</span></div><div><strong>Pagamento seguro</strong><span class="muted">Cartão em até 10x, Pix e boleto.</span></div><div><strong>Atendimento humano</strong><span class="muted">Seg. a sáb., das 8h às 20h.</span></div></div>${newsletter("Ganhe 10% na primeira compra", "Receba lançamentos e ofertas exclusivas no seu e-mail.")}`,
    pages: ["index.html", "item.html", "cart.html", "content.html", "search.html", "admin.html"],
    readme: `Loja virtual com vitrine, filtros por categoria, busca, ordenação, página de produto, carrinho com frete e checkout, e painel admin (produtos, estoque, categorias, pedidos, inscritos e configurações).`,
  }),
  blog: (name) => ({
    kind: "blog", tagline: "Ideias, guias e histórias sobre criatividade, produtividade e tecnologia.",
    fonts: "family=DM+Serif+Display&family=DM+Sans:wght@400;500;700",
    theme: { bg: "#fbf8f3", surface: "#ffffff", text: "#231f1a", muted: "#6f675d", primary: "#c2410c", "primary-contrast": "#ffffff", border: "#ece5da", hover: "#f4ede2", ok: "#15803d", danger: "#b91c1c", "hero-bg": "#fbf8f3", "admin-bg": "#f6f1e9", "font-display": "'DM Serif Display', Georgia, serif", "font-body": "'DM Sans', system-ui, sans-serif", radius: "10px", "btn-radius": "8px", "card-ratio": "16 / 10", shadow: "0 20px 40px -20px rgb(35 31 26 / .3)" },
    hero: { eyebrow: "Blog", title: "Escrevemos sobre o que faz você ir mais longe", cta: "Ler artigos", ctaHref: "#list", secondary: "Assinar newsletter", secondaryHref: "#extra", image: img("1499750310107-5fef28a66643") },
    listTitle: "Últimos artigos", sorts: [["recent", "Mais recentes"], ["popular", "Mais lidos"]],
    labels: { items: "Artigos", item: "Artigo" }, moderate: true,
    categories: [{ id: "produtividade", name: "Produtividade" }, { id: "escrita", name: "Escrita" }, { id: "tecnologia", name: "Tecnologia" }, { id: "estilo", name: "Estilo de vida" }],
    items: [
      { id: "rotina-foco", title: "Como montar uma rotina de foco profundo", category: "produtividade", author: "Marina Alves", readTime: 7, views: 1840, image: img("1486312338219-ce68d2c6f44d"), excerpt: "Blocos de tempo, ambiente certo e pausas estratégicas: o método que uso há 3 anos.", body: "Foco profundo não é talento, é estrutura. Comece reservando dois blocos de 90 minutos por dia, sempre no mesmo horário.\n\nPrepare o ambiente antes: notificações desligadas, uma única aba aberta e um objetivo escrito em uma frase.\n\nEntre os blocos, faça pausas longe de telas. Caminhar 10 minutos devolve mais energia do que qualquer rede social.", date: days(2) },
      { id: "escrever-melhor", title: "10 hábitos para escrever com clareza", category: "escrita", author: "Rafael Costa", readTime: 5, views: 1320, image: img("1455390582262-044cdead277a"), excerpt: "Frases curtas, verbos fortes e revisão em voz alta. Pequenas mudanças, grande impacto.", body: "Escrever bem é reescrever. Na primeira versão, apenas coloque as ideias no papel.\n\nNa revisão, corte adjetivos, troque a voz passiva pela ativa e leia em voz alta: o ouvido encontra o que os olhos ignoram.", date: days(5) },
      { id: "cafe-criatividade", title: "Café, silêncio e criatividade", category: "estilo", author: "Marina Alves", readTime: 4, views: 860, image: img("1501504905252-473c47e087f8"), excerpt: "O ritual da manhã que transforma o começo do dia em espaço para criar.", body: "Antes de abrir o e-mail, abra um caderno. Quinze minutos de escrita livre organizam a mente para o resto do dia.\n\nO café é só o pretexto: o que importa é o silêncio.", date: days(9) },
      { id: "ia-no-trabalho", title: "Inteligência artificial no trabalho criativo", category: "tecnologia", author: "Rafael Costa", readTime: 8, views: 2410, image: img("1517694712202-14dd9538aa97"), excerpt: "Onde a IA ajuda de verdade e onde ainda vale confiar no seu próprio julgamento.", body: "Use IA para gerar variações, resumir referências e revisar textos. Ela acelera o trabalho repetitivo.\n\nAs decisões de gosto, tom e estratégia continuam sendo suas — e é isso que diferencia o seu trabalho.", date: days(12) },
      { id: "ferramentas-2026", title: "As ferramentas que uso em 2026", category: "tecnologia", author: "Marina Alves", readTime: 6, views: 1105, image: img("1488590528505-98d2b5aba04b"), excerpt: "Anotações, gestão de tarefas e escrita: minha pilha enxuta de aplicativos.", body: "Menos ferramentas, mais trabalho feito. Uso um app de notas, um gerenciador de tarefas e um editor de texto.\n\nTudo sincronizado, nada duplicado.", date: days(18) },
    ],
    comments: [{ id: "c1", itemId: "rotina-foco", author: "Lucas", text: "Comecei com um bloco só e já senti diferença. Obrigado!", date: days(1), status: "aprovado" }, { id: "c2", itemId: "ia-no-trabalho", author: "Bianca", text: "Ótimo equilíbrio entre entusiasmo e cautela.", date: days(10), status: "aprovado" }],
    nav: [{ label: "Início", href: "index.html" }, { label: "Produtividade", href: "index.html?cat=produtividade" }, { label: "Escrita", href: "index.html?cat=escrita" }, { label: "Tecnologia", href: "index.html?cat=tecnologia" }],
    footer: [{ title: "Categorias", links: [{ label: "Produtividade", href: "index.html?cat=produtividade" }, { label: "Escrita", href: "index.html?cat=escrita" }, { label: "Tecnologia", href: "index.html?cat=tecnologia" }] }, legal],
    extra: newsletter("Um e-mail por semana, sem spam", "Os melhores artigos da semana direto na sua caixa de entrada."),
    pages: ["index.html", "item.html", "content.html", "search.html", "admin.html"],
    readme: `Blog com artigos por categoria, busca, artigo com tempo de leitura e compartilhamento, comentários com moderação, newsletter e painel admin (artigos, rascunhos, categorias, comentários, inscritos e configurações).`,
  }),
  forum: (name) => ({
    kind: "forum", tagline: "A comunidade para tirar dúvidas, compartilhar projetos e aprender junto.",
    fonts: "family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600",
    theme: { bg: "#0e1116", surface: "#151a21", text: "#e7ecf2", muted: "#8b96a5", primary: "#a3e635", "primary-contrast": "#0e1116", border: "#232a35", hover: "#1c232d", ok: "#4ade80", danger: "#f87171", "hero-bg": "radial-gradient(1200px 400px at 20% 0%, rgb(163 230 53 / .12), transparent), #0e1116", "admin-bg": "#0b0e12", "font-display": "'Space Grotesk', system-ui, sans-serif", "font-body": "'IBM Plex Sans', system-ui, sans-serif", radius: "12px", "btn-radius": "10px", "card-ratio": "16 / 9", shadow: "0 20px 50px -20px rgb(0 0 0 / .6)" },
    hero: { eyebrow: "Comunidade", title: "Pergunte, responda e construa com a comunidade", cta: "Ver discussões", ctaHref: "#list", secondary: "Regras da comunidade", secondaryHref: "#extra", stats: [["Membros", "8.420"], ["Tópicos", "3.190"], ["Online agora", "126"]] },
    listTitle: "Discussões", sorts: [["recent", "Mais recentes"], ["popular", "Mais vistas"]],
    labels: { items: "Tópicos", item: "Tópico" }, moderate: false,
    categories: [{ id: "geral", name: "Geral" }, { id: "ajuda", name: "Ajuda" }, { id: "projetos", name: "Projetos" }, { id: "anuncios", name: "Anúncios" }],
    items: [
      { id: "boas-vindas", title: "Boas-vindas! Leia antes de postar", category: "anuncios", author: "Moderação", pinned: true, locked: true, views: 5210, image: "", excerpt: "Regras, dicas para perguntar bem e como funciona a comunidade.", body: "Seja respeitoso, pesquise antes de perguntar e use um título claro.\n\nInclua o que você já tentou e o resultado esperado. Isso ajuda todos a responderem mais rápido.", date: days(40) },
      { id: "primeiro-projeto", title: "Mostrei meu primeiro projeto: app de finanças", category: "projetos", author: "Ana Lima", views: 640, image: "", excerpt: "Feito em 3 semanas, aceito sugestões de melhoria!", body: "Depois de muito estudo, publiquei meu app de controle financeiro. Tem gráficos mensais, categorias e metas.\n\nO que vocês melhorariam na experiência?", date: days(1) },
      { id: "erro-deploy", title: "Erro 404 ao publicar meu site", category: "ajuda", author: "Pedro H.", views: 312, image: "", excerpt: "Localmente funciona, mas publicado só aparece página em branco.", body: "Rodando localmente tudo funciona. Depois de publicar, as páginas internas retornam 404.\n\nAlguém já passou por isso?", date: days(2) },
      { id: "melhor-forma-estudar", title: "Qual a melhor forma de estudar programação?", category: "geral", author: "Júlia M.", views: 1290, image: "", excerpt: "Cursos, projetos práticos ou livros? Como vocês aprenderam?", body: "Estou começando agora e fico perdida entre tantas opções.\n\nComo foi a jornada de vocês?", date: days(4) },
    ],
    comments: [
      { id: "r1", itemId: "erro-deploy", author: "Carlos", text: "Verifique se os links apontam para arquivos .html existentes e se o servidor está configurado para SPA, se for o caso.", date: days(2), status: "aprovado" },
      { id: "r2", itemId: "melhor-forma-estudar", author: "Ana Lima", text: "Projetos práticos! Escolha algo que você usaria e construa aos poucos.", date: days(3), status: "aprovado" },
      { id: "r3", itemId: "primeiro-projeto", author: "Rafa", text: "Ficou ótimo. Sugiro exportar relatórios em CSV.", date: days(0), status: "aprovado" },
    ],
    nav: [{ label: "Discussões", href: "index.html" }, { label: "Ajuda", href: "index.html?cat=ajuda" }, { label: "Projetos", href: "index.html?cat=projetos" }, { label: "Anúncios", href: "index.html?cat=anuncios" }],
    footer: [{ title: "Comunidade", links: [{ label: "Regras", href: "item.html?id=boas-vindas" }, { label: "Discussões", href: "index.html" }] }, legal],
    extra: `<div class="feature-band"><div><strong>Seja respeitoso</strong><span class="muted">Críticas ao conteúdo, nunca às pessoas.</span></div><div><strong>Pergunte bem</strong><span class="muted">Título claro, contexto e o que já tentou.</span></div><div><strong>Compartilhe</strong><span class="muted">Responda e marque soluções que ajudaram.</span></div></div>${newsletter("Resumo semanal da comunidade", "As melhores discussões da semana no seu e-mail.")}`,
    pages: ["index.html", "item.html", "content.html", "search.html", "admin.html"],
    readme: `Fórum com categorias, tópicos fixados e fechados, busca, contagem de respostas e visitas, página de discussão com respostas e painel admin (tópicos, categorias, moderação de respostas, inscritos e configurações).`,
  }),
  news: (name) => ({
    kind: "news", tagline: "Jornalismo independente, apurado e atualizado ao longo do dia.",
    fonts: "family=Archivo:wght@600;800;900&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600",
    theme: { bg: "#ffffff", surface: "#ffffff", text: "#111111", muted: "#5c5c5c", primary: "#c8102e", "primary-contrast": "#ffffff", border: "#e5e5e5", hover: "#f5f5f5", ok: "#15803d", danger: "#c8102e", "hero-bg": "#ffffff", "admin-bg": "#f6f6f6", "font-display": "'Archivo', system-ui, sans-serif", "font-body": "'Source Serif 4', Georgia, serif", radius: "4px", "btn-radius": "4px", "card-ratio": "3 / 2", shadow: "0 12px 30px -15px rgb(0 0 0 / .25)" },
    topbar: "AO VIVO · Acompanhe a cobertura completa das eleições municipais",
    hero: { eyebrow: "Destaque", title: "Energia limpa já responde por metade da matriz elétrica", cta: "Ler reportagem", ctaHref: "item.html?id=energia-limpa", secondary: "Últimas notícias", secondaryHref: "#list", image: img("1497435334941-8c899ee9e8e9") },
    listTitle: "Últimas notícias", sorts: [["recent", "Mais recentes"], ["popular", "Mais lidas"]],
    labels: { items: "Matérias", item: "Matéria" }, moderate: true,
    categories: [{ id: "economia", name: "Economia" }, { id: "tecnologia", name: "Tecnologia" }, { id: "mundo", name: "Mundo" }, { id: "esportes", name: "Esportes" }],
    items: [
      { id: "energia-limpa", title: "Energia limpa já responde por metade da matriz elétrica", category: "economia", author: "Redação", readTime: 6, views: 9200, badge: "Exclusivo", image: img("1497435334941-8c899ee9e8e9"), excerpt: "Eólica e solar puxam expansão e reduzem custo da conta de luz em regiões do Nordeste.", body: "A participação de fontes renováveis na geração de energia alcançou um marco histórico neste mês, segundo dados do operador nacional.\n\nEspecialistas apontam que a expansão das usinas eólicas e solares no Nordeste foi decisiva. Para o consumidor, o efeito começa a aparecer nas tarifas.\n\nO desafio agora é ampliar a capacidade de transmissão para levar essa energia aos grandes centros.", date: days(0) },
      { id: "mercado-alta", title: "Bolsa fecha em alta pelo quinto pregão seguido", category: "economia", author: "Carla Nunes", readTime: 3, views: 4100, image: img("1611974789855-9c2a0a7236a3"), excerpt: "Investidores reagem a dados de inflação abaixo do esperado.", body: "O principal índice da bolsa encerrou o dia em alta, impulsionado por bancos e varejo.\n\nOs dados de inflação abaixo das projeções reforçaram a aposta em cortes de juros.", date: days(1) },
      { id: "satelite", title: "Novo satélite promete internet em áreas remotas", category: "tecnologia", author: "Bruno Reis", readTime: 5, views: 3300, image: img("1451187580459-43490279c0fa"), excerpt: "Constelação de baixa órbita deve atender comunidades rurais a partir de 2027.", body: "O lançamento marca a primeira etapa de uma constelação de satélites de baixa órbita.\n\nA expectativa é levar conexão de alta velocidade a escolas e postos de saúde em regiões sem cobertura.", date: days(1) },
      { id: "cupula-global", title: "Cúpula global fecha acordo sobre clima", category: "mundo", author: "Correspondente", readTime: 7, views: 5100, image: img("1495020689067-958852a7765e"), excerpt: "Países se comprometem com metas mais ambiciosas de redução de emissões.", body: "Após duas semanas de negociações, delegações aprovaram um texto final com metas revisadas.\n\nO acordo prevê um fundo de transição para países em desenvolvimento.", date: days(2) },
      { id: "final-campeonato", title: "Virada histórica decide o campeonato", category: "esportes", author: "Equipe de Esportes", readTime: 4, views: 7800, image: img("1461896836934-ffe607ba8211"), excerpt: "Time da casa marca três gols no segundo tempo e conquista o título.", body: "Em um estádio lotado, o time perdia por 2 a 0 no intervalo.\n\nNo segundo tempo, três gols em 20 minutos garantiram a taça diante da torcida.", date: days(3) },
      { id: "jornal-digital", title: "Leitores de jornal digital crescem 30% no ano", category: "tecnologia", author: "Redação", readTime: 3, views: 1900, image: img("1504711434969-e33886168f5c"), excerpt: "Assinaturas digitais superam o impresso pela primeira vez.", body: "Pesquisa do setor mostra que as assinaturas digitais ultrapassaram as do impresso.\n\nO público jovem lidera o crescimento.", date: days(4) },
    ],
    comments: [{ id: "n1", itemId: "energia-limpa", author: "Roberto", text: "Excelente reportagem, muito bem explicada.", date: days(0), status: "aprovado" }],
    nav: [{ label: "Últimas", href: "index.html" }, { label: "Economia", href: "index.html?cat=economia" }, { label: "Tecnologia", href: "index.html?cat=tecnologia" }, { label: "Mundo", href: "index.html?cat=mundo" }, { label: "Esportes", href: "index.html?cat=esportes" }],
    footer: [{ title: "Editorias", links: [{ label: "Economia", href: "index.html?cat=economia" }, { label: "Mundo", href: "index.html?cat=mundo" }, { label: "Esportes", href: "index.html?cat=esportes" }] }, { title: "Redação", links: [{ label: "Expediente", href: "index.html#extra" }, { label: "Fale com a redação", href: "index.html#extra" }] }, legal],
    extra: newsletter("Receba o resumo do dia", "As principais notícias às 7h, direto no seu e-mail."),
    pages: ["index.html", "item.html", "content.html", "search.html", "admin.html"],
    readme: `Portal de notícias com editorias, manchete em destaque, busca, mais lidas, página de matéria com tempo de leitura e compartilhamento, comentários moderados, newsletter e painel admin (matérias, rascunhos, editorias, comentários, inscritos e configurações).`,
  }),
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const contentHtml = `<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="{{DESCRIPTION}}"><title>{{TITLE}}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?{{FONTS}}&display=swap"><link rel="stylesheet" href="css/theme.css"><link rel="stylesheet" href="css/style.css"></head><body data-page="content"><div id="site-header"></div><main id="conteudo" class="container section"><article class="narrow" id="content-page"></article></main><div id="site-footer"></div><script src="js/config.js"></script><script src="js/store.js"></script><script src="js/site.js"></script></body></html>`;
const searchHtml = `<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Busca — {{TITLE}}</title><link rel="stylesheet" href="css/theme.css"><link rel="stylesheet" href="css/style.css"></head><body data-page="search"><div id="site-header"></div><main class="container section"><h1>Buscar</h1><label class="sr-only" for="global-search">Buscar conteúdo</label><input id="global-search" class="input" type="search" placeholder="Digite para buscar..."><div id="search-results" class="grid" style="margin-top:1.5rem"></div><p id="search-empty" class="empty" hidden>Nenhum resultado encontrado.</p></main><div id="site-footer"></div><script src="js/config.js"></script><script src="js/store.js"></script><script src="js/site.js"></script></body></html>`;
const PAGES: Record<string, string> = { "index.html": indexHtml, "item.html": itemHtml, "cart.html": cartHtml, "content.html": contentHtml, "search.html": searchHtml, "admin.html": adminHtml };

export function buildSiteFiles(kind: SiteKind, repoName: string): GenesisFile[] {
  const name = titleFromName(repoName);
  const d = DEFS[kind](name);
  const fill = (html: string) => html.replaceAll("{{TITLE}}", esc(name)).replaceAll("{{DESCRIPTION}}", esc(d.tagline)).replaceAll("{{FONTS}}", d.fonts);
  const { theme, fonts: _f, pages, readme, ...cfg } = d;
  const config = { id: repoName.toLowerCase(), name, ...cfg, pagesContent: { about: { title: "Sobre nós", body: `Conheça a proposta, os valores e a equipe por trás de ${name}.` }, contact: { title: "Entre em contato", body: "Use os canais oficiais de atendimento para dúvidas, sugestões e parcerias." }, privacy: { title: "Política de privacidade", body: "Esta página deve descrever quais dados são coletados, por que são utilizados, por quanto tempo são mantidos e como o titular pode exercer seus direitos. Configure este texto conforme a operação real do negócio antes de publicar." }, terms: { title: "Termos de uso", body: "Estes termos devem ser revisados para refletir as regras reais de utilização, responsabilidades, pagamentos e cancelamentos antes da publicação." } } };
  const themeCss = `:root {\n${Object.entries(theme).map(([k, v]) => `  --${k}: ${v};`).join("\n")}\n}\n`;
  const pageList = pages.map((p) => `- \`${p}\``).join("\n");
  return [
    ...pages.map((p) => ({ path: p, content: fill(PAGES[p]!) })),
    { path: "css/theme.css", content: themeCss },
    { path: "css/style.css", content: styleCss },
    { path: "js/config.js", content: `/* Conteúdo inicial e configuração do site. Edite livremente. */\nwindow.SITE = ${JSON.stringify(config, null, 2)};\n` },
    { path: "js/store.js", content: storeJs },
    { path: "js/site.js", content: siteJs },
    { path: "js/admin.js", content: adminJs },
    { path: "README.md", content: `# ${name}\n\n${readme}\n\n## Páginas\n${pageList}\n\n## Painel admin\nAcesse \`admin.html\`. No primeiro acesso você define a senha do painel.\n\nImportante: nesta versão o conteúdo e a senha ficam salvos **no navegador** (localStorage). Para vários administradores, pedidos reais e pagamentos, conecte um banco de dados e um provedor de pagamento.\n\n## Estrutura\n\`\`\`\ncss/theme.css   cores e fontes do preset\ncss/style.css   layout e componentes\njs/config.js    conteúdo inicial (produtos, posts, categorias)\njs/store.js     dados salvos no navegador\njs/site.js      páginas públicas\njs/admin.js     painel administrativo\n\`\`\`\n\nHTML, CSS e JavaScript puros, sem build. Publique como site estático.\n\n---\nCriado pelo **WLC.IA Studio**.\n` },
    { path: ".gitignore", content: "node_modules/\n.DS_Store\n" },
  ];
}

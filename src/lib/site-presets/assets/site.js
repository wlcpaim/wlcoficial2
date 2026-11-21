/* Site público: cabeçalho, listagem, detalhe, comentários/respostas e carrinho. */
(function () {
  var C = window.SITE, db = DB.get(), page = document.body.dataset.page;
  var $ = function (s) { return document.querySelector(s); };
  var qs = new URLSearchParams(location.search);

  function header() {
    var cartCount = C.kind === "store" ? db.cart.reduce(function (n, l) { return n + l.qty; }, 0) : 0;
    var links = C.nav.map(function (n) { return '<a href="' + n.href + '">' + esc(n.label) + "</a>"; }).join("");
    $("#site-header").innerHTML =
      (C.topbar ? '<div class="topbar">' + esc(C.topbar) + "</div>" : "") +
      '<header class="site-header"><div class="container header-inner">' +
      '<a class="brand" href="index.html"><span class="brand-mark">' + esc(db.settings.name.charAt(0)) + "</span>" + esc(db.settings.name) + "</a>" +
      '<button class="menu-toggle" aria-expanded="false" aria-controls="menu" aria-label="Abrir menu"><span></span><span></span><span></span></button>' +
      '<nav id="menu" class="nav" aria-label="Principal">' + links +
      (C.kind === "store" ? '<a class="cart-link" href="cart.html">Carrinho <span class="badge">' + cartCount + "</span></a>" : "") +
      '<a href="search.html" aria-label="Buscar">Buscar</a><a class="nav-admin" href="admin.html">Admin</a></nav></div></header>';
    var t = $(".menu-toggle"), m = $("#menu");
    t.addEventListener("click", function () { var o = m.classList.toggle("is-open"); t.setAttribute("aria-expanded", String(o)); });
  }
  function footer() {
    $("#site-footer").innerHTML = '<footer class="site-footer"><div class="container footer-grid"><div><div class="brand">' + esc(db.settings.name) + '</div><p class="muted">' + esc(db.settings.tagline) + "</p></div>" +
      C.footer.map(function (col) { return "<div><h4>" + esc(col.title) + "</h4>" + col.links.map(function (l) { return '<a href="' + l.href + '">' + esc(l.label) + "</a>"; }).join("") + "</div>"; }).join("") +
      '</div><div class="container footer-bottom">© ' + new Date().getFullYear() + " " + esc(db.settings.name) + ". Todos os direitos reservados.</div></footer>";
  }
  function cat(id) { var c = db.categories.find(function (x) { return x.id === id; }); return c ? c.name : ""; }
  function card(i) {
    var href = "item.html?id=" + encodeURIComponent(i.id);
    if (C.kind === "forum") {
      var n = DB.commentsFor(i.id).length;
      return '<a class="topic-row" href="' + href + '"><span class="avatar">' + esc((i.author || "?").charAt(0)) + '</span><span class="topic-main"><strong>' + (i.pinned ? '<span class="pin">Fixado</span> ' : "") + esc(i.title) + '</strong><span class="muted">' + esc(i.author) + " · " + esc(cat(i.category)) + " · " + fmtDate(i.date) + '</span></span><span class="topic-stat"><b>' + n + "</b> respostas</span><span class=\"topic-stat\"><b>" + (i.views || 0) + "</b> visitas</span></a>";
    }
    var meta = C.kind === "store"
      ? '<div class="price-row"><span class="price">' + money(i.price) + "</span>" + (i.oldPrice ? '<s class="muted">' + money(i.oldPrice) + "</s>" : "") + "</div>"
      : '<div class="muted small">' + esc(i.author || "") + " · " + fmtDate(i.date) + (i.readTime ? " · " + i.readTime + " min" : "") + "</div>";
    return '<article class="card"><a href="' + href + '" class="card-media"><img loading="lazy" src="' + esc(i.image) + '" alt="' + esc(i.title) + '" />' + (i.badge ? '<span class="chip">' + esc(i.badge) + "</span>" : "") + '</a><div class="card-body"><span class="eyebrow">' + esc(cat(i.category)) + '</span><h3><a href="' + href + '">' + esc(i.title) + '</a></h3><p class="muted">' + esc(i.excerpt) + "</p>" + meta +
      (C.kind === "store" ? '<button class="btn btn-block" data-add="' + esc(i.id) + '">Adicionar ao carrinho</button>' : "") + "</div></article>";
  }
  function home() {
    var h = C.hero;
    $("#hero").innerHTML = '<div class="hero-copy"><span class="eyebrow">' + esc(h.eyebrow) + "</span><h1>" + esc(h.title) + '</h1><p class="lead">' + esc(db.settings.tagline) + '</p><div class="hero-actions"><a class="btn" href="' + h.ctaHref + '">' + esc(h.cta) + '</a><a class="btn btn-ghost" href="' + h.secondaryHref + '">' + esc(h.secondary) + "</a></div>" +
      (h.stats ? '<dl class="stats">' + h.stats.map(function (s) { return "<div><dt>" + esc(s[1]) + "</dt><dd>" + esc(s[0]) + "</dd></div>"; }).join("") + "</dl>" : "") + "</div>" +
      (h.image ? '<div class="hero-media"><img src="' + esc(h.image) + '" alt="" /></div>' : "");
    $("#list-title").textContent = C.listTitle;
    var active = qs.get("cat") || "all";
    $("#filters").innerHTML = [{ id: "all", name: "Todos" }].concat(db.categories).map(function (c) { return '<button role="tab" class="pill' + (c.id === active ? " is-active" : "") + '" data-cat="' + esc(c.id) + '">' + esc(c.name) + "</button>"; }).join("");
    $("#sort").innerHTML = C.sorts.map(function (s) { return '<option value="' + s[0] + '">' + esc(s[1]) + "</option>"; }).join("");
    function render() {
      var q = $("#search").value.toLowerCase(), s = $("#sort").value;
      var list = DB.published().filter(function (i) { return (active === "all" || i.category === active) && (i.title + " " + i.excerpt).toLowerCase().indexOf(q) >= 0; });
      list.sort(function (a, b) {
        if (C.kind === "forum" && a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (s === "price-asc") return a.price - b.price;
        if (s === "price-desc") return b.price - a.price;
        if (s === "popular") return (b.views || b.sold || 0) - (a.views || a.sold || 0);
        return new Date(b.date) - new Date(a.date);
      });
      $("#list").className = C.kind === "forum" ? "topic-list" : "grid";
      $("#list").innerHTML = list.map(card).join("");
      $("#empty").hidden = list.length > 0;
    }
    $("#filters").addEventListener("click", function (e) { var b = e.target.closest("[data-cat]"); if (!b) return; active = b.dataset.cat; document.querySelectorAll(".pill").forEach(function (p) { p.classList.toggle("is-active", p === b); }); render(); });
    $("#search").addEventListener("input", render); $("#sort").addEventListener("change", render);
    render();
    if (C.extra) $("#extra").innerHTML = C.extra;
    else $("#extra").remove();
  }
  function contentPage() {
    var slug = qs.get("slug") || "about", data = C.pagesContent && C.pagesContent[slug], el = $("#content-page");
    if (!data) { el.innerHTML = '<div class="empty"><h1>Página não encontrada</h1><a class="btn" href="index.html">Voltar ao início</a></div>'; return; }
    document.title = data.title + " — " + db.settings.name;
    el.innerHTML = '<nav class="crumbs"><a href="index.html">Início</a> / ' + esc(data.title) + '</nav><span class="eyebrow">' + esc(db.settings.name) + '</span><h1>' + esc(data.title) + '</h1><p class="lead">' + esc(data.body) + '</p>' + (slug === "contact" ? '<p>Para atendimento, consulte os canais informados pela organização.</p>' : '');
  }
  function searchPage() {
    var input = $("#global-search"), host = $("#search-results"), empty = $("#search-empty");
    function draw() { var q = input.value.trim().toLocaleLowerCase("pt-BR"); var list = DB.published().filter(function (i) { return !q || (i.title + " " + i.excerpt + " " + i.body).toLocaleLowerCase("pt-BR").includes(q); }); host.innerHTML = list.map(card).join(""); empty.hidden = list.length > 0; }
    input.addEventListener("input", draw); draw();
  }
  function addToCart(id) {
    var l = db.cart.find(function (x) { return x.id === id; });
    if (l) l.qty++; else db.cart.push({ id: id, qty: 1 });
    DB.save(); header(); toast("Produto adicionado ao carrinho");
  }
  function discussion(i) {
    var box = $("#discussion"); if (!box) return;
    var label = C.kind === "forum" ? "Respostas" : "Comentários";
    function draw() {
      var list = DB.commentsFor(i.id);
      box.innerHTML = "<h2>" + label + " (" + list.length + ")</h2>" + list.map(function (c) { return '<div class="comment"><span class="avatar">' + esc(c.author.charAt(0)) + '</span><div><strong>' + esc(c.author) + '</strong> <span class="muted small">' + fmtDate(c.date) + "</span><p>" + esc(c.text) + "</p></div></div>"; }).join("") +
        (i.locked ? '<p class="notice">Este tópico está fechado para novas respostas.</p>' :
        '<form class="form card-pad" id="cform"><h3>' + (C.kind === "forum" ? "Responder" : "Deixe seu comentário") + '</h3><input class="input" name="author" required maxlength="60" placeholder="Seu nome" /><textarea class="input" name="text" required maxlength="2000" rows="4" placeholder="Escreva aqui..."></textarea><button class="btn">Publicar</button><p class="form-status" role="status"></p></form>');
      var f = $("#cform"); if (!f) return;
      f.addEventListener("submit", function (e) {
        e.preventDefault(); var d = new FormData(f), a = String(d.get("author")).trim(), t = String(d.get("text")).trim();
        if (a.length < 2 || t.length < 3) { f.querySelector(".form-status").textContent = "Preencha nome e mensagem."; return; }
        db.comments.push({ id: DB.uid(), itemId: i.id, author: a, text: t, date: new Date().toISOString(), status: C.moderate ? "pendente" : "aprovado" });
        DB.save(); if (C.moderate) toast("Comentário enviado para moderação"); draw();
      });
    }
    draw();
  }
  function detail() {
    var i = DB.item(qs.get("id") || "");
    var el = $("#detail");
    if (!i || i.status === "rascunho") { el.innerHTML = '<div class="empty"><h1>Conteúdo não encontrado</h1><a class="btn" href="index.html">Voltar ao início</a></div>'; return; }
    document.title = i.title + " — " + db.settings.name;
    i.views = (i.views || 0) + 1; DB.save();
    var crumbs = '<nav class="crumbs"><a href="index.html">Início</a> / <a href="index.html?cat=' + esc(i.category) + '">' + esc(cat(i.category)) + "</a></nav>";
    var body = (i.body || i.excerpt).split(/\n\n+/).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
    if (C.kind === "store") {
      el.innerHTML = crumbs + '<div class="product"><img class="product-img" src="' + esc(i.image) + '" alt="' + esc(i.title) + '" /><div><span class="eyebrow">' + esc(cat(i.category)) + "</span><h1>" + esc(i.title) + '</h1><div class="price-row big"><span class="price">' + money(i.price) + "</span>" + (i.oldPrice ? "<s>" + money(i.oldPrice) + "</s>" : "") + '</div><p class="muted">ou 10x de ' + money(i.price / 10) + " sem juros</p>" + body +
        '<p class="' + (i.stock > 0 ? "ok" : "danger") + '">' + (i.stock > 0 ? i.stock + " em estoque" : "Esgotado") + '</p><button class="btn btn-lg" data-add="' + esc(i.id) + '"' + (i.stock > 0 ? "" : " disabled") + '>Adicionar ao carrinho</button><ul class="perks"><li>Frete grátis acima de R$ 299</li><li>Troca grátis em 30 dias</li><li>Pagamento seguro</li></ul></div></div>';
      $("#discussion").remove();
    } else if (C.kind === "forum") {
      el.innerHTML = crumbs + '<div class="post-head"><h1>' + esc(i.title) + '</h1><div class="comment op"><span class="avatar">' + esc(i.author.charAt(0)) + '</span><div><strong>' + esc(i.author) + '</strong> <span class="muted small">' + fmtDate(i.date) + "</span>" + body + "</div></div></div>";
    } else {
      el.innerHTML = '<div class="narrow">' + crumbs + '<span class="eyebrow">' + esc(cat(i.category)) + "</span><h1 class=\"article-title\">" + esc(i.title) + '</h1><p class="lead">' + esc(i.excerpt) + '</p><div class="byline"><span class="avatar">' + esc((i.author || "?").charAt(0)) + "</span><span><strong>" + esc(i.author) + '</strong><br><span class="muted small">' + fmtDate(i.date) + (i.readTime ? " · " + i.readTime + " min de leitura" : "") + '</span></span></div></div><img class="article-img" src="' + esc(i.image) + '" alt="" /><div class="narrow prose">' + body + '<div class="share">Compartilhar: <a href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(i.title) + '" target="_blank" rel="noopener">X</a><a href="https://wa.me/?text=' + encodeURIComponent(i.title + " " + location.href) + '" target="_blank" rel="noopener">WhatsApp</a></div></div>';
    }
    discussion(i);
  }
  function cart() {
    var el = $("#cart");
    function draw() {
      var lines = db.cart.map(function (l) { return { l: l, i: DB.item(l.id) }; }).filter(function (x) { return x.i; });
      var sub = lines.reduce(function (s, x) { return s + x.i.price * x.l.qty; }, 0), ship = sub === 0 || sub >= 299 ? 0 : 24.9;
      if (!lines.length) { el.innerHTML = '<div class="empty"><h1>Seu carrinho está vazio</h1><a class="btn" href="index.html">Ver produtos</a></div>'; return; }
      el.innerHTML = '<h1>Carrinho</h1><div class="cart-grid"><div>' + lines.map(function (x) { return '<div class="cart-line"><img src="' + esc(x.i.image) + '" alt="" /><div><strong>' + esc(x.i.title) + '</strong><div class="muted">' + money(x.i.price) + '</div></div><div class="qty"><button data-q="-1" data-id="' + esc(x.i.id) + '" aria-label="Diminuir">−</button><span>' + x.l.qty + '</span><button data-q="1" data-id="' + esc(x.i.id) + '" aria-label="Aumentar">+</button></div><strong>' + money(x.i.price * x.l.qty) + "</strong></div>"; }).join("") +
        '</div><aside class="summary card-pad"><h3>Resumo</h3><div class="row"><span>Subtotal</span><span>' + money(sub) + '</span></div><div class="row"><span>Frete</span><span>' + (ship ? money(ship) : "Grátis") + '</span></div><div class="row total"><span>Total</span><span>' + money(sub + ship) + '</span></div><form class="form" id="checkout"><input class="input" name="name" required placeholder="Nome completo" /><input class="input" name="email" type="email" required placeholder="E-mail" /><input class="input" name="cep" required pattern="[0-9]{5}-?[0-9]{3}" placeholder="CEP" /><button class="btn btn-block">Finalizar pedido</button><p class="muted small">Pagamento online pode ser conectado depois (Stripe, Mercado Pago).</p></form></aside></div>';
    }
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-q]"); if (!b) return; var l = db.cart.find(function (x) { return x.id === b.dataset.id; }); l.qty += Number(b.dataset.q); if (l.qty <= 0) db.cart.splice(db.cart.indexOf(l), 1); DB.save(); header(); draw(); });
    el.addEventListener("submit", function (e) {
      e.preventDefault(); var d = new FormData(e.target);
      var total = db.cart.reduce(function (s, l) { var i = DB.item(l.id); return s + (i ? i.price * l.qty : 0); }, 0);
      db.orders.unshift({ id: "PED-" + (1000 + db.orders.length + 1), customer: String(d.get("name")), email: String(d.get("email")), items: db.cart.slice(), total: total, status: "novo", date: new Date().toISOString() });
      db.cart.forEach(function (l) { var i = DB.item(l.id); if (i) { i.stock = Math.max(0, (i.stock || 0) - l.qty); i.sold = (i.sold || 0) + l.qty; } });
      db.cart = []; DB.save(); header();
      el.innerHTML = '<div class="empty"><h1>Pedido recebido!</h1><p class="muted">Número ' + esc(db.orders[0].id) + '. Você receberá a confirmação por e-mail.</p><a class="btn" href="index.html">Continuar comprando</a></div>';
    });
    draw();
  }
  function newsletter() {
    document.addEventListener("submit", function (e) {
      if (!e.target.matches("[data-newsletter]")) return; e.preventDefault();
      var email = String(new FormData(e.target).get("email") || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Informe um e-mail válido"); return; }
      db.messages.unshift({ id: DB.uid(), email: email, type: "newsletter", date: new Date().toISOString() }); DB.save(); e.target.reset(); toast("Inscrição confirmada!");
    });
  }
  window.toast = function (msg) { var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); };
  try {
    header(); footer(); newsletter();
    document.addEventListener("click", function (e) { var b = e.target.closest("[data-add]"); if (b) addToCart(b.dataset.add); });
    if (page === "home") home(); else if (page === "item") detail(); else if (page === "cart") cart(); else if (page === "content") contentPage(); else if (page === "search") searchPage();
  } catch (err) { console.error("Falha ao iniciar o site:", err); }
})();

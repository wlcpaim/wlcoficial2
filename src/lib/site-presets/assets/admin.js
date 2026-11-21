/* Painel administrativo: acesso por senha local, painel, conteúdo, categorias, comentários/pedidos, inscritos e configurações. */
(function () {
  var C = window.SITE, db = DB.get(), root = document.getElementById("admin-root");
  var PASS_KEY = "site:" + C.id + ":admin";
  var L = C.labels;
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h >>> 0); }
  function authed() { return sessionStorage.getItem(PASS_KEY + ":ok") === "1"; }

  function login() {
    var first = !localStorage.getItem(PASS_KEY);
    root.innerHTML = '<div class="login-wrap"><form class="card-pad login" id="login"><a class="brand" href="index.html"><span class="brand-mark">' + esc(db.settings.name.charAt(0)) + "</span>" + esc(db.settings.name) + "</a><h1>" + (first ? "Criar senha do painel" : "Entrar no painel") + '</h1><p class="muted small">' + (first ? "Defina a senha de administrador neste navegador." : "Acesso restrito à administração.") + '</p><input class="input" type="password" name="p" required minlength="6" placeholder="Senha (mín. 6 caracteres)" autocomplete="' + (first ? "new-password" : "current-password") + '" /><button class="btn btn-block">' + (first ? "Criar e entrar" : "Entrar") + '</button><p class="form-status" role="status"></p></form></div>';
    document.getElementById("login").addEventListener("submit", function (e) {
      e.preventDefault(); var p = String(new FormData(e.target).get("p"));
      if (p.length < 6) return;
      if (first) localStorage.setItem(PASS_KEY, hash(p));
      else if (localStorage.getItem(PASS_KEY) !== hash(p)) { e.target.querySelector(".form-status").textContent = "Senha incorreta."; return; }
      sessionStorage.setItem(PASS_KEY + ":ok", "1"); shell("dashboard");
    });
  }

  var tabs = [["dashboard", "Painel"], ["items", L.items], ["categories", "Categorias"]];
  if (C.kind === "store") tabs.push(["orders", "Pedidos"]); else tabs.push(["comments", C.kind === "forum" ? "Respostas" : "Comentários"]);
  tabs.push(["messages", "Inscritos"], ["settings", "Configurações"]);

  function shell(tab) {
    root.innerHTML = '<div class="admin"><aside class="admin-side"><a class="brand" href="index.html"><span class="brand-mark">' + esc(db.settings.name.charAt(0)) + "</span>" + esc(db.settings.name) + '</a><nav class="admin-nav">' +
      tabs.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (t[0] === tab ? "is-active" : "") + '">' + esc(t[1]) + "</button>"; }).join("") +
      '</nav><div class="admin-side-foot"><a href="index.html" target="_blank">Ver site ↗</a><button id="logout">Sair</button></div></aside><section class="admin-main"><header class="admin-top"><h1>' + esc(tabs.find(function (t) { return t[0] === tab; })[1]) + '</h1></header><div id="view"></div></section></div>';
    root.querySelector(".admin-nav").addEventListener("click", function (e) { var b = e.target.closest("[data-tab]"); if (b) shell(b.dataset.tab); });
    document.getElementById("logout").addEventListener("click", function () { sessionStorage.removeItem(PASS_KEY + ":ok"); login(); });
    ({ dashboard: dashboard, items: items, categories: categories, orders: orders, comments: comments, messages: messages, settings: settings })[tab](document.getElementById("view"));
  }
  function stat(label, value) { return '<div class="stat card-pad"><span class="muted small">' + esc(label) + "</span><strong>" + esc(value) + "</strong></div>"; }
  function dashboard(v) {
    var pub = db.items.filter(function (i) { return i.status !== "rascunho"; }).length;
    var s = [stat(L.items + " publicados", pub), stat("Rascunhos", db.items.length - pub)];
    if (C.kind === "store") { s.push(stat("Pedidos", db.orders.length), stat("Faturamento", money(db.orders.reduce(function (a, o) { return a + o.total; }, 0)))); }
    else { s.push(stat(C.kind === "forum" ? "Respostas" : "Comentários", db.comments.length), stat("Visualizações", db.items.reduce(function (a, i) { return a + (i.views || 0); }, 0))); }
    var top = db.items.slice().sort(function (a, b) { return (b.views || b.sold || 0) - (a.views || a.sold || 0); }).slice(0, 5);
    v.innerHTML = '<div class="stats-grid">' + s.join("") + '</div><div class="card-pad"><h3>Mais ' + (C.kind === "store" ? "vendidos" : "acessados") + '</h3><table class="table"><tbody>' + top.map(function (i) { return "<tr><td>" + esc(i.title) + '</td><td class="right">' + (C.kind === "store" ? (i.sold || 0) + " vendidos" : (i.views || 0) + " visitas") + "</td></tr>"; }).join("") + "</tbody></table></div>";
  }
  function items(v) {
    function draw() {
      v.innerHTML = '<div class="admin-actions"><input class="input" id="f" placeholder="Filtrar..." /><button class="btn" id="new">+ Novo</button></div><div class="table-wrap"><table class="table"><thead><tr><th>' + esc(L.item) + "</th><th>Categoria</th>" + (C.kind === "store" ? "<th>Preço</th><th>Estoque</th>" : "<th>Autor</th>") + '<th>Status</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>';
      function rows() {
        var q = document.getElementById("f").value.toLowerCase();
        document.getElementById("rows").innerHTML = db.items.filter(function (i) { return i.title.toLowerCase().indexOf(q) >= 0; }).map(function (i) {
          var c = db.categories.find(function (x) { return x.id === i.category; });
          return "<tr><td><strong>" + esc(i.title) + "</strong></td><td>" + esc(c ? c.name : "—") + "</td>" + (C.kind === "store" ? "<td>" + money(i.price) + "</td><td>" + (i.stock || 0) + "</td>" : "<td>" + esc(i.author || "") + "</td>") + '<td><span class="status ' + (i.status === "rascunho" ? "draft" : "live") + '">' + (i.status === "rascunho" ? "Rascunho" : "Publicado") + '</span></td><td class="right"><button class="link" data-edit="' + esc(i.id) + '">Editar</button> <button class="link danger" data-del="' + esc(i.id) + '">Excluir</button></td></tr>';
        }).join("");
      }
      rows();
      document.getElementById("f").addEventListener("input", rows);
      document.getElementById("new").addEventListener("click", function () { edit(null); });
      v.querySelector("tbody").addEventListener("click", function (e) {
        var ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
        if (ed) edit(DB.item(ed.dataset.edit));
        if (del && confirm("Excluir este item?")) { db.items = db.items.filter(function (i) { return i.id !== del.dataset.del; }); DB.save(); draw(); }
      });
    }
    function edit(it) {
      var i = it || { id: DB.uid(), title: "", excerpt: "", body: "", image: C.items[0].image, category: (db.categories[0] || {}).id, author: "Equipe", date: new Date().toISOString(), status: "publicado", price: 0, stock: 0 };
      var catOpts = db.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === i.category ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("");
      v.innerHTML = '<form class="card-pad form admin-form" id="ef"><label>Título<input class="input" name="title" required maxlength="140" value="' + esc(i.title) + '" /></label><label>Resumo<textarea class="input" name="excerpt" rows="2" maxlength="300">' + esc(i.excerpt) + '</textarea></label><label>Conteúdo<textarea class="input" name="body" rows="8">' + esc(i.body) + '</textarea></label><div class="form-row"><label>Categoria<select class="input" name="category">' + catOpts + '</select></label><label>Status<select class="input" name="status"><option value="publicado">Publicado</option><option value="rascunho"' + (i.status === "rascunho" ? " selected" : "") + '>Rascunho</option></select></label></div>' +
        (C.kind === "store" ? '<div class="form-row"><label>Preço (R$)<input class="input" name="price" type="number" step="0.01" min="0" value="' + (i.price || 0) + '" /></label><label>Preço anterior<input class="input" name="oldPrice" type="number" step="0.01" min="0" value="' + (i.oldPrice || "") + '" /></label><label>Estoque<input class="input" name="stock" type="number" min="0" value="' + (i.stock || 0) + '" /></label></div>' : '<label>Autor<input class="input" name="author" value="' + esc(i.author || "") + '" /></label>') +
        (C.kind === "forum" ? '<div class="form-row"><label class="check"><input type="checkbox" name="pinned"' + (i.pinned ? " checked" : "") + ' /> Fixar no topo</label><label class="check"><input type="checkbox" name="locked"' + (i.locked ? " checked" : "") + " /> Fechar tópico</label></div>" : "") +
        '<label>URL da imagem<input class="input" name="image" type="url" value="' + esc(i.image) + '" /></label><div class="admin-actions"><button type="button" class="btn btn-ghost" id="cancel">Cancelar</button><button class="btn">Salvar</button></div></form>';
      document.getElementById("cancel").addEventListener("click", draw);
      document.getElementById("ef").addEventListener("submit", function (e) {
        e.preventDefault(); var d = new FormData(e.target);
        ["title", "excerpt", "body", "category", "status", "image", "author"].forEach(function (k) { if (d.has(k)) i[k] = String(d.get(k)).trim(); });
        if (C.kind === "store") { i.price = Number(d.get("price")) || 0; i.oldPrice = Number(d.get("oldPrice")) || 0; i.stock = Number(d.get("stock")) || 0; }
        if (C.kind === "forum") { i.pinned = d.has("pinned"); i.locked = d.has("locked"); }
        if (!it) db.items.unshift(i);
        DB.save(); toast("Salvo"); draw();
      });
    }
    draw();
  }
  function categories(v) {
    function draw() {
      v.innerHTML = '<form class="admin-actions" id="cf"><input class="input" name="n" required maxlength="40" placeholder="Nova categoria" /><button class="btn">Adicionar</button></form><div class="table-wrap"><table class="table"><tbody>' + db.categories.map(function (c) { var n = db.items.filter(function (i) { return i.category === c.id; }).length; return "<tr><td>" + esc(c.name) + '</td><td class="muted">' + n + ' itens</td><td class="right"><button class="link danger" data-del="' + esc(c.id) + '"' + (n ? " disabled title=\"Mova os itens antes\"" : "") + ">Excluir</button></td></tr>"; }).join("") + "</tbody></table></div>";
      document.getElementById("cf").addEventListener("submit", function (e) { e.preventDefault(); var n = String(new FormData(e.target).get("n")).trim(); if (!n) return; db.categories.push({ id: n.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-"), name: n }); DB.save(); draw(); });
      v.querySelector("tbody").addEventListener("click", function (e) { var b = e.target.closest("[data-del]"); if (b && !b.disabled) { db.categories = db.categories.filter(function (c) { return c.id !== b.dataset.del; }); DB.save(); draw(); } });
    }
    draw();
  }
  function orders(v) {
    var st = ["novo", "pago", "enviado", "entregue", "cancelado"];
    function draw() {
      v.innerHTML = db.orders.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th></tr></thead><tbody>' + db.orders.map(function (o, k) { return "<tr><td><strong>" + esc(o.id) + "</strong></td><td>" + esc(o.customer) + '<br><span class="muted small">' + esc(o.email) + "</span></td><td>" + fmtDate(o.date) + "</td><td>" + money(o.total) + '</td><td><select class="input" data-o="' + k + '">' + st.map(function (s) { return "<option" + (s === o.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="empty">Nenhum pedido ainda. Os pedidos feitos no carrinho aparecem aqui.</p>';
      v.addEventListener("change", function (e) { var s = e.target.closest("[data-o]"); if (s) { db.orders[Number(s.dataset.o)].status = s.value; DB.save(); toast("Status atualizado"); } });
    }
    draw();
  }
  function comments(v) {
    function draw() {
      v.innerHTML = db.comments.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Autor</th><th>Mensagem</th><th>Em</th><th>Status</th><th></th></tr></thead><tbody>' + db.comments.slice().reverse().map(function (c) { var it = DB.item(c.itemId); return "<tr><td>" + esc(c.author) + "</td><td>" + esc(c.text.slice(0, 120)) + '</td><td class="muted">' + esc(it ? it.title : "—") + '</td><td><span class="status ' + (c.status === "aprovado" ? "live" : "draft") + '">' + esc(c.status) + '</span></td><td class="right"><button class="link" data-ap="' + esc(c.id) + '">' + (c.status === "aprovado" ? "Ocultar" : "Aprovar") + '</button> <button class="link danger" data-del="' + esc(c.id) + '">Excluir</button></td></tr>'; }).join("") + "</tbody></table></div>" : '<p class="empty">Nenhuma mensagem ainda.</p>';
    }
    v.addEventListener("click", function (e) {
      var a = e.target.closest("[data-ap]"), d = e.target.closest("[data-del]");
      if (a) { var c = db.comments.find(function (x) { return x.id === a.dataset.ap; }); c.status = c.status === "aprovado" ? "oculto" : "aprovado"; }
      if (d) db.comments = db.comments.filter(function (x) { return x.id !== d.dataset.del; });
      if (a || d) { DB.save(); draw(); }
    });
    draw();
  }
  function messages(v) {
    v.innerHTML = db.messages.length ? '<div class="admin-actions"><button class="btn btn-ghost" id="csv">Exportar CSV</button></div><div class="table-wrap"><table class="table"><thead><tr><th>E-mail</th><th>Data</th></tr></thead><tbody>' + db.messages.map(function (m) { return "<tr><td>" + esc(m.email) + "</td><td>" + fmtDate(m.date) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="empty">Nenhum inscrito ainda. As inscrições da newsletter aparecem aqui.</p>';
    var b = document.getElementById("csv");
    if (b) b.addEventListener("click", function () { var csv = "email,data\n" + db.messages.map(function (m) { return m.email + "," + m.date; }).join("\n"); var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "inscritos.csv"; a.click(); });
  }
  function settings(v) {
    v.innerHTML = '<form class="card-pad form admin-form" id="sf"><label>Nome do site<input class="input" name="name" required maxlength="60" value="' + esc(db.settings.name) + '" /></label><label>Slogan<input class="input" name="tagline" maxlength="160" value="' + esc(db.settings.tagline) + '" /></label><div class="admin-actions"><button class="btn">Salvar</button></div></form><div class="card-pad danger-zone"><h3>Restaurar conteúdo inicial</h3><p class="muted small">Apaga as alterações feitas neste navegador e volta ao conteúdo de exemplo.</p><button class="btn btn-danger" id="reset">Restaurar</button></div>';
    document.getElementById("sf").addEventListener("submit", function (e) { e.preventDefault(); var d = new FormData(e.target); db.settings.name = String(d.get("name")).trim(); db.settings.tagline = String(d.get("tagline")).trim(); DB.save(); toast("Configurações salvas"); shell("settings"); });
    document.getElementById("reset").addEventListener("click", function () { if (confirm("Restaurar todo o conteúdo inicial?")) { DB.reset(); db = DB.get(); shell("dashboard"); } });
  }
  window.toast = function (msg) { var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2400); };
  try { authed() ? shell("dashboard") : login(); } catch (err) { console.error("Falha ao iniciar o painel:", err); }
})();

/* Camada de dados: semente em config.js, alterações salvas no navegador (localStorage). */
(function () {
  var C = window.SITE;
  var KEY = "site:" + C.id + ":v1";
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return { items: C.items.slice(), categories: C.categories.slice(), comments: (C.comments || []).slice(), orders: [], messages: [], settings: { name: C.name, tagline: C.tagline }, cart: [] };
  }
  var db = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.error("Falha ao salvar", e); } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  window.DB = {
    get: function () { return db; },
    save: save,
    uid: uid,
    reset: function () { localStorage.removeItem(KEY); db = load(); },
    item: function (id) { return db.items.find(function (i) { return i.id === id; }); },
    published: function () { return db.items.filter(function (i) { return i.status !== "rascunho"; }); },
    commentsFor: function (id) { return db.comments.filter(function (c) { return c.itemId === id && c.status !== "oculto"; }); },
  };
  window.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  window.money = function (v) { return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };
  window.fmtDate = function (d) { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); };
})();

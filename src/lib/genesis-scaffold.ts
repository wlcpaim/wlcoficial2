// Project Genesis scaffold: the starter files every new repository is created with.
export type GenesisInput = { name: string; goal: string; audience?: string; features?: string };
export type GenesisFile = { path: string; content: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function titleFromName(name: string) {
  return name.replace(/[-_.]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim() || name;
}

export function featureList(features?: string) {
  return (features ?? "").split(/\n|;|,/).map((f) => f.trim()).filter(Boolean).slice(0, 12);
}

export function buildGenesisFiles(input: GenesisInput): GenesisFile[] {
  const title = titleFromName(input.name);
  const goal = input.goal.trim();
  const feats = featureList(input.features);
  const t = esc(title), g = esc(goal);
  const cards = (feats.length ? feats : ["Estrutura profissional", "Design responsivo", "Acessibilidade nativa"])
    .map((f) => `        <li class="card"><h3>${esc(f)}</h3></li>`).join("\n");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t}</title>
  <meta name="description" content="${g}" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${g}" />
  <meta property="og:type" content="website" />
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="#">${t}</a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
      <nav id="menu" class="nav" aria-label="Principal">
        <a href="#recursos">Recursos</a>
        <a href="#contato">Contato</a>
      </nav>
    </div>
  </header>
  <main id="conteudo">
    <section class="hero container">
      <h1>${t}</h1>
      <p class="lead">${g}</p>
      <a class="btn" href="#recursos">Conhecer</a>
    </section>
    <section id="recursos" class="container section">
      <h2>Recursos</h2>
      <ul class="grid">
${cards}
      </ul>
    </section>
    <section id="contato" class="container section">
      <h2>Contato</h2>
      <form class="form" novalidate>
        <label for="email">E-mail</label>
        <input id="email" name="email" type="email" required autocomplete="email" />
        <button class="btn" type="submit">Enviar</button>
        <p class="form-status" role="status" aria-live="polite"></p>
      </form>
    </section>
  </main>
  <footer class="site-footer"><div class="container">© <span data-year></span> ${t}</div></footer>
  <script type="module" src="js/app.js"></script>
</body>
</html>
`;

  const css = `/* Design system — tokens */
:root {
  --color-bg: #0f1115;
  --color-surface: #181b22;
  --color-text: #e8eaf0;
  --color-muted: #9aa1b2;
  --color-primary: #4fd1a5;
  --color-primary-contrast: #0f1115;
  --color-danger: #ff6b6b;
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --text-sm: 0.875rem; --text-base: 1rem; --text-lg: 1.25rem; --text-xl: clamp(2rem, 5vw, 3.5rem);
  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 1rem; --space-4: 1.5rem; --space-5: 3rem; --space-6: 5rem;
  --radius: 12px;
  --shadow: 0 8px 24px rgb(0 0 0 / 0.25);
  --transition: 180ms ease;
  --max-width: 1100px;
}

*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-sans); font-size: var(--text-base); line-height: 1.6; color: var(--color-text); background: var(--color-bg); }
img { max-width: 100%; display: block; }
a { color: var(--color-primary); }
:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.container { width: min(100% - 2 * var(--space-3), var(--max-width)); margin-inline: auto; }
.skip-link { position: absolute; left: -999px; }
.skip-link:focus { left: var(--space-3); top: var(--space-3); background: var(--color-surface); padding: var(--space-2); }

.site-header { border-bottom: 1px solid var(--color-surface); }
.header-inner { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding-block: var(--space-3); flex-wrap: wrap; }
.brand { font-weight: 700; color: var(--color-text); text-decoration: none; }
.menu-toggle { background: none; border: 1px solid var(--color-muted); color: var(--color-text); border-radius: var(--radius); padding: var(--space-1) var(--space-3); }
.nav { display: none; width: 100%; flex-direction: column; gap: var(--space-2); }
.nav.is-open { display: flex; }
.nav a { color: var(--color-muted); text-decoration: none; transition: color var(--transition); }
.nav a:hover { color: var(--color-text); }

.hero { padding-block: var(--space-6); }
.hero h1 { font-size: var(--text-xl); line-height: 1.1; margin: 0 0 var(--space-3); }
.lead { color: var(--color-muted); font-size: var(--text-lg); max-width: 60ch; }
.section { padding-block: var(--space-5); }

.btn { display: inline-block; background: var(--color-primary); color: var(--color-primary-contrast); border: 0; border-radius: var(--radius); padding: var(--space-2) var(--space-4); font-weight: 600; text-decoration: none; cursor: pointer; transition: transform var(--transition), opacity var(--transition); }
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: none; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.grid { list-style: none; padding: 0; display: grid; gap: var(--space-3); grid-template-columns: 1fr; }
.card { background: var(--color-surface); border-radius: var(--radius); padding: var(--space-4); box-shadow: var(--shadow); }
.card h3 { margin: 0; font-size: var(--text-base); }

.form { display: grid; gap: var(--space-2); max-width: 420px; }
.form input { padding: var(--space-2) var(--space-3); border-radius: var(--radius); border: 1px solid var(--color-muted); background: var(--color-surface); color: var(--color-text); font: inherit; }
.form-status { min-height: 1.5em; font-size: var(--text-sm); color: var(--color-muted); }
.form-status.is-error { color: var(--color-danger); }

.site-footer { border-top: 1px solid var(--color-surface); padding-block: var(--space-4); color: var(--color-muted); font-size: var(--text-sm); }

@media (min-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 960px) {
  .menu-toggle { display: none; }
  .nav { display: flex; width: auto; flex-direction: row; gap: var(--space-4); }
  .grid { grid-template-columns: repeat(3, 1fr); }
}
`;

  const js = `// ${title} — entrada da aplicação (módulos pequenos, sem globais)
const EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

function initMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("menu");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

function initForm() {
  const form = document.querySelector(".form");
  if (!form) return;
  const status = form.querySelector(".form-status");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = String(new FormData(form).get("email") ?? "").trim();
    const valid = EMAIL_RE.test(email);
    status.classList.toggle("is-error", !valid);
    status.textContent = valid ? "Recebido! Entraremos em contato." : "Informe um e-mail válido.";
    if (valid) form.reset();
  });
}

function initYear() {
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
}

try {
  initMenu();
  initForm();
  initYear();
} catch (error) {
  console.error("Falha ao iniciar a aplicação:", error);
}
`;

  const readme = `# ${title}

${goal}
${input.audience?.trim() ? `\n**Público-alvo:** ${input.audience.trim()}\n` : ""}${feats.length ? `\n## Funcionalidades\n${feats.map((f) => `- ${f}`).join("\n")}\n` : ""}
## Stack
HTML semântico, CSS com design system em tokens e JavaScript modular — sem dependências.

## Estrutura
\`\`\`
index.html     página principal
css/style.css  design system e layout responsivo (mobile-first)
js/app.js      comportamento da aplicação
\`\`\`

## Como usar
Abra \`index.html\` no navegador ou sirva a pasta com qualquer servidor estático
(ex.: \`npx serve .\`).

---
Projeto inicial criado pelo **WLC.IA Studio**.
`;

  return [
    { path: "index.html", content: html },
    { path: "css/style.css", content: css },
    { path: "js/app.js", content: js },
    { path: "README.md", content: readme },
    { path: ".gitignore", content: "node_modules/\ndist/\n.env\n.DS_Store\n" },
  ];
}

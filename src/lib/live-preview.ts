/** Pure helpers for WLC.IA Preview (browser-safe, testable). */
export type Framework = "vite-react" | "vite" | "next" | "vue" | "svelte" | "angular" | "static" | "node" | "unknown";

export function detectFramework(paths: string[], pkgJson: string | null): Framework {
  if (pkgJson) {
    try {
      const p = JSON.parse(pkgJson) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      const d = { ...(p.dependencies ?? {}), ...(p.devDependencies ?? {}) };
      if (d["next"]) return "next";
      if (d["@angular/core"]) return "angular";
      if (d["@sveltejs/kit"]) return "svelte";
      if (d["svelte"]) return "svelte";
      if (d["vue"]) return d["vite"] ? "vite" : "vue";
      if (d["react"] && d["vite"]) return "vite-react";
      if (d["vite"]) return "vite";
      if (d["@remix-run/react"] || d["@remix-run/node"]) return "node";
      if (d["express"] || d["fastify"] || d["hono"]) return "node";
      if (!paths.some((x) => x.endsWith(".html"))) return "node";
    } catch { /* ignore */ }
  }
  return paths.some((x) => x.endsWith(".html")) ? "static" : "unknown";
}

/** Picks the HTML entry that can be rendered without a build step. */
export function pickEntry(paths: string[]): string | null {
  for (const c of ["index.html", "public/index.html", "dist/index.html", "docs/index.html", "build/index.html"]) if (paths.includes(c)) return c;
  return paths.find((p) => p.endsWith("index.html")) ?? null;
}

export function resolvePath(base: string, ref: string): string | null {
  if (/^(https?:)?\/\//i.test(ref) || ref.startsWith("data:") || ref.startsWith("#")) return null;
  const clean = ref.split(/[?#]/)[0]!;
  const dir = base.includes("/") ? base.slice(0, base.lastIndexOf("/")) : "";
  const parts = (clean.startsWith("/") ? clean.slice(1) : (dir ? dir + "/" : "") + clean).split("/");
  const out: string[] = [];
  for (const s of parts) { if (s === "..") out.pop(); else if (s && s !== ".") out.push(s); }
  return out.join("/");
}

/** Script injected into the sandboxed iframe to forward console output to the parent. */
export const CONSOLE_BRIDGE = `<script>(function(){var s=function(l,a){try{parent.postMessage({__wlc:1,__nexus:1,level:l,message:Array.prototype.map.call(a,function(x){try{return typeof x==='string'?x:JSON.stringify(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}};['log','info','warn','error'].forEach(function(l){var o=console[l];console[l]=function(){s(l,arguments);o.apply(console,arguments)}});window.addEventListener('error',function(e){s('error',[e.message+' ('+(e.filename||'')+':'+(e.lineno||0)+')'])});window.addEventListener('unhandledrejection',function(e){s('error',['Unhandled: '+(e.reason&&e.reason.message||e.reason)])});})();</script>`;

export const DEPLOY_STATUSES = ["queued", "building", "live", "failed", "rolled_back", "superseded"] as const;

/** Normalizes a repo/project name into a publication slug (lowercase, hyphens, max 48). */
export function slugify(name: string): string {
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 48).replace(/-+$/g, "") || "site";
}
export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/;

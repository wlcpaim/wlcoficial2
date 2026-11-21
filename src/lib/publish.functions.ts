import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { injectSiteDb } from "./site-db";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as GH from "./github.server";
import { loadGithubToken } from "./agent.server";
import { detectFramework, pickEntry, resolvePath, slugify, SLUG_RE } from "./live-preview";

const MAX_BYTES = 2_000_000;

/** Creates (or returns) the publication for a repo, with a unique slug. */
export const ensurePublication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ repositoryId: z.string().uuid(), slug: z.string().max(48).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: existing } = await sb.from("publications").select("*").eq("repository_id", data.repositoryId).maybeSingle();
    if (existing) {
      if (data.slug && data.slug !== existing.slug) {
        if (existing.active_release_id) throw new Error("O endereço não pode mudar depois de publicado.");
        if (!SLUG_RE.test(data.slug)) throw new Error("Endereço inválido: use letras minúsculas, números e hífens.");
        const { error } = await sb.from("publications").update({ slug: data.slug }).eq("id", existing.id);
        if (error) throw new Error(error.code === "23505" ? "Esse endereço já está em uso." : error.message);
        return { ...existing, slug: data.slug };
      }
      return existing;
    }
    const { data: repo } = await sb.from("repositories").select("name").eq("id", data.repositoryId).eq("user_id", context.userId).maybeSingle();
    if (!repo) throw new Error("Repositório não encontrado");
    const base = data.slug && SLUG_RE.test(data.slug) ? data.slug : slugify(repo.name);
    for (let i = 0; i < 6; i++) {
      const slug = i === 0 ? base : `${base.slice(0, 42)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: row, error } = await sb.from("publications").insert({ user_id: context.userId, repository_id: data.repositoryId, slug }).select("*").single();
      if (!error) return row;
      if (error.code !== "23505") throw new Error(error.message);
    }
    throw new Error("Não foi possível gerar um endereço único.");
  });

/** Real publish: fetch exact commit, validate static site, package immutable release, activate atomically. */
export const publishRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ publicationId: z.string().uuid(), branch: z.string().min(1).max(200), commitSha: z.string().min(7).max(64).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: pub } = await sb.from("publications").select("*, repositories(full_name)").eq("id", data.publicationId).maybeSingle();
    if (!pub) throw new Error("Publicação não encontrada");
    const full = (pub as unknown as { repositories: { full_name: string } }).repositories.full_name;
    const gh = await loadGithubToken(context.userId);
    if (!gh) throw new Error("Conecte o GitHub em Configurações primeiro.");
    const t = gh.token;
    const sha = data.commitSha ?? (await GH.getBranchHead(t, full, data.branch));
    const { data: last } = await sb.from("publication_releases").select("release_number").eq("publication_id", pub.id).order("release_number", { ascending: false }).limit(1).maybeSingle();
    const { data: rel, error } = await sb.from("publication_releases").insert({ user_id: context.userId, publication_id: pub.id, release_number: (last?.release_number ?? 0) + 1, commit_sha: sha, branch: data.branch, status: "validating" }).select("id, release_number").single();
    if (error) throw new Error(error.message);
    const fail = async (msg: string) => {
      await sb.from("publication_releases").update({ status: "failed", error: msg, completed_at: new Date().toISOString() }).eq("id", rel.id);
      return { releaseId: rel.id, status: "failed" as const, error: msg };
    };
    try {
      const commit = await GH.getCommit(t, full, sha);
      await sb.from("publication_releases").update({ status: "fetching_source", commit_message: (commit as { message?: string }).message?.slice(0, 300) ?? null }).eq("id", rel.id);
      const tree = await GH.getTree(t, full, sha);
      const paths = tree.items.filter((i) => i.type === "blob").map((i) => i.path);
      const pkg = paths.includes("package.json") ? (await GH.getFile(t, full, "package.json", sha))?.content ?? null : null;
      const framework = detectFramework(paths, pkg);
      await sb.from("publication_releases").update({ status: "detecting_stack", framework }).eq("id", rel.id);
      if (framework === "unknown") return await fail(paths.length <= 2 && paths.every((x) => /^(readme|license|\.gitignore)/i.test(x))
        ? "O repositório ainda está vazio (só README). Peça no chat para a WLC.IA criar o site (index.html, CSS e JS) e publique de novo."
        : "Nenhum index.html encontrado no commit. Adicione um index.html na raiz do repositório para publicar.");
      if (framework !== "static") return await fail(`Projeto ${framework} precisa de build (instalar dependências e compilar). Esse ambiente de execução isolado ainda não está disponível — só sites HTML/CSS/JS são publicados de verdade.`);
      const entry = pickEntry(paths);
      if (!entry) return await fail("Nenhum index.html encontrado no commit.");
      let html = (await GH.getFile(t, full, entry, sha))?.content;
      if (!html) return await fail(`Não foi possível ler ${entry}.`);
      await sb.from("publication_releases").update({ status: "preparing_release" }).eq("id", rel.id);
      let files = 1;
      const refs = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]*>/gi), ...html.matchAll(/<script([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi)];
      const missing: string[] = [];
      for (const m of refs.slice(0, 40)) {
        const isCss = m[0].toLowerCase().startsWith("<link");
        const ref = isCss ? m[1]! : m[2]!;
        const p = resolvePath(entry, ref);
        if (!p) continue; // external URL, kept as is
        if (!paths.includes(p)) { missing.push(p); continue; }
        const f = await GH.getFile(t, full, p, sha);
        if (!f) { missing.push(p); continue; }
        files++;
        const body = f.content.replace(/<\/(script|style)/gi, "<\\/$1");
        const typeMod = /type=["']module["']/i.test(m[0]) ? ' type="module"' : "";
        html = html.replace(m[0], isCss ? `<style>${body}</style>` : `<script${typeMod}>${body}</script>`);
      }
      if (missing.length) return await fail(`Arquivos referenciados não existem no commit: ${missing.slice(0, 5).join(", ")}`);
      html = injectSiteDb(html, new URL(getRequest().url).origin, pub.repository_id);
      const bytes = new TextEncoder().encode(html).length;
      if (bytes > MAX_BYTES) return await fail(`Site empacotado tem ${Math.round(bytes / 1024)} KB; o limite é ${MAX_BYTES / 1000} KB.`);
      await sb.from("publication_releases").update({ status: "publishing", artifact_html: html, artifact_bytes: bytes, file_count: files }).eq("id", rel.id);
      // Atomic activation: mark live, then switch pointer, then retire previous.
      const now = new Date().toISOString();
      await sb.from("publication_releases").update({ status: "live", activated_at: now, completed_at: now }).eq("id", rel.id);
      const prev = pub.active_release_id;
      const { error: swErr } = await sb.from("publications").update({ active_release_id: rel.id, status: "live", updated_at: now }).eq("id", pub.id);
      if (swErr) return await fail(`Falha ao ativar: ${swErr.message}`);
      // Verify: the public lookup must return this exact release.
      const { data: check } = await sb.rpc("get_published_site", { _slug: pub.slug });
      const row = Array.isArray(check) ? check[0] : null;
      if (!row || row.release_number !== rel.release_number) {
        if (prev) await sb.from("publications").update({ active_release_id: prev }).eq("id", pub.id);
        return await fail("Verificação pós-publicação falhou; versão anterior mantida.");
      }
      if (prev) await sb.from("publication_releases").update({ status: "superseded" }).eq("id", prev);
      return { releaseId: rel.id, status: "live" as const, slug: pub.slug, releaseNumber: rel.release_number };
    } catch (e) {
      return await fail(e instanceof Error ? e.message : String(e));
    }
  });

/** Rollback: re-activate a previous release whose artifact still exists. */
export const activateRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ releaseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: rel } = await sb.from("publication_releases").select("id, publication_id, status, artifact_html").eq("id", data.releaseId).maybeSingle();
    if (!rel) throw new Error("Versão não encontrada");
    if (!rel.artifact_html || !["superseded", "rolled_back"].includes(rel.status)) throw new Error("Só é possível voltar para uma versão que já foi publicada.");
    const { data: pub } = await sb.from("publications").select("id, active_release_id").eq("id", rel.publication_id).single();
    const now = new Date().toISOString();
    await sb.from("publication_releases").update({ status: "live", activated_at: now }).eq("id", rel.id);
    await sb.from("publications").update({ active_release_id: rel.id, updated_at: now }).eq("id", rel.publication_id);
    if (pub?.active_release_id && pub.active_release_id !== rel.id) await sb.from("publication_releases").update({ status: "rolled_back" }).eq("id", pub.active_release_id);
    return { ok: true };
  });

/** Takes the site offline (keeps releases for later). */
export const disablePublication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ publicationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("publications").update({ active_release_id: null, status: "disabled" }).eq("id", data.publicationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: returns the active release HTML for a slug (no auth). */
export const getPublishedSite = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().max(48) }).parse(d))
  .handler(async ({ data }) => {
    if (!SLUG_RE.test(data.slug)) return null;
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } },
    });
    const { data: rows, error } = await sb.rpc("get_published_site", { _slug: data.slug });
    if (error) throw new Error("Falha ao carregar o site");
    const r = (rows as { html: string; release_number: number; commit_sha: string }[] | null)?.[0];
    return r ? { html: r.html, release: r.release_number, commit: r.commit_sha } : null;
  });

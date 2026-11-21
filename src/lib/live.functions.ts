import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { injectSiteDb } from "./site-db";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as GH from "./github.server";
import { loadGithubToken } from "./agent.server";
import { detectFramework, pickEntry, resolvePath, CONSOLE_BRIDGE } from "./live-preview";

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>; userId: string };

async function token(userId: string) {
  const gh = await loadGithubToken(userId);
  if (!gh) throw new Error("Conecte o GitHub em Configurações primeiro.");
  return gh.token;
}
async function repo(ctx: Ctx, id: string) {
  const { data, error } = await ctx.supabase.from("repositories").select("*").eq("id", id).eq("user_id", ctx.userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Repositório não encontrado");
  return data;
}

/** Builds a self-contained HTML preview from the repo (no code runs on our server). */
export const buildPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ repositoryId: z.string().uuid(), branch: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const t = await token(context.userId);
    const r = await repo(context, data.repositoryId);
    const head = await GH.getBranchHead(t, r.full_name, data.branch);
    const tree = await GH.getTree(t, r.full_name, head);
    const paths = tree.items.filter((i) => i.type === "blob").map((i) => i.path);
    const pkg = paths.includes("package.json") ? (await GH.getFile(t, r.full_name, "package.json", head))?.content ?? null : null;
    const framework = detectFramework(paths, pkg);
    const entry = pickEntry(paths);
    let html: string | null = null;
    let note: string | null = null;
    // Never render an unbuilt framework entry and call it a working preview.
    if (framework !== "static" && framework !== "unknown") {
      note = `Runtime/build real necessário para ${framework}. O provedor de execução não está conectado; nenhum código foi executado e este preview não será simulado.`;
    } else if (entry) {
      html = (await GH.getFile(t, r.full_name, entry, head))?.content ?? null;
      if (html) {
        let inlined = 0;
        const refs = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]*>/gi), ...html.matchAll(/<script([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi)];
        for (const m of refs) {
          if (inlined >= 15) break;
          const isCss = m[0].toLowerCase().startsWith("<link");
          const ref = isCss ? m[1]! : m[2]!;
          const p = resolvePath(entry, ref);
          if (!p || !paths.includes(p)) continue;
          const f = await GH.getFile(t, r.full_name, p, head);
          if (!f) continue;
          inlined++;
          const body = f.content.replace(/<\/(script|style)/gi, "<\\/$1");
          const typeMod = /type=["']module["']/i.test(m[0]) ? ' type="module"' : "";
          html = html.replace(m[0], isCss ? `<style>${body}</style>` : `<script${typeMod}>${body}</script>`);
        }
        html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (h) => h + CONSOLE_BRIDGE) : CONSOLE_BRIDGE + html;
        html = injectSiteDb(html, new URL(getRequest().url).origin, r.id);
      }
    } else note = framework === "unknown" ? "O repositório ainda não tem um site (nenhum index.html). Peça no chat para a WLC.IA criar os arquivos e gere o preview de novo." : "Nenhum index.html encontrado — este projeto precisa de build para ser visualizado.";
    const { data: s, error } = await context.supabase.from("preview_sessions").insert({ user_id: context.userId, repository_id: r.id, branch: data.branch, commit_sha: head, framework, entry_path: entry, status: html ? "ready" : "unsupported" }).select("id").single();
    if (error) throw new Error(error.message);
    return { sessionId: s.id, framework, entry, head, html, note };
  });

export const savePreviewLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid(), logs: z.array(z.object({ level: z.string().max(10), message: z.string().max(2000) })).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.logs.length) return { ok: true };
    const { error } = await context.supabase.from("preview_logs").insert(data.logs.map((l) => ({ ...l, user_id: context.userId, session_id: data.sessionId })));
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function log(ctx: Ctx, deploymentId: string, step: string, message: string, level = "info") {
  await ctx.supabase.from("deployment_logs").insert({ user_id: ctx.userId, deployment_id: deploymentId, step, message, level });
}
type DeployPatch = import("@/integrations/supabase/types").Database["public"]["Tables"]["deployments"]["Update"];
async function setStatus(ctx: Ctx, id: string, patch: DeployPatch) {
  await ctx.supabase.from("deployments").update(patch).eq("id", id).eq("user_id", ctx.userId);
}

/** Deploy pipeline: verify commit + CI on GitHub, then health-check the target URL. */
export const startDeploy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ repositoryId: z.string().uuid(), branch: z.string().min(1).max(200), commitSha: z.string().min(7).max(64).optional(), targetUrl: z.string().url().refine((u) => /^https:\/\//.test(u), "Use uma URL https") }).parse(d))
  .handler(async ({ data, context }) => {
    const t = await token(context.userId);
    const r = await repo(context, data.repositoryId);
    const sha = data.commitSha ?? (await GH.getBranchHead(t, r.full_name, data.branch));
    const { data: dep, error } = await context.supabase.from("deployments").insert({ user_id: context.userId, repository_id: r.id, branch: data.branch, commit_sha: sha, target_url: data.targetUrl, status: "queued" }).select("id").single();
    if (error) throw new Error(error.message);
    await context.supabase.from("deployment_domains").upsert({ user_id: context.userId, repository_id: r.id, url: data.targetUrl }, { onConflict: "repository_id" });
    await log(context, dep.id, "queued", `Deploy de ${r.full_name}@${data.branch} (${sha.slice(0, 7)}) na fila`);
    try {
      await setStatus(context, dep.id, { status: "building" });
      const commit = await GH.getCommit(t, r.full_name, sha);
      await setStatus(context, dep.id, { commit_message: (commit as { message?: string }).message?.slice(0, 300) ?? null });
      await log(context, dep.id, "building", `Commit verificado no GitHub: ${sha.slice(0, 7)}`);
      const checks = await GH.getChecks(t, r.full_name, sha);
      for (const run of checks.runs.slice(0, 20)) await log(context, dep.id, "building", `CI ${run.name}: ${run.conclusion ?? run.status}`, run.conclusion === "failure" ? "error" : "info");
      if (checks.state === "failure") throw new Error("CI do GitHub falhou neste commit");
      if (checks.state === "none") await log(context, dep.id, "building", "Sem CI configurado neste commit", "warn");
      const started = Date.now();
      let status = 0;
      try { status = (await fetch(data.targetUrl, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(10000) })).status; } catch (e) { throw new Error(`Health check falhou: ${(e as Error).message}`); }
      await log(context, dep.id, "health", `GET ${data.targetUrl} → ${status} em ${Date.now() - started}ms`, status < 400 ? "info" : "error");
      if (status >= 400) { await setStatus(context, dep.id, { health_status: status }); throw new Error(`Health check retornou ${status}`); }
      await context.supabase.from("deployments").update({ status: "superseded" }).eq("repository_id", r.id).eq("user_id", context.userId).eq("status", "live");
      await setStatus(context, dep.id, { status: "live", health_status: status, finished_at: new Date().toISOString() });
      await log(context, dep.id, "live", "Deploy ativo");
      return { id: dep.id, status: "live" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await log(context, dep.id, "failed", msg, "error");
      await setStatus(context, dep.id, { status: "failed", finished_at: new Date().toISOString() });
      return { id: dep.id, status: "failed", error: msg };
    }
  });

/** 1-click rollback: re-activates a previous successful deployment. */
export const rollbackDeploy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ deploymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: target, error } = await context.supabase.from("deployments").select("*").eq("id", data.deploymentId).eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!target) throw new Error("Deploy não encontrado");
    if (!["superseded", "rolled_back"].includes(target.status) || !target.health_status || target.health_status >= 400) throw new Error("Só é possível voltar para um deploy que já esteve ativo.");
    const { data: current } = await context.supabase.from("deployments").select("id").eq("repository_id", target.repository_id).eq("user_id", context.userId).eq("status", "live").maybeSingle();
    if (current) { await setStatus(context, current.id, { status: "rolled_back" }); await log(context, current.id, "rolled_back", `Substituído por rollback para ${target.commit_sha.slice(0, 7)}`, "warn"); }
    await setStatus(context, target.id, { status: "live", rolled_back_from: current?.id ?? null, finished_at: new Date().toISOString() });
    await log(context, target.id, "live", "Reativado via rollback");
    return { ok: true };
  });

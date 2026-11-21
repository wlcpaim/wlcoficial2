import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as GH from "./github.server";
import { buildGenesisFiles } from "./genesis-scaffold";
import { buildWlcIaFiles } from "./wlc-ia-scaffold";
import { buildSiteFiles } from "./site-presets";
import { loadGithubToken } from "./agent.server";
import type { Json } from "@/integrations/supabase/types";
import { validateRepoName } from "./repo-name";
import { analyzeProject, ANALYZER_FILES } from "./environment/project-analyzer";

const IGNORE = /(^|\/)(node_modules|\.git|dist|build|\.next|coverage|vendor)\//;

/** Static analysis of the repo at `head` (reads manifests only, never executes code). */
async function analyzeAt(token: string, full: string, head: string, paths: string[]) {
  const files: Record<string, string | undefined> = {};
  await Promise.all(ANALYZER_FILES.filter((f) => paths.includes(f)).map(async (f) => {
    const got = await GH.getFile(token, full, f, head);
    if (got) files[f] = got.content;
  }));
  return analyzeProject({ paths, files });
}

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>; userId: string };

async function tokenOrThrow(userId: string) {
  const gh = await loadGithubToken(userId);
  if (!gh) throw new Error("Conecte o GitHub em Configurações primeiro.");
  return gh;
}

async function repoRow(ctx: Ctx, repositoryId: string, requireWrite = false) {
  const { data, error } = await ctx.supabase
    .from("repositories")
    .select("*")
    .eq("id", repositoryId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Repositório não encontrado");
  if (requireWrite && !data.is_authorized) throw new Error("Escrita não autorizada. Habilite \"Agente pode escrever\" em Repositórios.");
  return data;
}

async function snapshot(ctx: Ctx, token: string, repo: { id: string; full_name: string; default_branch: string; project_id: string | null }, branch?: string) {
  const b = branch ?? repo.default_branch;
  const head = await GH.getBranchHead(token, repo.full_name, b);
  const tree = await GH.getTree(token, repo.full_name, head);
  const blobs = tree.items.filter((i) => i.type === "blob");
  const { error: snapshotError } = await ctx.supabase.from("repository_snapshots").insert({
    user_id: ctx.userId, repository_id: repo.id, project_id: repo.project_id, branch: b, head_sha: head,
    tree: blobs.slice(0, 3000).map((i) => ({ path: i.path, sha: i.sha, size: i.size ?? 0 })) as unknown as Json, file_count: blobs.length,
  });
  if (snapshotError) throw new Error(`Falha ao salvar snapshot do repositório: ${snapshotError.message}`);
  let analysisPatch: { analysis?: Json; analyzed_at?: string; analyzed_sha?: string } = {};
  try {
    const profile = await analyzeAt(token, repo.full_name, head, blobs.map((i) => i.path).filter((p) => !IGNORE.test(p)));
    analysisPatch = { analysis: profile as unknown as Json, analyzed_at: new Date().toISOString(), analyzed_sha: head };
  } catch {
    /* analysis is best-effort; the snapshot itself already succeeded */
  }
  const { error: updateError } = await ctx.supabase
    .from("repositories")
    .update({ last_commit_sha: head, last_synced_at: new Date().toISOString(), ...analysisPatch })
    .eq("id", repo.id)
    .eq("user_id", ctx.userId);
  if (updateError) throw new Error(`Falha ao atualizar sincronização: ${updateError.message}`);
  return { head, fileCount: blobs.length, truncated: tree.truncated };
}

export const listGithubRepos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ page: z.number().int().min(1).max(20).default(1) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const repos = await GH.listRepos(gh.token, data.page);
    return { repos, hasMore: repos.length === 100 };
  });

export const importRepository = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ fullName: z.string().regex(/^[\w.-]+\/[\w.-]+$/), projectId: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const r = await GH.getRepo(gh.token, data.fullName);
    const { data: row, error } = await context.supabase
      .from("repositories")
      .upsert(
        { user_id: context.userId, project_id: data.projectId, connection_id: gh.connectionId, owner: r.owner, name: r.name, full_name: r.full_name, default_branch: r.default_branch, html_url: r.html_url, private: r.private, is_authorized: true },
        { onConflict: "user_id,full_name" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const snap = await snapshot(context, gh.token, row);
    if (data.projectId) {
      await context.supabase.from("audit_logs").insert({ user_id: context.userId, project_id: data.projectId, agent: "usuário", operation: "Importar repositório", change_summary: r.full_name, status: "completed", result: `${snap.fileCount} arquivos lidos no HEAD ${snap.head.slice(0, 7)}`, evidence: { repo_full_name: r.full_name, head: snap.head }, commit_sha: snap.head });
    }
    return { id: row.id, ...snap };
  });

export const checkRepoName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const format = validateRepoName(data.name);
    if (format) return { available: false, reason: format, owner: null as string | null };
    const gh = await tokenOrThrow(context.userId);
    const me = await GH.getAuthenticatedUser(gh.token);
    try {
      await GH.getRepo(gh.token, `${me.login}/${data.name}`);
      return { available: false, reason: `Já existe ${me.login}/${data.name} no seu GitHub.`, owner: me.login };
    } catch (e) {
      if (e instanceof GH.GitHubError && e.status === 404) return { available: true, reason: null as string | null, owner: me.login };
      throw e;
    }
  });

export const createGithubRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ name: z.string().trim().regex(/^[\w.-]{1,100}$/, "Use letras, números, ponto, hífen ou _"), description: z.string().max(300).optional(), private: z.boolean(), projectId: z.string().uuid().nullable(), preset: z.enum(["wlc-ia", "starter", "blank", "store", "blog", "forum", "news"]).default("wlc-ia"), genesis: z.object({ goal: z.string().trim().min(3).max(1000), audience: z.string().max(300).optional(), features: z.string().max(1500).optional() }).optional() })
      .refine((v) => v.preset !== "wlc-ia" && v.preset !== "starter" || !!v.genesis, { message: "Informe o objetivo do projeto para o preset escolhido." })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const desc = data.description ?? data.genesis?.goal.slice(0, 300);
    const r = await GH.createRepo(gh.token, { name: data.name, ...(desc ? { description: desc } : {}), private: data.private });
    // "blank" keeps GitHub's default initial commit (README) only; other presets seed a starter template.
    const input = { name: r.name, ...(data.genesis ?? { goal: "" }) };
    const files = data.preset === "blank" ? []
      : data.preset === "wlc-ia" ? buildWlcIaFiles(input)
      : data.preset === "starter" ? buildGenesisFiles(input)
      : buildSiteFiles(data.preset, r.name);
    for (const f of files) {
      let sha: string | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const existing = await GH.getFile(gh.token, r.full_name, f.path, r.default_branch);
          sha = existing?.sha;
          await GH.putFile(gh.token, r.full_name, { path: f.path, content: f.content, message: `genesis: ${f.path}`, branch: r.default_branch, sha });
          break;
        } catch (e) {
          if (attempt === 2) throw new Error(`Repositório criado, mas falhou ao gravar ${f.path}: ${(e as Error).message}`);
          await new Promise((res) => setTimeout(res, 1200));
        }
      }
    }
    const { data: row, error } = await context.supabase
      .from("repositories")
      .insert({ user_id: context.userId, project_id: data.projectId, connection_id: gh.connectionId, owner: r.owner, name: r.name, full_name: r.full_name, default_branch: r.default_branch, html_url: r.html_url, private: r.private, is_authorized: true })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    let snap = null;
    try {
      snap = await snapshot(context, gh.token, row);
    } catch {
      /* fresh repo may need a second to initialise */
    }
    if (data.projectId) {
      await context.supabase.from("audit_logs").insert({ user_id: context.userId, project_id: data.projectId, agent: "usuário", operation: "Criar repositório", change_summary: r.full_name, status: "completed", result: "Repositório criado no GitHub", evidence: { repo_full_name: r.full_name, html_url: r.html_url }, commit_sha: snap?.head ?? null });
    }
    return { id: row.id, full_name: r.full_name };
  });

export const updateRepository = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), projectId: z.string().uuid().nullable().optional(), isAuthorized: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: { project_id?: string | null; is_authorized?: boolean } = {};
    if (data.projectId !== undefined) patch.project_id = data.projectId;
    if (data.isAuthorized !== undefined) patch.is_authorized = data.isAuthorized;
    if (Object.keys(patch).length === 0) throw new Error("Nenhuma alteração informada.");
    const { data: updated, error } = await context.supabase
      .from("repositories")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Repositório não encontrado ou sem permissão para alterá-lo.");
    return { ok: true };
  });

export const syncRepository = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), branch: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const repo = await repoRow(context, data.id);
    return snapshot(context, gh.token, repo, data.branch);
  });

export const repoTree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), branch: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const repo = await repoRow(context, data.id);
    const branch = data.branch ?? repo.default_branch;
    const head = await GH.getBranchHead(gh.token, repo.full_name, branch);
    const tree = await GH.getTree(gh.token, repo.full_name, head);
    return { branch, head, truncated: tree.truncated, items: tree.items.slice(0, 5000) };
  });

export const repoFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), path: z.string().min(1), ref: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const repo = await repoRow(context, data.id);
    const f = await GH.getFile(gh.token, repo.full_name, data.path, data.ref ?? repo.default_branch);
    if (!f) throw new Error("Arquivo não encontrado");
    return { ...f, content: f.content.length > 400000 ? f.content.slice(0, 400000) : f.content, truncated: f.content.length > 400000 };
  });

export const repoWriteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), path: z.string().min(1).max(400), content: z.string().max(1_000_000), message: z.string().min(1).max(300), branch: z.string().min(1), sha: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const repo = await repoRow(context, data.id, true);
    const current = await GH.getFile(gh.token, repo.full_name, data.path, data.branch);
    if (current && data.sha && current.sha !== data.sha) throw new Error("O arquivo mudou no GitHub desde que você o abriu. Recarregue antes de salvar.");
    const res = await GH.putFile(gh.token, repo.full_name, { path: data.path, content: data.content, message: data.message, branch: data.branch, sha: current?.sha });
    const verify = await GH.getFile(gh.token, repo.full_name, data.path, res.commitSha);
    const verified = !!verify && verify.content === data.content;
    if (repo.project_id) {
      await Promise.all([
        context.supabase.from("file_changes").insert({ user_id: context.userId, project_id: repo.project_id, repository_id: repo.id, file_path: data.path, change_type: current ? "update" : "create", commit_sha: res.commitSha, previous_sha: current?.sha ?? null, new_sha: res.blobSha, diff_summary: data.message }),
        context.supabase.from("audit_logs").insert({ user_id: context.userId, project_id: repo.project_id, agent: "usuário (editor)", operation: current ? "Modificar arquivo" : "Criar arquivo", file_path: data.path, change_summary: data.message, status: verified ? "completed" : "needs_fix", result: verified ? "Conteúdo confirmado no commit" : "Conteúdo divergente", evidence: { repo_full_name: repo.full_name, branch: data.branch, commit_url: res.commitUrl, blob_sha: res.blobSha, verified_content_match: verified }, commit_sha: res.commitSha }),
      ]);
    }
    return { ...res, verified };
  });

export const repoDeleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), path: z.string().min(1), branch: z.string().min(1), confirm: z.literal(true) }).parse(d))
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const repo = await repoRow(context, data.id, true);
    const current = await GH.getFile(gh.token, repo.full_name, data.path, data.branch);
    if (!current) throw new Error("Arquivo não encontrado");
    const res = await GH.deleteFile(gh.token, repo.full_name, { path: data.path, branch: data.branch, sha: current.sha, message: `Remove ${data.path}` });
    if (repo.project_id) {
      await context.supabase.from("audit_logs").insert({ user_id: context.userId, project_id: repo.project_id, agent: "usuário (editor)", operation: "Remover arquivo", file_path: data.path, status: "completed", result: "Arquivo removido (confirmado pelo usuário)", evidence: { repo_full_name: repo.full_name, branch: data.branch, commit_url: res.commitUrl, previous_sha: current.sha }, commit_sha: res.commitSha });
      await context.supabase.from("file_changes").insert({ user_id: context.userId, project_id: repo.project_id, repository_id: repo.id, file_path: data.path, change_type: "delete", commit_sha: res.commitSha, previous_sha: current.sha });
    }
    return res;
  });

export const repoCommits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), branch: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const repo = await repoRow(context, data.id);
    return GH.listCommits(gh.token, repo.full_name, data.branch ?? repo.default_branch, 30);
  });

export const repoCommitDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), sha: z.string().min(7) }).parse(d))
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const repo = await repoRow(context, data.id);
    const [commit, checks] = await Promise.all([GH.getCommit(gh.token, repo.full_name, data.sha), GH.getChecks(gh.token, repo.full_name, data.sha)]);
    return { ...commit, checks };
  });

export const repoBranches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const repo = await repoRow(context, data.id);
    return GH.listBranches(gh.token, repo.full_name);
  });

export const repoCreateBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), name: z.string().regex(/^[\w./-]{1,100}$/), from: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const repo = await repoRow(context, data.id, true);
    const sha = await GH.getBranchHead(gh.token, repo.full_name, data.from);
    return GH.createBranch(gh.token, repo.full_name, data.name, sha);
  });

export const repoCompare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), base: z.string().min(1), head: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const gh = await tokenOrThrow(context.userId);
    const repo = await repoRow(context, data.id);
    return GH.compare(gh.token, repo.full_name, data.base, data.head);
  });

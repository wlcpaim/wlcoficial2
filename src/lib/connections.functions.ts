import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { decryptSecret, encryptSecret, redactSecrets, secretHint } from "./crypto.server";
import { listGeminiModels, pingGemini } from "./ai.server";
import { auditGithub, getAuthenticatedUser, listRepos, getRepo } from "./github.server";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VERCEL_MODEL } from "./models";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

const geminiInput = z.object({
  name: z.string().trim().min(1).max(80),
  apiKey: z.string().trim().min(20).max(200),
  model: z.string().trim().min(1).max(80),
  googleProject: z.string().trim().max(120).optional().default(""),
  setPrimary: z.boolean().optional().default(false),
});

export const addGeminiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => geminiInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { count } = await db.from("api_connections").select("id", { count: "exact", head: true }).eq("user_id", context.userId).eq("provider", "gemini");
    const primary = data.setPrimary || !count;
    if (primary) await db.from("api_connections").update({ is_primary: false }).eq("user_id", context.userId).eq("provider", "gemini");
    const { data: row, error } = await db
      .from("api_connections")
      .insert({
        user_id: context.userId,
        provider: "gemini",
        name: data.name,
        model: data.model,
        google_project: data.googleProject || null,
        secret_ciphertext: await encryptSecret(data.apiKey),
        secret_hint: secretHint(data.apiKey),
        is_primary: primary,
        status: "testing",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateGeminiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(80).optional(),
      model: z.string().trim().min(1).max(80).optional(),
      googleProject: z.string().trim().max(120).optional(),
      isActive: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.model !== undefined) Object.assign(patch, { model: data.model.replace(/^models\//, ""), status: "untested", last_error: null, quota_exceeded_at: null });
    if (data.googleProject !== undefined) patch.google_project = data.googleProject || null;
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    const { error } = await db.from("api_connections").update(patch).eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPrimaryKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: row } = await db.from("api_connections").select("id, provider").eq("id", data.id).eq("user_id", context.userId).single();
    if (!row) throw new Error("Chave não encontrada");
    await db.from("api_connections").update({ is_primary: false }).eq("user_id", context.userId).eq("provider", row.provider);
    await db.from("api_connections").update({ is_primary: true, is_active: true }).eq("id", row.id);
    return { ok: true };
  });

export const deleteConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: row } = await db.from("api_connections").select("id, provider, is_primary").eq("id", data.id).eq("user_id", context.userId).single();
    if (!row) throw new Error("Conexão não encontrada");
    const { error } = await db.from("api_connections").delete().eq("id", row.id);
    if (error) throw new Error(error.message);
    if (row.is_primary) {
      const { data: next } = await db.from("api_connections").select("id").eq("user_id", context.userId).eq("provider", row.provider).eq("is_active", true).order("created_at").limit(1).maybeSingle();
      if (next) await db.from("api_connections").update({ is_primary: true }).eq("id", next.id);
    }
    return { ok: true };
  });

export const testGeminiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: row } = await db.from("api_connections").select("id, model, secret_ciphertext, metadata").eq("id", data.id).eq("user_id", context.userId).eq("provider", "gemini").single();
    if (!row) throw new Error("Chave não encontrada");
    const key = await decryptSecret(row.secret_ciphertext);
    let models: string[] = [];
    let modelsError: string | null = null;
    try {
      models = await listGeminiModels(key);
    } catch (e) {
      modelsError = redactSecrets((e as Error).message);
    }
    const ping = await pingGemini(key, row.model ?? DEFAULT_GEMINI_MODEL);
    const now = new Date().toISOString();
    const status = ping.ok ? "ok" : ping.kind === "quota" ? "quota_exceeded" : ping.kind === "invalid" ? "invalid" : "error";
    await db
      .from("api_connections")
      .update({
        status,
        last_tested_at: now,
        last_error: ping.ok ? null : ping.error,
        quota_exceeded_at: ping.ok ? null : ping.kind === "quota" ? now : undefined,
        metadata: { ...((row.metadata as Record<string, unknown>) ?? {}), models: models.length ? models : ((row.metadata as { models?: string[] })?.models ?? []) },
      })
      .eq("id", row.id);
    return { ok: ping.ok, workingModel: ping.ok ? ping.model : null, status, error: ping.ok ? null : ping.error, kind: ping.ok ? null : ping.kind, models: models.length, modelsError };
  });

export const saveGithubToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(80), token: z.string().trim().min(20).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    let user;
    try {
      user = await getAuthenticatedUser(data.token);
    } catch (e) {
      throw new Error(`Token recusado pelo GitHub: ${redactSecrets((e as Error).message)}`);
    }
    const db = await admin();
    const fields = {
      name: data.name,
      secret_ciphertext: await encryptSecret(data.token),
      secret_hint: secretHint(data.token),
      status: "ok",
      last_tested_at: new Date().toISOString(),
      last_error: null,
      is_active: true,
      is_primary: true,
      metadata: { login: user.login, name: user.name, avatar_url: user.avatar_url, scopes: user.scopes, audit: await auditGithub(data.token).catch(() => null) },
    };
    const { data: existing } = await db.from("api_connections").select("id").eq("user_id", context.userId).eq("provider", "github").limit(1).maybeSingle();
    if (existing) {
      const { error } = await db.from("api_connections").update(fields).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("api_connections").insert({ ...fields, user_id: context.userId, provider: "github" });
      if (error) throw new Error(error.message);
    }
    return { login: user.login, scopes: user.scopes };
  });

export const testGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: row } = await db.from("api_connections").select("id, secret_ciphertext, metadata").eq("user_id", context.userId).eq("provider", "github").limit(1).maybeSingle();
    if (!row) throw new Error("GitHub não conectado");
    const now = new Date().toISOString();
    try {
      const a = await auditGithub(await decryptSecret(row.secret_ciphertext));
      if (!a.login) throw new Error(a.checks[0]?.detail ?? "Token recusado");
      const status = a.missing.length ? "partial" : "ok";
      const last_error = a.missing.length ? `Permissões incompletas: ${a.missing.join(", ")}` : null;
      await db.from("api_connections").update({ status, last_tested_at: now, last_error, metadata: { ...((row.metadata as object) ?? {}), login: a.login, scopes: a.scopes || "fine-grained", audit: a } }).eq("id", row.id);
      await db.from("test_results").insert({ user_id: context.userId, run_id: crypto.randomUUID(), suite: "github", test_name: "github_audit", status: a.missing.length ? "failed" : "passed", details: a as any } as any).then(() => null, () => null);
      return { ok: !a.missing.length, login: a.login, scopes: a.scopes, error: last_error };
    } catch (e) {
      const msg = redactSecrets((e as Error).message);
      await db.from("api_connections").update({ status: "invalid", last_tested_at: now, last_error: msg }).eq("id", row.id);
      return { ok: false, login: null, scopes: null, error: msg };
    }
  });

const vercelInput = z.object({ apiKey: z.string().trim().max(300).optional().default(""), model: z.string().trim().max(120).optional().default("") });

/** Saves (or updates) the user's Vercel AI Gateway key; empty apiKey keeps the stored one and only changes the model. */
export const saveVercelKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => vercelInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: existing } = await db.from("api_connections").select("id").eq("user_id", context.userId).eq("provider", "vercel").limit(1).maybeSingle();
    if (!existing && !data.apiKey) throw new Error("Informe a chave da Vercel.");
    const { callVercel, listVercelModels } = await import("./ai.server");
    let key = data.apiKey;
    if (!key) { const { data: r } = await db.from("api_connections").select("secret_ciphertext").eq("id", existing!.id).single(); key = await decryptSecret(r!.secret_ciphertext); }
    const models = await listVercelModels(key).catch(() => [] as string[]);
    const candidates = Array.from(new Set([data.model, DEFAULT_VERCEL_MODEL, ...models].filter(Boolean)));
    let model: string | null = null; let lastErr = "";
    for (const m of candidates.slice(0, 6)) {
      try { await callVercel(key, m, [{ role: "user", content: "Responda apenas: ok" }], undefined, 16); model = m; break; }
      catch (e) { lastErr = redactSecrets((e as Error).message); if (/recusada|401|403/.test(lastErr)) break; }
    }
    if (!model) throw new Error(`Chave da Vercel não funcionou: ${lastErr || "nenhum modelo respondeu"}`);
    const fields: any = { model, name: "Vercel AI Gateway", status: "ok", last_tested_at: new Date().toISOString(), last_error: null, is_active: true, is_primary: true, metadata: { models } };
    if (data.apiKey) { fields.secret_ciphertext = await encryptSecret(data.apiKey); fields.secret_hint = secretHint(data.apiKey); }
    const { error } = existing
      ? await db.from("api_connections").update(fields).eq("id", existing.id)
      : await db.from("api_connections").insert({ ...fields, user_id: context.userId, provider: "vercel" });
    if (error) throw new Error(error.message);
    return { ok: true, model, models: models.length };
  });

export const testVercelKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: row } = await db.from("api_connections").select("id, model, secret_ciphertext").eq("user_id", context.userId).eq("provider", "vercel").limit(1).maybeSingle();
    if (!row) throw new Error("Vercel não conectada.");
    const { callVercel } = await import("./ai.server");
    const now = new Date().toISOString();
    try {
      await callVercel(await decryptSecret(row.secret_ciphertext), row.model ?? "moonshotai/kimi-k3", [{ role: "user", content: "Responda apenas: ok" }], undefined, 16);
      await db.from("api_connections").update({ status: "ok", last_tested_at: now, last_error: null }).eq("id", row.id);
      return { ok: true, model: row.model };
    } catch (e) {
      const msg = redactSecrets((e as Error).message);
      await db.from("api_connections").update({ status: "error", last_tested_at: now, last_error: msg }).eq("id", row.id);
      throw new Error(msg);
    }
  });

async function githubRow(userId: string) {
  const db = await admin();
  const { data } = await db.from("api_connections").select("id, secret_ciphertext, metadata").eq("user_id", userId).eq("provider", "github").limit(1).maybeSingle();
  if (!data) throw new Error("GitHub não conectado");
  return { db, row: data, token: await decryptSecret(data.secret_ciphertext) };
}

/** Lists the repositories the saved GitHub token can write to. */
export const listKnowledgeRepos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { token } = await githubRow(context.userId);
    const repos = await listRepos(token);
    return repos.map((r: any) => ({ full: r.full_name ?? r.fullName ?? r.full, branch: r.default_branch ?? r.defaultBranch ?? "main" }));
  });

/** Fixes the official WLC.IA repository where every motor is committed. */
export const setKnowledgeRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ full: z.string().trim().regex(/^[\w.-]+\/[\w.-]+$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, row, token } = await githubRow(context.userId);
    const r: any = await getRepo(token, data.full);
    const repo = { full: r.full_name ?? r.fullName ?? data.full, branch: r.default_branch ?? r.defaultBranch ?? "main" };
    const { error } = await db.from("api_connections").update({ metadata: { ...((row.metadata as object) ?? {}), knowledge_repo: repo } }).eq("id", row.id);
    if (error) throw new Error(error.message);
    return repo;
  });

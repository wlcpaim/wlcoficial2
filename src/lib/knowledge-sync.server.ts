// Commits cognitive motors into the user's chosen official repository (best effort, never throws).
import { decryptSecret } from "./crypto.server";
import { getFile, putFile } from "./github.server";
import { motorDir, renderMotorJson, renderMotorReadme } from "./knowledge-sync";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;
}

export async function knowledgeRepoFor(userId: string) {
  const db = await admin();
  const { data } = await db.from("api_connections").select("secret_ciphertext, metadata").eq("user_id", userId).eq("provider", "github").limit(1).maybeSingle();
  const repo = (data?.metadata as any)?.knowledge_repo as { full: string; branch: string } | undefined;
  if (!data || !repo?.full) return null;
  return { token: await decryptSecret(data.secret_ciphertext), full: repo.full, branch: repo.branch || "main" };
}

export async function syncMotorToRepo(userId: string, motorId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const repo = await knowledgeRepoFor(userId);
    if (!repo) return { ok: false, error: "Repositório oficial não configurado" };
    const db = await admin();
    const { data: motor } = await db.from("cognitive_motors").select("name, slug, description").eq("id", motorId).eq("user_id", userId).single();
    if (!motor) return { ok: false, error: "Motor não encontrado" };
    const { data: rows } = await db.from("cognitive_knowledge").select("title, content, category, kind, keywords, validation, status").eq("motor_id", motorId).eq("user_id", userId).order("created_at").limit(2000);
    const items = (rows ?? []).filter((r: any) => r.status !== "superseded");
    const dir = motorDir(motor.slug);
    const files = [
      { path: `${dir}/motor.json`, content: renderMotorJson(motor, items) },
      { path: `${dir}/README.md`, content: renderMotorReadme(motor, items) },
    ];
    for (const f of files) {
      const cur = await getFile(repo.token, repo.full, f.path, repo.branch);
      if (cur?.content === f.content) continue;
      await putFile(repo.token, repo.full, { path: f.path, content: f.content, branch: repo.branch, message: `WLC.IA: motor ${motor.name} (${items.length} conhecimentos)`, ...(cur ? { sha: cur.sha } : {}) });
    }
    return { ok: true };
  } catch (e) {
    console.error("[knowledge-sync]", e);
    return { ok: false, error: (e as Error).message };
  }
}

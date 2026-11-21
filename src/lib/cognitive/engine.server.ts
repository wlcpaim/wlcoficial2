// Server-only cognitive layer: provider selection, retrieval, answering, extraction and consolidation.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { AIError, callBuiltin, callGeminiAuto, type ChatMsg } from "@/lib/ai.server";
import { decryptSecret } from "@/lib/crypto.server";
import { ANALYSIS_PROMPT, EXTRACTION_PROMPT, parseExtraction, type RetrievedKnowledge } from "./prompts";

type DB = SupabaseClient<Database>;

export async function complete(userId: string, messages: ChatMsg[], maxTokens = 4000): Promise<{ text: string; provider: string }> {
  // Reuse the provider the user configured in Settings (Gemini keys) and fall back to the built-in WLC.IA engine.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: keys } = await supabaseAdmin.from("api_connections").select("secret_ciphertext, model")
    .eq("user_id", userId).eq("provider", "gemini").eq("is_active", true).order("is_primary", { ascending: false }).limit(2);
  let lastErr: unknown = null;
  for (const k of keys ?? []) {
    try {
      const r = await callGeminiAuto(await decryptSecret(k.secret_ciphertext), k.model, messages, undefined, maxTokens);
      return { text: r.message.content ?? "", provider: `gemini:${r.model}` };
    } catch (e) { lastErr = e; }
  }
  try {
    const r = await callBuiltin(messages, undefined, maxTokens);
    return { text: r.message.content ?? "", provider: "wlc-builtin" };
  } catch (e) {
    const msg = e instanceof AIError ? e.message : (e as Error).message;
    const prev = lastErr instanceof Error ? ` (chave Gemini: ${lastErr.message.slice(0, 160)})` : "";
    throw new Error(`Provedor de IA indisponível: ${msg}${prev}. Configure uma chave Gemini em Configurações.`);
  }
}

export async function retrieve(db: DB, motorId: string, query: string, includeGlobal: boolean): Promise<RetrievedKnowledge[]> {
  const { data, error } = await db.rpc("search_cognitive_knowledge", { _motor_id: motorId, _query: query, _include_global: includeGlobal, _limit: 12 });
  if (error) throw new Error(error.message);
  let rows = (data ?? []) as RetrievedKnowledge[];
  if (rows.length < 3) {
    // Selective fallback: most recent active knowledge of this motor so continuity survives vague questions.
    const { data: recent } = await db.from("cognitive_knowledge").select("id, title, category, kind, content, validation, version")
      .eq("motor_id", motorId).eq("status", "active").order("updated_at", { ascending: false }).limit(6);
    const seen = new Set(rows.map((r) => r.id));
    rows = rows.concat((recent ?? []).filter((r) => !seen.has(r.id)).map((r) => ({ ...r, motor_name: "", is_global: false })));
  }
  return rows.slice(0, 14);
}

export async function logEvent(db: DB, userId: string, motorId: string, stage: string, title: string, detail: Record<string, unknown> = {}, status: "ok" | "warning" | "error" = "ok") {
  await db.from("cognitive_learning_events").insert({ user_id: userId, motor_id: motorId, stage, title, status, detail: detail as never });
}

export async function analyzeDocument(userId: string, name: string, tree: string[], files: { path: string; content: string }[]): Promise<{ text: string; provider: string }> {
  let budget = 90_000; const parts: string[] = [];
  for (const f of files) { if (budget <= 0) break; const c = f.content.slice(0, Math.min(8000, budget)); parts.push(`### ${f.path}\n${c}`); budget -= c.length; }
  return complete(userId, [
    { role: "system", content: ANALYSIS_PROMPT },
    { role: "user", content: `<material_de_estudo>\nDocumento: ${name}\nÁrvore (${tree.length} arquivos):\n${tree.slice(0, 400).join("\n")}\n\n${parts.join("\n\n")}\n</material_de_estudo>` },
  ], 5000);
}

/** Extract → validate → organize → consolidate. Never overwrites: updates create versions, conflicts keep both. */
export async function learn(db: DB, userId: string, motorId: string, material: string, src: { messageId?: string | null; documentId?: string | null }, shareDefault: boolean) {
  const { data: existing } = await db.rpc("search_cognitive_knowledge", { _motor_id: motorId, _query: material.slice(0, 2000), _include_global: false, _limit: 25 });
  const ex = (existing ?? []) as RetrievedKnowledge[];
  const exText = ex.length ? ex.map((k) => `id=${k.id} | ${k.title} | ${k.content.slice(0, 300)}`).join("\n") : "(nenhum)";
  const { text } = await complete(userId, [
    { role: "system", content: EXTRACTION_PROMPT },
    { role: "user", content: `CONHECIMENTOS EXISTENTES:\n${exText}\n\nMATERIAL:\n${material.slice(0, 60_000)}` },
  ], 3000);
  const items = parseExtraction(text, new Set(ex.map((k) => k.id)));
  const stats = { created: 0, versioned: 0, duplicates: 0, conflicts: 0 };
  for (const it of items) {
    if (it.relation === "duplicate" && it.target_id) {
      await db.from("cognitive_knowledge_sources").insert({ user_id: userId, knowledge_id: it.target_id, message_id: src.messageId ?? null, document_id: src.documentId ?? null, excerpt: it.excerpt });
      stats.duplicates++; continue;
    }
    let root: string | null = null; let version = 1; let previous: string | null = null; const conflicts: string[] = [];
    let validation = it.validation;
    if (it.relation === "update" && it.target_id) {
      const { data: prev } = await db.from("cognitive_knowledge").select("id, root_id, version").eq("id", it.target_id).maybeSingle();
      if (prev) { root = prev.root_id ?? prev.id; version = prev.version + 1; previous = prev.id; }
    }
    if (it.relation === "conflict" && it.target_id) { conflicts.push(it.target_id); validation = "conflicting"; }
    const { data: row, error } = await db.from("cognitive_knowledge").insert({
      user_id: userId, motor_id: motorId, root_id: root, version, previous_id: previous, title: it.title, category: it.category, kind: it.kind,
      content: it.content, validation, visibility: shareDefault ? "global" : "motor", conflicts_with: conflicts, keywords: it.keywords,
      learned_how: src.documentId ? "document" : "conversation",
    }).select("id").single();
    if (error || !row) continue;
    if (previous) { await db.from("cognitive_knowledge").update({ status: "superseded" }).eq("id", previous); stats.versioned++; } else stats.created++;
    if (conflicts.length) {
      const t = conflicts[0]!;
      const { data: other } = await db.from("cognitive_knowledge").select("conflicts_with").eq("id", t).maybeSingle();
      await db.from("cognitive_knowledge").update({ validation: "conflicting", conflicts_with: [...(other?.conflicts_with ?? []), row.id] }).eq("id", t);
      stats.conflicts++;
    }
    await db.from("cognitive_knowledge_sources").insert({ user_id: userId, knowledge_id: row.id, message_id: src.messageId ?? null, document_id: src.documentId ?? null, excerpt: it.excerpt });
  }
  await logEvent(db, userId, motorId, "consolidation", `Aprendizagem: ${stats.created} novos, ${stats.versioned} versões, ${stats.duplicates} duplicados, ${stats.conflicts} conflitos`, { ...stats, ...src });
  if (stats.created + stats.versioned + stats.conflicts > 0) await db.from("cognitive_motors").update({ last_learning_at: new Date().toISOString() }).eq("id", motorId);
  return stats;
}

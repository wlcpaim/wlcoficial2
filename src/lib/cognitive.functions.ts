// Cognitive Chat server actions. All run as the signed-in user (RLS-scoped context.supabase).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify } from "./cognitive/files";
import { COGNITIVE_RULES, buildMemoryBlock, buildStudyBlock } from "./cognitive/prompts";
import type { ChatMsg } from "./ai.server";

const uuid = z.string().uuid();

/** Keeps learning running after the response is sent (Workers waitUntil), awaiting it elsewhere. */
async function background(p: Promise<unknown>) {
  const safe = p.catch((e) => console.error("[cognitive] background", e));
  try {
    const spec = "cloudflare:workers";
    const cf: any = await import(/* @vite-ignore */ spec);
    if (typeof cf?.waitUntil === "function") { cf.waitUntil(safe); return; }
  } catch { /* not on workers */ }
  await safe;
}

export const createMotor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(2000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const base = slugify(data.name);
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data: hit } = await db.from("cognitive_motors").select("id").eq("slug", slug).maybeSingle();
      if (!hit) break; slug = `${base}-${i}`;
    }
    const { data: motor, error } = await db.from("cognitive_motors").insert({ user_id: context.userId, name: data.name, slug, description: data.description ?? null }).select("id").single();
    if (error) throw new Error(error.message);
    const { data: conv, error: e2 } = await db.from("cognitive_conversations").insert({ user_id: context.userId, motor_id: motor.id, title: "Primeira conversa" }).select("id").single();
    if (e2) throw new Error(e2.message);
    return { motorId: motor.id as string, conversationId: conv.id as string };
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ motorId: uuid, title: z.string().trim().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: conv, error } = await db.from("cognitive_conversations").insert({ user_id: context.userId, motor_id: data.motorId, title: data.title || "Nova conversa" }).select("id").single();
    if (error) throw new Error(error.message);
    return { conversationId: conv.id as string };
  });

export const sendCognitiveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ conversationId: uuid, message: z.string().trim().min(1).max(30000), documentIds: z.array(uuid).max(10).default([]) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { complete, retrieve, logEvent, learn } = await import("./cognitive/engine.server");
    const { data: conv, error: ce } = await db.from("cognitive_conversations").select("id, motor_id, title").eq("id", data.conversationId).single();
    if (ce || !conv) throw new Error("Conversa não encontrada.");
    const motorId = conv.motor_id as string;
    const [{ data: motor }, { data: settings }] = await Promise.all([
      db.from("cognitive_motors").select("name, description").eq("id", motorId).single(),
      db.from("cognitive_motor_settings").select("share_new_knowledge, use_global_knowledge").eq("motor_id", motorId).maybeSingle(),
    ]);
    const useGlobal = settings?.use_global_knowledge ?? true;

    // 1. Receive
    const { data: userMsg, error: me } = await db.from("cognitive_messages").insert({ user_id: context.userId, motor_id: motorId, conversation_id: conv.id, role: "user", content: data.message, document_ids: data.documentIds }).select("id").single();
    if (me) throw new Error(me.message);
    if (conv.title === "Nova conversa" || conv.title === "Primeira conversa") await db.from("cognitive_conversations").update({ title: data.message.slice(0, 80) }).eq("id", conv.id);
    else await db.from("cognitive_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conv.id);
    await db.from("cognitive_motors").update({ last_activity_at: new Date().toISOString() }).eq("id", motorId);

    // 2-8. Interpret + retrieve memory (motor + authorized global) + attached study material
    const knowledge = await retrieve(db, motorId, data.message, useGlobal);
    const docs: { name: string; analysis: string | null; files: { path: string; content: string }[] }[] = [];
    for (const id of data.documentIds) {
      const { data: d } = await db.from("cognitive_documents").select("id, name, analysis").eq("id", id).eq("motor_id", motorId).maybeSingle();
      if (!d) continue;
      const { data: files } = await db.from("cognitive_file_contents").select("path, content").eq("document_id", id).eq("status", "processed").limit(200);
      docs.push({ name: d.name, analysis: d.analysis, files: (files ?? []).filter((f: any) => f.content) });
    }
    const { data: history } = await db.from("cognitive_messages").select("role, content").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(16);
    const past = ((history ?? []) as { role: string; content: string }[]).reverse().slice(0, -1);

    const messages: ChatMsg[] = [
      { role: "system", content: `${COGNITIVE_RULES}\n\nMotor atual: "${motor?.name}"${motor?.description ? ` — ${motor.description}` : ""}.\n\n${buildMemoryBlock(knowledge)}` },
      ...past.map((m) => (m.role === "assistant" ? { role: "assistant" as const, content: m.content.slice(0, 6000) } : { role: "user" as const, content: m.content.slice(0, 6000) })),
      { role: "user", content: `${buildStudyBlock(docs)}\n\n${data.message}`.trim() },
    ];
    let answer: string; let provider: string;
    try {
      const r = await complete(context.userId, messages, 6000);
      answer = r.text.trim() || "(resposta vazia do provedor)"; provider = r.provider;
    } catch (e) {
      const msg = (e as Error).message;
      await logEvent(db, context.userId, motorId, "interpretation", "Falha ao consultar o provedor de IA", { error: msg.slice(0, 500) }, "error");
      const { data: am } = await db.from("cognitive_messages").insert({ user_id: context.userId, motor_id: motorId, conversation_id: conv.id, role: "system", content: `⚠️ ${msg}`, metadata: { error: true } }).select("id").single();
      return { ok: false as const, error: msg, messageId: am?.id as string | undefined };
    }
    const used = knowledge.map((k, i) => ({ ref: `K${i + 1}`, id: k.id, title: k.title, motor: k.is_global ? k.motor_name : null }));
    const { data: am } = await db.from("cognitive_messages").insert({ user_id: context.userId, motor_id: motorId, conversation_id: conv.id, role: "assistant", content: answer, metadata: { provider, used_knowledge: used, documents: data.documentIds } }).select("id").single();
    await db.from("cognitive_memory_index").insert({ user_id: context.userId, motor_id: motorId, message_id: am?.id ?? null, query: data.message.slice(0, 2000),
      knowledge_ids: knowledge.filter((k) => !k.is_global).map((k) => k.id), global_ids: knowledge.filter((k) => k.is_global).map((k) => k.id) });
    await logEvent(db, context.userId, motorId, "reuse", `Resposta com ${knowledge.length} conhecimentos recuperados`, { message_id: am?.id, used: used.length });

    // Extraction + consolidation of what this exchange taught
    await background(learn(db, context.userId, motorId, `PERGUNTA:\n${data.message}\n\nRESPOSTA:\n${answer}`, { messageId: userMsg.id }, settings?.share_new_knowledge ?? false));
    return { ok: true as const, messageId: am?.id as string };
  });

const fileSchema = z.object({ path: z.string().min(1).max(500), language: z.string().max(40).nullable(), size: z.number().int().nonnegative(), content: z.string().max(1_100_000).nullable(), reason: z.string().max(500).nullable() });

export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ motorId: uuid, conversationId: uuid.nullable(), name: z.string().trim().min(1).max(300), kind: z.string().max(20), size: z.number().int().nonnegative().max(26 * 1024 * 1024), fileCount: z.number().int().nonnegative().max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: doc, error } = await db.from("cognitive_documents").insert({ user_id: context.userId, motor_id: data.motorId, conversation_id: data.conversationId, name: data.name, kind: data.kind, size_bytes: data.size, file_count: data.fileCount }).select("id").single();
    if (error) throw new Error(error.message);
    const { logEvent } = await import("./cognitive/engine.server");
    await logEvent(db, context.userId, data.motorId, "reception", `Documento recebido: ${data.name}`, { document_id: doc.id, files: data.fileCount, kind: data.kind });
    return { documentId: doc.id as string };
  });

export const addDocumentFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ documentId: uuid, files: z.array(fileSchema).min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const total = data.files.reduce((n, f) => n + (f.content?.length ?? 0), 0);
    if (total > 1_600_000) throw new Error("Lote grande demais.");
    const { data: doc } = await db.from("cognitive_documents").select("id, motor_id, status").eq("id", data.documentId).single();
    if (!doc || doc.status !== "receiving") throw new Error("Documento não aceita mais arquivos.");
    const rows = data.files.map((f) => ({ user_id: context.userId, motor_id: doc.motor_id, document_id: doc.id, path: f.path, language: f.language, size_bytes: f.size,
      status: f.content ? "processed" : "skipped", reason: f.content ? null : (f.reason ?? "Não interpretável"), content: f.content?.replace(/\u0000/g, "") ?? null }));
    const { error } = await db.from("cognitive_file_contents").insert(rows);
    if (error) throw new Error(error.message);
    return { stored: rows.length };
  });

export const finalizeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ documentId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { analyzeDocument, learn, logEvent } = await import("./cognitive/engine.server");
    const { data: doc } = await db.from("cognitive_documents").select("id, motor_id, name").eq("id", data.documentId).single();
    if (!doc) throw new Error("Documento não encontrado.");
    const { data: files } = await db.from("cognitive_file_contents").select("path, status, content").eq("document_id", doc.id).order("path");
    const all = (files ?? []) as { path: string; status: string; content: string | null }[];
    const ok = all.filter((f) => f.status === "processed" && f.content);
    const skipped = all.length - ok.length;
    await db.from("cognitive_documents").update({ status: "processing", file_count: all.length, processed_count: ok.length, skipped_count: skipped }).eq("id", doc.id);
    if (!ok.length) {
      await db.from("cognitive_documents").update({ status: "failed", error: "Nenhum arquivo pôde ser interpretado." }).eq("id", doc.id);
      await logEvent(db, context.userId, doc.motor_id, "interpretation", `Nenhum arquivo interpretável em ${doc.name}`, { document_id: doc.id, skipped }, "warning");
      return { status: "failed" as const, processed: 0, skipped };
    }
    try {
      const { data: settings } = await db.from("cognitive_motor_settings").select("share_new_knowledge").eq("motor_id", doc.motor_id).maybeSingle();
      const analysis = await analyzeDocument(context.userId, doc.name, all.map((f) => f.path), ok.map((f) => ({ path: f.path, content: f.content! })));
      const status = skipped ? "partial" : "processed";
      await db.from("cognitive_documents").update({ status, analysis: analysis.text }).eq("id", doc.id);
      await logEvent(db, context.userId, doc.motor_id, "interpretation", `Análise técnica de ${doc.name}: ${ok.length} processados, ${skipped} não interpretados`, { document_id: doc.id });
      const material = `DOCUMENTO ${doc.name}\nANÁLISE:\n${analysis.text}\n\nTRECHOS:\n${ok.slice(0, 30).map((f) => `### ${f.path}\n${f.content!.slice(0, 3000)}`).join("\n\n")}`;
      const stats = await learn(db, context.userId, doc.motor_id, material, { documentId: doc.id }, settings?.share_new_knowledge ?? false);
      return { status, processed: ok.length, skipped, learned: stats };
    } catch (e) {
      const msg = (e as Error).message;
      await db.from("cognitive_documents").update({ status: "failed", error: msg.slice(0, 1000) }).eq("id", doc.id);
      await logEvent(db, context.userId, doc.motor_id, "interpretation", `Falha ao analisar ${doc.name}`, { document_id: doc.id, error: msg.slice(0, 500) }, "error");
      return { status: "failed" as const, processed: ok.length, skipped, error: msg };
    }
  });

/** Correction without deletion: writes a new version and marks the old one superseded. */
export const reviseKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid, title: z.string().trim().min(1).max(200), content: z.string().trim().min(1).max(6000), validation: z.enum(["confirmed","source_validated","hypothesis","estimate","unverified","conflicting"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: k } = await db.from("cognitive_knowledge").select("*").eq("id", data.id).single();
    if (!k || k.status !== "active") throw new Error("Só a versão ativa pode ser revisada.");
    const { data: row, error } = await db.from("cognitive_knowledge").insert({ user_id: context.userId, motor_id: k.motor_id, root_id: k.root_id ?? k.id, version: k.version + 1, previous_id: k.id,
      title: data.title, category: k.category, kind: k.kind, content: data.content, validation: data.validation, visibility: k.visibility, keywords: k.keywords, related_ids: k.related_ids, learned_how: "manual_revision" }).select("id").single();
    if (error) throw new Error(error.message);
    await db.from("cognitive_knowledge").update({ status: "superseded" }).eq("id", k.id);
    await db.from("cognitive_knowledge_sources").insert({ user_id: context.userId, knowledge_id: row.id, excerpt: "Revisão manual do usuário" });
    const { logEvent } = await import("./cognitive/engine.server");
    await logEvent(db, context.userId, k.motor_id, "versioning", `Conhecimento revisado: ${data.title} (v${k.version + 1})`, { from: k.id, to: row.id });
    return { id: row.id as string };
  });

/** Native file representation generated from the database (the transactional source). */
export const exportMotorFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ motorId: uuid.nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    let mq = db.from("cognitive_motors").select("*").order("created_at");
    if (data.motorId) mq = mq.eq("id", data.motorId);
    const { data: motors } = await mq;
    const files: Record<string, string> = {};
    const J = (v: unknown) => JSON.stringify(v, null, 2);
    const globalIdx: unknown[] = [];
    for (const m of motors ?? []) {
      const root = `cognitive-engine/motors/${m.slug}`;
      const [{ data: settings }, { data: know }, { data: convs }, { data: docs }, { data: events }] = await Promise.all([
        db.from("cognitive_motor_settings").select("*").eq("motor_id", m.id).maybeSingle(),
        db.from("cognitive_knowledge").select("id, root_id, version, previous_id, title, category, kind, content, validation, visibility, status, conflicts_with, keywords, learned_how, created_at").eq("motor_id", m.id).order("created_at"),
        db.from("cognitive_conversations").select("id, title, created_at, updated_at").eq("motor_id", m.id).order("created_at"),
        db.from("cognitive_documents").select("id, name, kind, size_bytes, status, file_count, processed_count, skipped_count, analysis, created_at").eq("motor_id", m.id).order("created_at"),
        db.from("cognitive_learning_events").select("stage, status, title, detail, created_at").eq("motor_id", m.id).order("created_at").limit(5000),
      ]);
      const k = (know ?? []) as any[];
      files[`${root}/motor.json`] = J({ id: m.id, name: m.name, slug: m.slug, description: m.description, created_at: m.created_at, last_learning_at: m.last_learning_at, settings, exported_at: new Date().toISOString() });
      files[`${root}/memory/knowledge.json`] = J(k);
      const byKind = (kinds: string[]) => k.filter((x) => kinds.includes(x.kind) && x.status === "active");
      files[`${root}/memory/concepts.json`] = J(byKind(["concept", "fact"]));
      files[`${root}/memory/techniques.json`] = J(byKind(["technique", "method", "pattern", "algorithm", "architecture", "solution", "experience"]));
      files[`${root}/memory/formulas.json`] = J(byKind(["formula"]));
      files[`${root}/memory/rules.json`] = J(byKind(["rule"]));
      for (const c of convs ?? []) {
        const { data: msgs } = await db.from("cognitive_messages").select("id, role, content, document_ids, created_at").eq("conversation_id", c.id).order("created_at");
        files[`${root}/conversations/${c.id}.json`] = J({ ...c, messages: msgs ?? [] });
      }
      for (const d of docs ?? []) {
        const { data: fl } = await db.from("cognitive_file_contents").select("path, status, reason, size_bytes").eq("document_id", d.id).order("path");
        files[`${root}/documents/${d.id}.json`] = J({ ...d, files: fl ?? [] });
      }
      files[`${root}/learning-history/events.json`] = J(events ?? []);
      for (const x of k) if (x.visibility === "global" && x.status === "active") globalIdx.push({ id: x.id, motor: m.slug, title: x.title, kind: x.kind, category: x.category, validation: x.validation });
    }
    files["cognitive-engine/global-knowledge/index.json"] = J(globalIdx);
    return { files };
  });

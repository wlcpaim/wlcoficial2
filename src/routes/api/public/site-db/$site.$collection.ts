import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { COLLECTION_RE, SITE_DB_LIMITS } from "@/lib/site-db";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });
const Params = z.object({ site: z.string().uuid(), collection: z.string().regex(COLLECTION_RE) });

async function resolve(params: unknown) {
  const p = Params.safeParse(params);
  if (!p.success) return { error: json({ error: "Endereço de coleção inválido" }, 400) } as const;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: repo } = await supabaseAdmin.from("repositories").select("id, user_id").eq("id", p.data.site).maybeSingle();
  if (!repo) return { error: json({ error: "Site não encontrado" }, 404) } as const;
  return { db: supabaseAdmin, repo, collection: p.data.collection } as const;
}

// Public by design: generated sites (preview + published) read and append records of their own isolated database.
// Only list and create are exposed; editing and deleting stay with the signed-in owner in the Studio.
export const Route = createFileRoute("/api/public/site-db/$site/$collection")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        const r = await resolve(params);
        if ("error" in r) return r.error;
        const { data, error } = await r.db.from("site_records").select("id, data, created_at").eq("repository_id", r.repo.id).eq("collection", r.collection).order("created_at", { ascending: false }).limit(SITE_DB_LIMITS.listLimit);
        if (error) return json({ error: "Falha ao ler" }, 500);
        return json({ records: (data ?? []).map((x) => ({ id: x.id, created_at: x.created_at, ...(x.data as object) })) });
      },
      POST: async ({ params, request }) => {
        const r = await resolve(params);
        if ("error" in r) return r.error;
        const raw = await request.text();
        if (raw.length > SITE_DB_LIMITS.maxRecordBytes) return json({ error: "Registro grande demais" }, 413);
        let body: unknown; try { body = JSON.parse(raw); } catch { return json({ error: "JSON inválido" }, 400); }
        const parsed = z.object({ data: z.record(z.string().max(60), z.unknown()) }).safeParse(body);
        if (!parsed.success) return json({ error: "Envie { data: { ... } }" }, 400);
        const { count } = await r.db.from("site_records").select("id", { count: "exact", head: true }).eq("repository_id", r.repo.id);
        if ((count ?? 0) >= SITE_DB_LIMITS.maxRecordsPerSite) return json({ error: "Limite de registros do site atingido" }, 429);
        const { data, error } = await r.db.from("site_records").insert({ user_id: r.repo.user_id, repository_id: r.repo.id, collection: r.collection, data: parsed.data.data as never }).select("id, data, created_at").single();
        if (error) return json({ error: "Falha ao gravar" }, 500);
        return json({ record: { id: data.id, created_at: data.created_at, ...(data.data as object) } }, 201);
      },
    },
  },
});

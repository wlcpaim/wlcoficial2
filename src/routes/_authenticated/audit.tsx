import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { reaudit } from "@/lib/studio.functions";
import { Page, Empty, Loading, ErrorBox, Status, fmt } from "@/components/studio/ui";
import { ProjectFilter } from "@/components/studio/ProjectFilter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Central de auditoria — WLC.IA" }, { name: "description", content: "Toda operação registrada e verificada contra o GitHub." }, { property: "og:title", content: "Central de auditoria — WLC.IA" }, { property: "og:description", content: "Toda operação registrada e verificada contra o GitHub." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Audit,
});

function Audit() {
  const [p, setP] = useState("all");
  const qc = useQueryClient();
  const re = useServerFn(reaudit);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["audit", p], queryFn: async () => {
    let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
    if (p !== "all") q = q.eq("project_id", p);
    const { data, error } = await q; if (error) throw error; return data;
  } });
  async function run(id: string) {
    setBusy(id);
    try { const r = await re({ data: { id } }); toast.success(`Reauditado: ${r.status}`); qc.invalidateQueries({ queryKey: ["audit"] }); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  return (
    <Page title="Auditoria" desc="Aprovação só com evidência real: commit, conteúdo gravado e checagens do GitHub." actions={<ProjectFilter value={p} onChange={setP} />}>
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : !data?.length ? <Empty>Nenhuma operação auditada ainda.</Empty> : (
        <ol className="relative space-y-3 border-l pl-4">
          {data.map((a) => {
            const ev = (a.evidence ?? {}) as any;
            return (
              <li key={a.id} className="relative">
                <span className="absolute -left-[21px] top-4 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground" />
                <div className="space-y-2 rounded-lg border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs">{a.operation}</span><Status s={a.status} /></div>
                  {a.file_path && <div className="break-anywhere font-mono text-xs text-muted-foreground">{a.file_path}</div>}
                  {a.change_summary && <div className="break-anywhere text-sm">{a.change_summary}</div>}
                  {a.result && <div className="whitespace-pre-wrap break-anywhere rounded bg-muted/50 p-2 text-xs text-muted-foreground">{a.result}</div>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{fmt(a.created_at)}</span><span>{a.agent}</span>
                    {a.commit_sha && (ev.commit_url ? <a className="font-mono text-primary" href={ev.commit_url} target="_blank" rel="noreferrer">{a.commit_sha.slice(0, 7)}</a> : <span className="font-mono">{a.commit_sha.slice(0, 7)}</span>)}
                  </div>
                  {a.commit_sha && <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => run(a.id)}>{busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Reauditar no GitHub</Button>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Page>
  );
}

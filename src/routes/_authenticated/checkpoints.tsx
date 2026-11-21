import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Play, SearchCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkCheckpoint, resumeCheckpoint } from "@/lib/studio.functions";
import { Page, Empty, Loading, ErrorBox, Status, fmt } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/checkpoints")({
  head: () => ({ meta: [{ title: "Checkpoints — WLC.IA" }, { name: "description", content: "Estados salvos e retomada validada contra o repositório real." }, { property: "og:title", content: "Checkpoints — WLC.IA" }, { property: "og:description", content: "Estados salvos e retomada validada contra o repositório real." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Checkpoints,
});

function Checkpoints() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const check = useServerFn(checkCheckpoint);
  const resume = useServerFn(resumeCheckpoint);
  const [busy, setBusy] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, { report: string[]; divergences: string[] }>>({});
  const { data, isLoading, error } = useQuery({ queryKey: ["checkpoints"], queryFn: async () => {
    const { data, error } = await supabase.from("checkpoints").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error; return data;
  } });
  async function validate(id: string) {
    setBusy(id + "v");
    try { const r = await check({ data: { id } }); setReports((s) => ({ ...s, [id]: r })); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  async function doResume(id: string) {
    setBusy(id + "r");
    const r = await resume({ data: { id } }).catch((e) => ({ ok: false, error: (e as Error).message, chatId: null } as any));
    setBusy(null); qc.invalidateQueries({ queryKey: ["checkpoints"] });
    if (!r.ok) return toast.error(r.error);
    toast.success(r.paused ? "Retomado, mas pausou de novo (limite de API)." : "Retomado com sucesso");
    if (r.chatId) nav({ to: "/chat/$id", params: { id: r.chatId } });
  }
  return (
    <Page title="Checkpoints" desc="Antes de retomar, o estado real do GitHub é comparado com o checkpoint.">
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : !data?.length ? <Empty>Nenhum checkpoint. Eles são criados automaticamente quando a API atinge o limite ou a sessão cai.</Empty> : (
        <div className="space-y-3">
          {data.map((c) => {
            const rep = reports[c.id];
            const files = (c.modified_files ?? []) as any[];
            return (
              <div key={c.id} className="space-y-2 rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0 break-anywhere text-sm font-medium">{c.reason}</div><Status s={c.status} /></div>
                <div className="text-xs text-muted-foreground">{fmt(c.created_at)} · {c.repo_full_name ? `${c.repo_full_name}@${c.branch} · HEAD ${c.head_sha?.slice(0, 7) ?? "?"}` : "sem repositório"}</div>
                {c.last_operation && <div className="break-anywhere text-xs">Última operação: {c.last_operation}</div>}
                {files.length > 0 && <div className="break-anywhere font-mono text-xs text-muted-foreground">{files.map((f) => f.path).join(", ")}</div>}
                {rep && (
                  <div className="space-y-1 rounded bg-muted/50 p-2 text-xs">
                    {rep.report.map((r, i) => <div key={i} className="break-anywhere">{r}</div>)}
                    {rep.divergences.map((r, i) => <div key={i} className="break-anywhere text-warning">⚠ {r}</div>)}
                    {!rep.divergences.length && <div className="text-success">Estado real confere.</div>}
                  </div>
                )}
                {c.status === "open" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => validate(c.id)}>{busy === c.id + "v" ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />} Validar estado</Button>
                    <Button size="sm" disabled={!!busy} onClick={() => doResume(c.id)}>{busy === c.id + "r" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Retomar</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { runSystemTests } from "@/lib/studio.functions";
import { Page, Empty, Loading, Status, fmt } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tests")({
  head: () => ({ meta: [{ title: "Central de testes — WLC.IA" }, { name: "description", content: "Testes reais de conexões, banco, isolamento e persistência." }, { property: "og:title", content: "Central de testes — WLC.IA" }, { property: "og:description", content: "Testes reais de conexões, banco, isolamento e persistência." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Tests,
});

function Tests() {
  const run = useServerFn(runSystemTests);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["tests"], queryFn: async () => {
    const { data } = await supabase.from("test_results").select("*").order("created_at", { ascending: false }).limit(60);
    return data ?? [];
  } });
  const lastRun = data?.[0]?.run_id;
  const latest = data?.filter((r) => r.run_id === lastRun) ?? [];
  async function go() {
    setBusy(true);
    try { const r = await run(); const f = r.results.filter((x) => x.status === "failed").length; f ? toast.error(`${f} teste(s) falharam`) : toast.success("Todos os testes executados passaram"); }
    catch (e) { toast.error((e as Error).message); }
    setBusy(false); qc.invalidateQueries({ queryKey: ["tests"] });
  }
  return (
    <Page title="Central de testes" desc="Cada teste executa uma operação real e guarda o resultado." actions={<Button disabled={busy} onClick={go}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} Executar testes</Button>}>
      {isLoading ? <Loading /> : !latest.length ? <Empty>Nenhuma execução ainda.</Empty> : (
        <>
          <div className="text-xs text-muted-foreground">Última execução: {fmt(latest[0]?.created_at)} · {latest.filter((r) => r.status === "passed").length}/{latest.length} passaram</div>
          <div className="space-y-2">
            {latest.map((r) => (
              <div key={r.id} className="space-y-1 rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0 text-sm"><span className="text-muted-foreground">{r.suite} · </span>{r.test_name}</div><Status s={r.status} /></div>
                <div className="break-anywhere font-mono text-xs text-muted-foreground">{(r.details as any) ?? ""} · {r.duration_ms}ms</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}

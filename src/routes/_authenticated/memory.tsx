import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Page, Empty, Loading, ErrorBox, fmt } from "@/components/studio/ui";
import { ProjectFilter } from "@/components/studio/ProjectFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/memory")({
  head: () => ({ meta: [{ title: "Memória dos projetos — WLC.IA" }, { name: "description", content: "Decisões, regras e fatos que o agente lembra em cada projeto." }, { property: "og:title", content: "Memória dos projetos — WLC.IA" }, { property: "og:description", content: "Decisões, regras e fatos que o agente lembra em cada projeto." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Memory,
});

function Memory() {
  const [p, setP] = useState("");
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["memory", p], enabled: !!p, queryFn: async () => {
    const { data, error } = await supabase.from("project_memory").select("*").eq("project_id", p).order("updated_at", { ascending: false });
    if (error) throw error; return data;
  } });
  async function add() {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("project_memory").insert({ user_id: u.user!.id, project_id: p, kind: "note", title: title.trim(), content: content.trim() });
    if (error) return toast.error(error.message);
    setTitle(""); setContent(""); qc.invalidateQueries({ queryKey: ["memory", p] });
  }
  async function del(id: string) {
    if (!confirm("Remover esta memória?")) return;
    const { error } = await supabase.from("project_memory").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["memory", p] });
  }
  return (
    <Page title="Memória" desc="O agente lê estas memórias ao montar o contexto." actions={<ProjectFilter value={p} onChange={setP} allowAll={false} />}>
      {!p ? <Empty>Escolha um projeto.</Empty> : <>
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          <Textarea placeholder="Conteúdo (ex.: 'Usar sempre pnpm', 'API em /v2')" value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} />
          <Button size="sm" disabled={!title.trim() || !content.trim()} onClick={add}><Plus className="h-4 w-4" /> Adicionar memória</Button>
        </div>
        {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : !data?.length ? <Empty>Nenhuma memória neste projeto.</Empty> : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.map((m) => (
              <div key={m.id} className="space-y-2 rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0 break-anywhere font-medium">{m.title}</div><Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Remover" onClick={() => del(m.id)}><Trash2 className="h-4 w-4" /></Button></div>
                <div className="whitespace-pre-wrap break-anywhere text-sm text-muted-foreground">{m.content}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Badge variant="secondary" className="font-normal">{m.kind}</Badge>{fmt(m.updated_at)}</div>
              </div>
            ))}
          </div>
        )}
      </>}
    </Page>
  );
}

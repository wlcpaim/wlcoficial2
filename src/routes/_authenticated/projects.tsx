import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Archive, MessageSquarePlus } from "lucide-react";
import { getPreset, type ProjectPresetId } from "@/lib/project-presets";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProjects, useRepos } from "@/lib/data";
import { Page, Empty, Loading, ErrorBox, fmt } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projetos — WLC.IA" }, { name: "description", content: "Seus projetos de desenvolvimento." }, { property: "og:title", content: "Projetos — WLC.IA" }, { property: "og:description", content: "Seus projetos de desenvolvimento." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Projects,
});

function Projects() {
  const { data, isLoading, error } = useProjects();
  const repos = useRepos();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const preset: ProjectPresetId = "empty";
  const [editing, setEditing] = useState<{ id: string; name: string; preset: ProjectPresetId } | null>(null);

  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("projects").insert({ user_id: u.user!.id, name: name.trim(), description: desc.trim() || null, preset, default_model: "wlc-v1.0:auto" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Projeto criado"); setOpen(false); setName(""); setDesc("");
    qc.invalidateQueries({ queryKey: ["projects"] });
  }
  async function savePreset() {
    if (!editing) return;
    setBusy(true);
    // Only the preset changes; chats, memory and history stay untouched.
    const { error } = await supabase.from("projects").update({ preset: editing.preset }).eq("id", editing.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Preset alterado para ${getPreset(editing.preset).label}. O histórico foi mantido.`);
    setEditing(null); qc.invalidateQueries({ queryKey: ["projects"] });
  }
  async function archive(id: string) {
    const { error } = await supabase.from("projects").update({ status: "archived" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Projeto arquivado"); qc.invalidateQueries({ queryKey: ["projects"] });
  }

  return (
    <Page title="Projetos" desc="Cada projeto tem histórico, memória, tarefas e auditoria próprios." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Novo projeto</Button>}>
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : !data?.length ? <Empty>Nenhum projeto ainda. Crie o primeiro.</Empty> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => {
            const r = repos.data?.filter((x) => x.project_id === p.id) ?? [];
            return (
              <div key={p.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4">
                <div className="min-w-0"><div className="flex items-center gap-2"><div className="min-w-0 flex-1 truncate font-medium">{p.name}</div></div><div className="line-clamp-2 text-sm text-muted-foreground">{p.description || "Sem descrição"}</div></div>
                <div className="text-xs text-muted-foreground">{r.length ? r.map((x) => x.full_name).join(", ") : "Sem repositório vinculado"} · {fmt(p.last_activity_at ?? p.created_at)}</div>
                {p.context_summary && <div className="line-clamp-3 rounded bg-muted/50 p-2 text-xs text-muted-foreground">{p.context_summary}</div>}
                <div className="mt-auto flex gap-2">
                  <Button asChild size="sm" className="flex-1"><Link to="/chat" search={{ project: p.id }}><MessageSquarePlus className="h-4 w-4" /> Chat</Link></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="outline" aria-label="Arquivar"><Archive className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Arquivar "{p.name}"?</AlertDialogTitle><AlertDialogDescription>O histórico é preservado. O projeto sai da lista de ativos.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => archive(p.id)}>Arquivar</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo projeto</DialogTitle></DialogHeader>
          <div className="space-y-3"><Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /><Textarea placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} /></div>
          <DialogFooter><Button disabled={!name.trim() || busy} onClick={create}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Preset de "{editing?.name}"</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Muda só a orientação inicial da WLC.IA. Chats, memória e histórico do projeto são mantidos.</p>
          
          <DialogFooter><Button disabled={busy} onClick={savePreset}>Salvar preset</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

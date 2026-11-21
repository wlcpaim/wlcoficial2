import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Star, Trash2, Loader2, Zap, Pencil } from "lucide-react";
import { DEFAULT_GEMINI_MODEL } from "@/lib/models";
import { toast } from "sonner";
import { addGeminiKey, deleteConnection, setPrimaryKey, testGeminiKey, updateGeminiKey } from "@/lib/connections.functions";
import { useConnections } from "@/lib/data";
import { Page, Empty, Loading, ErrorBox, Status, fmt } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/apis")({
  beforeLoad: () => { throw redirect({ to: "/settings" }); },
  head: () => ({ meta: [{ title: "Configurações — WLC.IA" }, { name: "description", content: "Configurações do WLC.IA." }, { property: "og:title", content: "Configurações — WLC.IA" }, { property: "og:description", content: "Configurações do WLC.IA." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Apis,
});

function Apis() {
  const { data, isLoading, error } = useConnections();
  const qc = useQueryClient();
  const add = useServerFn(addGeminiKey);
  const del = useServerFn(deleteConnection);
  const prim = useServerFn(setPrimaryKey);
  const test = useServerFn(testGeminiKey);
  const upd = useServerFn(updateGeminiKey);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", apiKey: "", model: DEFAULT_GEMINI_MODEL, googleProject: "", setPrimary: false });
  const [edit, setEdit] = useState<{ id: string; name: string; model: string; googleProject: string; models: string[] } | null>(null);
  const keys = data?.filter((c) => c.provider === "gemini") ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["connections"] });
  async function run(key: string, fn: () => Promise<any>, ok?: (r: any) => string) {
    setBusy(key);
    try { const r = await fn(); if (ok) toast.success(ok(r)); refresh(); return r; } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  return (
    <Page title="Gerenciador de APIs" desc="A principal é usada primeiro; ao esgotar a cota, passa para as reservas. Se todas falharem, usa o Gemini embutido." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Adicionar chave</Button>}>
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">Chaves do mesmo projeto Google compartilham a cota. Preencha "Projeto Google" para que o sistema pule chaves do mesmo projeto quando a cota esgotar.</div>
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : !keys.length ? <Empty>Nenhuma chave cadastrada. O Gemini embutido será usado até você adicionar uma.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2">
          {keys.map((k) => (
            <div key={k.id} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><div className="flex items-center gap-1.5 font-medium">{k.is_primary && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}<span className="truncate">{k.name}</span></div>
                  <div className="font-mono text-xs text-muted-foreground">{k.secret_hint} · {k.model}</div></div>
                <Status s={k.status} />
              </div>
              <div className="text-xs text-muted-foreground">{k.is_primary ? "Principal" : "Reserva"} · projeto {k.google_project || "não informado"} · testada {fmt(k.last_tested_at)}</div>
              {k.last_error && <div className="break-anywhere rounded bg-destructive/10 p-2 text-xs text-destructive">{k.last_error}</div>}
              {k.quota_exceeded_at && <div className="text-xs text-warning">Cota esgotada em {fmt(k.quota_exceeded_at)}</div>}
              <label className="flex items-center justify-between text-sm">Ativa <Switch checked={k.is_active} onCheckedChange={(v) => run(k.id + "a", () => upd({ data: { id: k.id, isActive: v } }))} /></label>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy === k.id + "t"} onClick={() => run(k.id + "t", () => test({ data: { id: k.id } }), (r) => r.ok ? `OK · respondeu com ${r.workingModel} · ${r.models} modelos na chave` : `Falhou: ${r.error}`)}>{busy === k.id + "t" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Testar</Button>
                <Button size="sm" variant="outline" onClick={() => setEdit({ id: k.id, name: k.name, model: k.model ?? DEFAULT_GEMINI_MODEL, googleProject: k.google_project ?? "", models: (() => { const m = (k.metadata as any)?.models; return Array.isArray(m) ? m.filter((x: unknown) => typeof x === "string") : []; })() })}><Pencil className="h-4 w-4" /> Editar</Button>
                {!k.is_primary && <Button size="sm" variant="outline" onClick={() => run(k.id + "p", () => prim({ data: { id: k.id } }), () => "Agora é a principal")}><Star className="h-4 w-4" /> Tornar principal</Button>}
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="ghost" aria-label="Remover"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Remover "{k.name}"?</AlertDialogTitle><AlertDialogDescription>A chave será apagada definitivamente.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => run(k.id + "d", () => del({ data: { id: k.id } }), () => "Chave removida")}>Remover</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova chave do Google AI Studio</DialogTitle><DialogDescription>A chave é criptografada no servidor e nunca volta para o navegador.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Conta pessoal" /></div>
            <div className="space-y-1"><Label>API Key</Label><Input type="password" autoComplete="off" value={f.apiKey} onChange={(e) => setF({ ...f, apiKey: e.target.value })} placeholder="AIza…" /></div>
            <div className="space-y-1"><Label>Modelo</Label><Input value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /></div>
            <div className="space-y-1"><Label>Projeto Google (opcional)</Label><Input value={f.googleProject} onChange={(e) => setF({ ...f, googleProject: e.target.value })} placeholder="meu-projeto-123" /></div>
            <label className="flex items-center justify-between text-sm">Definir como principal <Switch checked={f.setPrimary} onCheckedChange={(v) => setF({ ...f, setPrimary: v })} /></label>
          </div>
          <DialogFooter><Button disabled={!f.name || f.apiKey.length < 20 || busy === "add"} onClick={async () => { const r = await run("add", () => add({ data: f }), () => "Chave salva"); if (r) { setOpen(false); setF({ ...f, name: "", apiKey: "" }); } }}>{busy === "add" && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar chave</DialogTitle><DialogDescription>A chave em si não muda. Depois de salvar, clique em Testar.</DialogDescription></DialogHeader>
          {edit && <div className="space-y-3">
            <div className="space-y-1"><Label>Nome</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Modelo</Label><Input list="edit-models" value={edit.model} onChange={(e) => setEdit({ ...edit, model: e.target.value })} />
              <datalist id="edit-models">{edit.models.map((m) => <option key={m} value={m} />)}</datalist>
              {edit.models.length > 0 && <div className="flex flex-wrap gap-1 pt-1">{edit.models.filter((m) => /^gemini-[\d.]+-(flash|pro)(-lite)?$/.test(m)).slice(-6).map((m) => <button key={m} type="button" onClick={() => setEdit({ ...edit, model: m })} className={`rounded border px-2 py-1 font-mono text-xs ${edit.model === m ? "border-primary text-primary" : "text-muted-foreground"}`}>{m}</button>)}</div>}</div>
            <div className="space-y-1"><Label>Projeto Google (opcional)</Label><Input value={edit.googleProject} onChange={(e) => setEdit({ ...edit, googleProject: e.target.value })} /></div>
          </div>}
          <DialogFooter><Button disabled={!edit?.name.trim() || !edit?.model.trim() || busy === "edit"} onClick={async () => { if (!edit) return; const r = await run("edit", () => upd({ data: { id: edit.id, name: edit.name, model: edit.model, googleProject: edit.googleProject } }), () => "Chave atualizada"); if (r) setEdit(null); }}>{busy === "edit" && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

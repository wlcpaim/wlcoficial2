import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { repoFile, repoTree, repoWriteFile } from "@/lib/github.functions";
import { useRepos } from "@/lib/data";
import { Page, Empty, Loading, ErrorBox } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, RefreshCw, Search, FileCode2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/debugger")({
  validateSearch: z.object({ repo: z.string().optional() }),
  head: () => ({ meta: [{ title: "Depurador — WLC.IA" }] }),
  component: DebuggerPage,
});

function DebuggerPage() {
  const search = Route.useSearch();
  const repos = useRepos();
  const [repoId, setRepoId] = useState(search.repo ?? "");
  const [branch, setBranch] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("Atualiza arquivo pelo Depurador WLC.IA");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const treeFn = useServerFn(repoTree);
  const fileFn = useServerFn(repoFile);
  const writeFn = useServerFn(repoWriteFile);
  const repo = repos.data?.find((r) => r.id === repoId);
  useEffect(() => { if (repo?.default_branch && !branch) setBranch(repo.default_branch); }, [repo, branch]);
  const tree = useQuery({ queryKey: ["debugger-tree", repoId, branch], enabled: !!repoId && !!branch, queryFn: () => treeFn({ data: { id: repoId, branch } }) });
  const files = useMemo(() => (tree.data?.items ?? []).filter((x: any) => x.type === "blob" && x.path.toLowerCase().includes(filter.toLowerCase())).sort((a: any, b: any) => a.path.localeCompare(b.path)), [tree.data, filter]);
  const file = useQuery({ queryKey: ["debugger-file", repoId, branch, selectedPath], enabled: !!repoId && !!branch && !!selectedPath, queryFn: () => fileFn({ data: { id: repoId, path: selectedPath, ref: branch } }) });
  useEffect(() => { if (file.data) setContent(file.data.content); }, [file.data]);
  async function save() {
    if (!repo || !selectedPath || !file.data) return;
    setSaving(true);
    try {
      const result = await writeFn({ data: { id: repo.id, path: selectedPath, content, message: message.trim() || `Atualiza ${selectedPath}`, branch, sha: file.data.sha } });
      if (!result.verified) throw new Error("O GitHub recebeu o commit, mas a verificação do conteúdo não confirmou igualdade.");
      toast.success(`Arquivo salvo e verificado · ${result.commitSha.slice(0, 7)}`);
      await qc.invalidateQueries({ queryKey: ["debugger-file", repoId, branch, selectedPath] });
      await qc.invalidateQueries({ queryKey: ["debugger-tree", repoId, branch] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }
  if (repos.isLoading) return <Loading />;
  if (!repos.data?.length) return <Page title="Depurador"><Empty>Importe ou crie um repositório GitHub antes de abrir o código.</Empty></Page>;
  return <Page title="Depurador de código" desc="Leia o conteúdo completo dos arquivos e grave alterações diretamente no branch selecionado. Cada gravação cria um commit e é verificada no GitHub." actions={repo?.html_url ? <a href={repo.html_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary"><ExternalLink className="h-4 w-4"/>Abrir GitHub</a> : null}>
    <div className="mb-4 grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-1"><Label>Repositório</Label><Select value={repoId} onValueChange={(v) => { setRepoId(v); setSelectedPath(""); setBranch(""); }}><SelectTrigger><SelectValue placeholder="Selecione um repositório"/></SelectTrigger><SelectContent>{repos.data.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label>Branch</Label><Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main"/></div>
    </div>
    {!repoId ? <Empty>Selecione o repositório para carregar a árvore de arquivos.</Empty> : tree.isLoading ? <Loading/> : tree.error ? <ErrorBox error={tree.error}/> : <div className="grid min-h-[65dvh] gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section className="min-w-0 rounded-lg border bg-card p-3"><div className="mb-2 flex items-center justify-between"><div className="font-medium">Arquivos <Badge variant="secondary">{files.length}</Badge></div><Button size="icon" variant="ghost" onClick={() => tree.refetch()} aria-label="Atualizar arquivos"><RefreshCw className="h-4 w-4"/></Button></div>
        <div className="relative mb-2"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/><Input className="pl-8" placeholder="Filtrar arquivos" value={filter} onChange={(e) => setFilter(e.target.value)}/></div>
        <div className="max-h-[55dvh] space-y-1 overflow-y-auto">{files.map((f: any) => <button key={f.path} onClick={() => setSelectedPath(f.path)} className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-muted ${selectedPath === f.path ? "bg-accent text-accent-foreground" : ""}`}><FileCode2 className="h-3.5 w-3.5 shrink-0"/><span className="break-all">{f.path}</span></button>)}</div>
      </section>
      <section className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3">
        {!selectedPath ? <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Escolha um arquivo para visualizar e editar o código completo.</div> : <>
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><div className="break-all font-mono text-sm">{selectedPath}</div><div className="text-xs text-muted-foreground">{file.data?.size ?? content.length} bytes · branch {branch}</div></div><Button variant="outline" size="sm" onClick={() => file.refetch()}><RefreshCw className="h-4 w-4"/>Recarregar</Button></div>
          {file.isLoading ? <Loading/> : file.error ? <ErrorBox error={file.error}/> : <><Textarea value={content} onChange={(e) => setContent(e.target.value)} spellCheck={false} className="min-h-[48dvh] flex-1 resize-y font-mono text-xs leading-5"/><div className="space-y-2"><Label>Mensagem do commit</Label><Input value={message} onChange={(e) => setMessage(e.target.value)}/><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Salvar altera o repositório GitHub imediatamente.</span><Button onClick={save} disabled={saving || file.data?.truncated}><Save className="h-4 w-4"/>{saving ? "Salvando…" : "Salvar no GitHub"}</Button></div>{file.data?.truncated && <p className="text-xs text-destructive">Arquivo excede o limite de leitura integral; não é permitido salvar uma versão truncada.</p>}</div></>}
        </>}
      </section>
    </div>}
  </Page>;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Monitor, Smartphone, Play, Rocket, RotateCcw, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRepos } from "@/lib/data";
import { repoBranches, repoCommits } from "@/lib/github.functions";
import { buildPreview, savePreviewLogs, startDeploy, rollbackDeploy } from "@/lib/live.functions";
import { ensurePublication, publishRelease, activateRelease, disablePublication } from "@/lib/publish.functions";
import { Copy, Globe, Power } from "lucide-react";
import { Page, Empty, Loading, ErrorBox, Status, fmt } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const META = "Preview isolado e deploy com rollback dos seus repositórios.";
export const Route = createFileRoute("/_authenticated/live")({
  head: () => ({ meta: [{ title: "WLC.IA Preview — WLC.IA" }, { name: "description", content: META }, { property: "og:title", content: "WLC.IA Preview — WLC.IA" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: "preview" | "deploy" } => (s.tab === "deploy" || s.tab === "preview" ? { tab: s.tab } : {}),
  component: Live,
});

const VIEWPORTS = { desktop: { w: "100%", icon: Monitor }, mobile: { w: "390px", icon: Smartphone } } as const;
type Log = { level: string; message: string; at: string };

function Live() {
  const { tab } = Route.useSearch();
  const repos = useRepos();
  const [repoId, setRepoId] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const repo = repos.data?.find((r) => r.id === repoId);
  useEffect(() => { if (!repoId && repos.data?.[0]) setRepoId(repos.data[0].id); }, [repos.data, repoId]);
  useEffect(() => { if (repo) setBranch(repo.default_branch); }, [repo?.id]);
  const branchesFn = useServerFn(repoBranches);
  const branches = useQuery({ queryKey: ["branches", repoId], enabled: !!repoId, queryFn: () => branchesFn({ data: { id: repoId } }) });

  if (repos.isLoading) return <Loading />;
  if (repos.error) return <ErrorBox error={repos.error} />;
  return (
    <Page title="WLC.IA Preview" desc={META}>
      {!repos.data?.length ? <Empty>Importe um repositório em Repositórios para começar.</Empty> : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Select value={repoId} onValueChange={setRepoId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Repositório" /></SelectTrigger>
              <SelectContent>{repos.data.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Branch" /></SelectTrigger>
              <SelectContent>{(branches.data ?? (branch ? [{ name: branch }] : [])).map((b) => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {repoId && branch && (
            <Tabs key={tab ?? "preview"} defaultValue={tab ?? "preview"}>
              <TabsList><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="deploy">Deploy</TabsTrigger></TabsList>
              <TabsContent value="preview"><PreviewTab repoId={repoId} branch={branch} /></TabsContent>
              <TabsContent value="deploy"><DeployTab repoId={repoId} branch={branch} /></TabsContent>
            </Tabs>
          )}
        </>
      )}
    </Page>
  );
}

function PreviewTab({ repoId, branch }: { repoId: string; branch: string }) {
  const build = useServerFn(buildPreview);
  const save = useServerFn(savePreviewLogs);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Awaited<ReturnType<typeof buildPreview>> | null>(null);
  const [vp, setVp] = useState<keyof typeof VIEWPORTS>("desktop");
  const [logs, setLogs] = useState<Log[]>([]);
  const frame = useRef<HTMLIFrameElement>(null);
  const pending = useRef<Log[]>([]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data as { __wlc?: number; __nexus?: number; level?: string; message?: string };
      if (!d?.__wlc && !d?.__nexus) return;
      const l = { level: String(d.level ?? "log"), message: String(d.message ?? "").slice(0, 2000), at: new Date().toLocaleTimeString("pt-BR") };
      setLogs((x) => [...x.slice(-299), l]);
      pending.current.push(l);
    };
    window.addEventListener("message", onMsg);
    const t = setInterval(() => {
      if (!res || !pending.current.length) return;
      const batch = pending.current.splice(0, 100);
      save({ data: { sessionId: res.sessionId, logs: batch.map(({ level, message }) => ({ level: level.slice(0, 10), message })) } }).catch(() => {});
    }, 3000);
    return () => { window.removeEventListener("message", onMsg); clearInterval(t); };
  }, [res, save]);

  async function run() {
    setBusy(true); setLogs([]);
    try { setRes(await build({ data: { repositoryId: repoId, branch } })); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function openPreviewTab() {
    if (!res?.html) return;
    // Open a sandboxed iframe wrapper, not the repository HTML directly, to keep the preview isolated.
    const encoded = btoa(unescape(encodeURIComponent(res.html)));
    const wrapper = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview isolado</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#111}iframe{display:block;width:100%;height:100%;border:0;background:white}</style></head><body><iframe id="preview" title="Preview isolado" sandbox="allow-scripts allow-forms allow-modals"></iframe><script>const encoded=${JSON.stringify(encoded)};document.getElementById('preview').srcdoc=decodeURIComponent(escape(atob(encoded)));<\/script></body></html>`;
    const url = URL.createObjectURL(new Blob([wrapper], { type: "text/html" }));
    const opened = window.open(url, "_blank");
    if (!opened) toast.error("O navegador bloqueou a nova guia. Permita pop-ups para abrir o Preview.");
    else opened.opener = null;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {res ? "Recarregar" : "Gerar preview"}</Button>
        <Button variant="outline" onClick={openPreviewTab} disabled={!res?.html}><ExternalLink className="h-4 w-4" /> Abrir em nova guia</Button>
        <div className="ml-auto flex gap-1">
          {(Object.keys(VIEWPORTS) as (keyof typeof VIEWPORTS)[]).map((k) => { const I = VIEWPORTS[k].icon; return <Button key={k} size="sm" variant={vp === k ? "default" : "outline"} onClick={() => setVp(k)} aria-label={k === "desktop" ? "Desktop" : "Mobile"}><I className="h-4 w-4" /> {k === "desktop" ? "Desktop" : "Mobile"}</Button>; })}
        </div>
      </div>
      {res && <p className="text-xs text-muted-foreground">Framework: <b>{res.framework}</b> · entrada: {res.entry ?? "—"} · commit {res.head.slice(0, 7)}</p>}
      {res?.note && <p role="status" className={`rounded-md border p-2 text-xs ${res.html ? "border-border bg-muted" : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{res.html ? "Preview estático" : "Runtime não disponível"} · {res.note}</p>}
      <div className="flex justify-center rounded-lg border border-border bg-muted p-2">
        {res?.html ? (
          <iframe ref={frame} title="Preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={res.html} style={{ width: VIEWPORTS[vp].w }} className={vp === "mobile" ? "mx-auto block h-[780px] max-w-full rounded-[2rem] border-8 border-foreground/80 bg-background" : "block h-[680px] w-full rounded bg-background"} />
        ) : <div className="flex h-[300px] items-center text-sm text-muted-foreground">{busy ? "Gerando…" : "Gere um preview para visualizar."}</div>}
      </div>
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs font-medium">Console ({logs.length})<Button size="icon" variant="ghost" onClick={() => setLogs([])} aria-label="Limpar"><Trash2 className="h-3.5 w-3.5" /></Button></div>
        <div className="max-h-48 overflow-auto p-2 font-mono text-xs">
          {logs.length ? logs.map((l, i) => <div key={i} className={l.level === "error" ? "text-destructive" : l.level === "warn" ? "text-primary" : ""}>[{l.at}] {l.level}: {l.message}</div>) : <span className="text-muted-foreground">Sem saída.</span>}
        </div>
      </div>
    </div>
  );
}

function DeployTab({ repoId, branch }: { repoId: string; branch: string }) {
  const qc = useQueryClient();
  const deploy = useServerFn(startDeploy);
  const rollback = useServerFn(rollbackDeploy);
  const commitsFn = useServerFn(repoCommits);
  const commits = useQuery({ queryKey: ["commits", repoId, branch], queryFn: () => commitsFn({ data: { id: repoId, branch } }) });
  const domain = useQuery({ queryKey: ["domain", repoId], queryFn: async () => (await supabase.from("deployment_domains").select("url").eq("repository_id", repoId).maybeSingle()).data });
  const list = useQuery({ queryKey: ["deployments", repoId], queryFn: async () => {
    const { data, error } = await supabase.from("deployments").select("*").eq("repository_id", repoId).order("created_at", { ascending: false }).limit(30);
    if (error) throw error; return data;
  } });
  const [url, setUrl] = useState("");
  const [sha, setSha] = useState("head");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (domain.data?.url) setUrl(domain.data.url); }, [domain.data?.url]);

  async function go() {
    setBusy(true);
    try {
      const r = await deploy({ data: { repositoryId: repoId, branch, targetUrl: url, ...(sha !== "head" ? { commitSha: sha } : {}) } });
      r.status === "live" ? toast.success("Deploy ativo") : toast.error(`Deploy falhou: ${"error" in r ? r.error : ""}`);
      setOpen(r.id);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); qc.invalidateQueries({ queryKey: ["deployments", repoId] }); qc.invalidateQueries({ queryKey: ["deploy-logs"] }); }
  }
  async function back(id: string) {
    try { await rollback({ data: { deploymentId: id } }); toast.success("Rollback concluído"); }
    catch (e) { toast.error((e as Error).message); }
    qc.invalidateQueries({ queryKey: ["deployments", repoId] });
  }

  return (
    <div className="space-y-4">
      <PublishPanel repoId={repoId} branch={branch} sha={sha} />
      <p className="pt-2 text-xs font-medium uppercase text-muted-foreground">Hospedagem externa (opcional)</p>
      <div className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_16rem_auto]">
        <Input placeholder="https://seu-site.com (URL de produção para health check)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Select value={sha} onValueChange={setSha}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="head">Último commit de {branch}</SelectItem>
            {commits.data?.map((c) => <SelectItem key={c.sha} value={c.sha}>{c.sha.slice(0, 7)} · {c.message.split("\n")[0]!.slice(0, 40)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={go} disabled={busy || !/^https:\/\//.test(url)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Deploy</Button>
        <p className="text-xs text-muted-foreground md:col-span-3">O pipeline verifica o commit e o CI no GitHub e confirma que a URL responde. A hospedagem em si continua no seu provedor.</p>
      </div>
      {list.isLoading ? <Loading /> : list.error ? <ErrorBox error={list.error} /> : !list.data?.length ? <Empty>Nenhum deploy ainda.</Empty> : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {list.data.map((d) => (
            <div key={d.id} className="p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Status s={d.status} />
                <button className="font-mono hover:underline" onClick={() => setOpen(open === d.id ? null : d.id)}>{d.commit_sha.slice(0, 7)}</button>
                <span className="truncate text-muted-foreground">{d.branch} · {d.commit_message?.split("\n")[0] ?? ""}</span>
                <span className="ml-auto text-xs text-muted-foreground">{fmt(d.created_at)}</span>
                {d.target_url && d.status === "live" && <a href={d.target_url} target="_blank" rel="noreferrer" className="text-primary"><ExternalLink className="h-4 w-4" /></a>}
                {(d.status === "superseded" || d.status === "rolled_back") && d.health_status && d.health_status < 400 && <Button size="sm" variant="outline" onClick={() => back(d.id)}><RotateCcw className="h-3.5 w-3.5" /> Rollback</Button>}
              </div>
              {open === d.id && <DeployLogs id={d.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeployLogs({ id }: { id: string }) {
  const q = useQuery({ queryKey: ["deploy-logs", id], queryFn: async () => (await supabase.from("deployment_logs").select("*").eq("deployment_id", id).order("created_at")).data ?? [] });
  return (
    <div className="mt-2 max-h-56 overflow-auto rounded bg-muted p-2 font-mono text-xs">
      {q.data?.map((l) => <div key={l.id} className={l.level === "error" ? "text-destructive" : ""}>[{l.step}] {l.message}</div>) ?? "…"}
    </div>
  );
}

function PublishPanel({ repoId, branch, sha }: { repoId: string; branch: string; sha: string }) {
  const qc = useQueryClient();
  const ensure = useServerFn(ensurePublication);
  const publish = useServerFn(publishRelease);
  const activate = useServerFn(activateRelease);
  const disable = useServerFn(disablePublication);
  const pub = useQuery({ queryKey: ["publication", repoId], queryFn: async () => (await supabase.from("publications").select("*").eq("repository_id", repoId).maybeSingle()).data });
  const rels = useQuery({ queryKey: ["releases", pub.data?.id], enabled: !!pub.data?.id, refetchInterval: (q) => (q.state.data?.some((r) => !["live", "failed", "superseded", "rolled_back"].includes(r.status)) ? 2000 : false), queryFn: async () => (await supabase.from("publication_releases").select("id, release_number, commit_sha, branch, commit_message, framework, status, error, artifact_bytes, file_count, created_at, activated_at, completed_at").eq("publication_id", pub.data!.id).order("release_number", { ascending: false }).limit(30)).data ?? [] });
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (pub.data?.slug) setSlug(pub.data.slug); }, [pub.data?.slug]);
  const url = typeof window !== "undefined" && pub.data ? `${window.location.origin}/r/${pub.data.slug}` : "";
  const refresh = () => { qc.invalidateQueries({ queryKey: ["publication", repoId] }); qc.invalidateQueries({ queryKey: ["releases"] }); };

  async function go() {
    setBusy(true);
    try {
      const p = await ensure({ data: { repositoryId: repoId, ...(slug ? { slug } : {}) } });
      refresh();
      const r = await publish({ data: { publicationId: p.id, branch, ...(sha !== "head" ? { commitSha: sha } : {}) } });
      r.status === "live" ? toast.success(`Versão ${r.releaseNumber} no ar`) : toast.error(r.error);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); refresh(); }
  }
  async function act(fn: () => Promise<unknown>, ok: string) { try { await fn(); toast.success(ok); } catch (e) { toast.error((e as Error).message); } refresh(); }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 text-sm font-medium"><Globe className="h-4 w-4 text-primary" /> Publicar no WLC.IA</div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">/r/</span>
        <Input className="w-48" placeholder="nome-do-site" value={slug} disabled={!!pub.data?.active_release_id} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
        <Button onClick={go} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} {pub.data?.active_release_id ? "Publicar nova versão" : "Publicar"}</Button>
      </div>
      {pub.data?.active_release_id && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted p-2 text-sm">
          <Status s="live" />
          <a href={url} target="_blank" rel="noreferrer" className="min-w-0 break-all font-mono text-primary hover:underline">{url}</a>
          <div className="ml-auto flex gap-1">
            <Button size="icon" variant="ghost" aria-label="Copiar" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}><Copy className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Abrir" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
            <Button size="icon" variant="ghost" aria-label="Tirar do ar" onClick={() => confirm("Tirar o site do ar? As versões ficam guardadas.") && act(() => disable({ data: { publicationId: pub.data!.id } }), "Site fora do ar")}><Power className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Publica de verdade sites HTML/CSS/JS do commit escolhido. Projetos que precisam de build (React, Next…) ainda não são suportados e falham com o motivo.</p>
      {!!rels.data?.length && (
        <div className="divide-y divide-border rounded-md border border-border">
          {rels.data.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 p-2 text-sm">
              <span className="font-mono text-xs">v{r.release_number}</span>
              <Status s={r.status} />
              <span className="font-mono text-xs">{r.commit_sha.slice(0, 7)}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.commit_message?.split("\n")[0] ?? r.branch}</span>
              <span className="text-xs text-muted-foreground">{fmt(r.created_at)}</span>
              {(r.status === "superseded" || r.status === "rolled_back") && <Button size="sm" variant="outline" onClick={() => confirm(`Voltar o site para a versão ${r.release_number}?`) && act(() => activate({ data: { releaseId: r.id } }), `Versão ${r.release_number} reativada`)}><RotateCcw className="h-3.5 w-3.5" /> Rollback</Button>}
              {r.error && <p className="w-full text-xs text-destructive">{r.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

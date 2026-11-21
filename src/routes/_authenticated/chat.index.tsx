import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, Play, Github, Check, CircleAlert, FolderPlus, Folder, Plus, Download, Ban } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { createGithubRepo, updateRepository, listGithubRepos, importRepository, checkRepoName } from "@/lib/github.functions";
import { useConnections, useProjects, useRepos } from "@/lib/data";
import { getPreset, presetSiteKind, type ProjectPresetId } from "@/lib/project-presets";
import { validateRepoName, suggestRepoName } from "@/lib/repo-name";
import { Page, Loading } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/")({
  validateSearch: z.object({ project: z.string().optional() }),
  head: () => ({ meta: [{ title: "Novo chat — WLC.IA" }, { name: "description", content: "Crie um chat com nome, projeto e repositório em três passos." }, { property: "og:title", content: "Novo chat — WLC.IA" }, { property: "og:description", content: "Crie um chat com nome, projeto e repositório em três passos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewChat,
});

type RepoMode = "none" | "new" | "import";
type Step = { label: string; state: "pending" | "running" | "done" | "error" };

function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

function NewChat() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const qc = useQueryClient();
  const projects = useProjects();
  const repos = useRepos();
  const conns = useConnections();
  const createRepo = useServerFn(createGithubRepo);
  const getRemoteRepos = useServerFn(listGithubRepos);
  const importRepo = useServerFn(importRepository);
  const linkRepo = useServerFn(updateRepository);
  const checkName = useServerFn(checkRepoName);
  const hasGithub = !!conns.data?.some((c) => c.provider === "github");

  // Field 1 — chat name
  const [title, setTitle] = useState("");
  // Field 2 — project
  const [projectMode, setProjectMode] = useState<"existing" | "new">("existing");
  const [projectId, setProjectId] = useState(search.project ?? "");
  const [newProjectName, setNewProjectName] = useState("");
  const preset: ProjectPresetId = "empty";
  // Field 3 — repository
  const [repoMode, setRepoMode] = useState<RepoMode>("none");
  const [repoName, setRepoName] = useState("");
  const [repoNameTouched, setRepoNameTouched] = useState(false);
  const [importFullName, setImportFullName] = useState("");
  const [repoFilter, setRepoFilter] = useState("");

  const [steps, setSteps] = useState<Step[] | null>(null);
  const busy = !!steps && steps.some((s) => s.state === "running");

  useEffect(() => { if (projects.data && !projects.data.length) setProjectMode("new"); }, [projects.data]);
  // Suggest a repository name from the chat/project name until the user types one.
  useEffect(() => { if (!repoNameTouched) setRepoName(suggestRepoName(title || selectedProject?.name || "")); }, [title, projectMode, repoNameTouched, projects.data, projectId]);

  useEffect(() => { setNewProjectName(title); }, [title]);
  const selectedProject = projects.data?.find((p) => p.id === projectId);
  const repoFormatError = repoMode === "new" ? validateRepoName(repoName) : null;
  const debouncedName = useDebounced(repoName.trim(), 450);
  const availability = useQuery({
    queryKey: ["repo-name-available", debouncedName],
    enabled: repoMode === "new" && hasGithub && !validateRepoName(debouncedName),
    staleTime: 30_000,
    retry: false,
    queryFn: () => checkName({ data: { name: debouncedName } }),
  });
  const nameChecking = repoMode === "new" && !repoFormatError && (debouncedName !== repoName.trim() || availability.isFetching);
  const nameAvailable = !repoFormatError && debouncedName === repoName.trim() && availability.data?.available === true;

  const remoteRepos = useQuery({ queryKey: ["new-chat-github-repos"], enabled: repoMode === "import" && hasGithub, queryFn: () => getRemoteRepos({ data: { page: 1 } }) });
  const filteredRemote = useMemo(() => (remoteRepos.data?.repos ?? []).filter((r: any) => r.full_name.toLowerCase().includes(repoFilter.trim().toLowerCase())), [remoteRepos.data, repoFilter]);

  const projectReady = projectMode === "existing" ? !!projectId : newProjectName.trim().length > 0;
  const repoReady = repoMode === "none" || (repoMode === "new" && nameAvailable) || (repoMode === "import" && !!importFullName);
  const canSubmit = projectReady && repoReady && !busy && (repoMode === "none" || hasGithub);

  async function submit() {
    if (!canSubmit) return;
    const plan: Step[] = [];
    if (projectMode === "new") plan.push({ label: `Criar projeto "${newProjectName.trim()}"`, state: "pending" });
    if (repoMode === "new") plan.push({ label: `Criar repositório ${repoName.trim()} no GitHub`, state: "pending" });
    if (repoMode === "import") plan.push({ label: `Importar ${importFullName}`, state: "pending" });
    plan.push({ label: "Criar chat", state: "pending" });
    setSteps(plan);
    let i = 0;
    const mark = (state: Step["state"]) => setSteps((s) => s && s.map((x, k) => (k === i ? { ...x, state } : x)));
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada. Entre novamente.");
      let pid = projectId;
      if (projectMode === "new") {
        mark("running");
        const { data, error } = await supabase.from("projects").insert({ user_id: u.user.id, name: newProjectName.trim(), preset, status: "active", default_model: "wlc-v1.0:auto", last_activity_at: new Date().toISOString() }).select("id").single();
        if (error || !data) throw new Error(error?.message ?? "Não foi possível criar o projeto.");
        pid = data.id;
        // Keep the created project selected so a later failure never duplicates it.
        setProjectId(pid); setProjectMode("existing");
        await qc.invalidateQueries({ queryKey: ["projects"] });
        mark("done"); i++;
      }
      let repo: { id: string; full_name: string; default_branch: string } | null = null;
      if (repoMode === "new") {
        mark("running");
        const r = await createRepo({ data: { name: repoName.trim(), private: false, projectId: pid, preset: presetSiteKind(preset) ?? "blank" } });
        repo = { id: r.id, full_name: r.full_name, default_branch: "main" };
        toast.success(`Repositório ${r.full_name} criado e vinculado ao projeto`);
        mark("done"); i++;
      } else if (repoMode === "import") {
        mark("running");
        const already = repos.data?.find((x) => x.full_name === importFullName);
        let rid: string;
        if (already) { await linkRepo({ data: { id: already.id, projectId: pid } }); rid = already.id; }
        else rid = (await importRepo({ data: { fullName: importFullName, projectId: pid } })).id;
        const { data: row } = await supabase.from("repositories").select("id, full_name, default_branch").eq("id", rid).single();
        repo = row ?? { id: rid, full_name: importFullName, default_branch: "main" };
        toast.success(`${importFullName} importado e vinculado ao projeto`);
        mark("done"); i++;
      }
      await qc.invalidateQueries({ queryKey: ["repos"] });
      mark("running");
      const { data: chat, error } = await supabase.from("chats").insert({
        user_id: u.user.id, project_id: pid, repository_id: repo?.id ?? null, branch: repo?.default_branch ?? null,
        model: "wlc-v1.0:auto", title: title.trim() || "Novo chat",
      }).select("id").single();
      if (error || !chat) throw new Error(error?.message ?? "Não foi possível criar o chat.");
      mark("done");
      qc.invalidateQueries({ queryKey: ["chats"] });
      nav({ to: "/chat/$id", params: { id: chat.id } });
    } catch (e) {
      mark("error");
      toast.error((e as Error).message);
      if (repoMode === "new") qc.invalidateQueries({ queryKey: ["repo-name-available"] });
    }
  }

  if (projects.isLoading) return <Loading />;
  return (
    <Page title="Novo chat" desc="Três passos: nome, projeto e repositório.">
      <form className="max-w-2xl space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {/* 1 — Name */}
        <Field n={1} title="Nome do chat">
          <Input className="h-11" placeholder="Ex.: Corrigir login do app" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus aria-label="Nome do chat" />
          <p className="text-xs text-muted-foreground">Esse nome também é usado no projeto e no repositório.</p>
        </Field>

        {/* 2 — Project */}
        <Field n={2} title="Projeto">
          <Segmented value={projectMode} onChange={(v) => setProjectMode(v as "existing" | "new")} options={[
            { value: "existing", label: "Existente", icon: Folder, disabled: !projects.data?.length },
            { value: "new", label: "Novo projeto", icon: FolderPlus },
          ]} />
          {projectMode === "existing" ? (
            <div className="space-y-1.5">
              <Select value={projectId || undefined} onValueChange={setProjectId}>
                <SelectTrigger className="h-11" aria-label="Selecionar projeto"><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                <SelectContent>{projects.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
              
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">O projeto e o repositório recebem automaticamente o nome do chat{title.trim() ? <>: <b className="text-foreground">{title.trim()}</b></> : "."}</p>
              
            </div>
          )}
        </Field>

        {/* 3 — Repository */}
        <Field n={3} title="Repositório" optional>
          <Segmented value={repoMode} onChange={(v) => setRepoMode(v as RepoMode)} options={[
            { value: "none", label: "Nenhum", icon: Ban },
            { value: "new", label: "Criar novo", icon: Plus, disabled: !hasGithub },
            { value: "import", label: "Importar", icon: Download, disabled: !hasGithub },
          ]} />
          {!hasGithub && <p className="text-xs text-muted-foreground">Conecte o GitHub em <Link to="/settings" className="text-primary hover:underline">Configurações</Link> para criar ou importar repositórios.</p>}
          {repoMode === "new" && hasGithub && (
            <div className="space-y-1.5">
              <div className="relative">
                <Input className="h-11 pr-9 font-mono text-sm" placeholder="nome-do-repositorio" value={repoName} onChange={(e) => { setRepoNameTouched(true); setRepoName(e.target.value); setTitle(e.target.value); }} maxLength={100} aria-label="Nome do repositório" aria-invalid={!!repoFormatError || availability.data?.available === false} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {nameChecking ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : nameAvailable ? <Check className="h-4 w-4 text-success" /> : (repoFormatError || availability.data?.available === false || availability.error) ? <CircleAlert className="h-4 w-4 text-destructive" /> : null}
                </span>
              </div>
              <p className={cn("text-xs", repoFormatError || availability.data?.available === false || availability.error ? "text-destructive" : nameAvailable ? "text-success" : "text-muted-foreground")}>
                {repoFormatError ?? (availability.error ? (availability.error as Error).message : nameChecking ? "Verificando disponibilidade…" : availability.data?.available === false ? availability.data.reason : nameAvailable ? `Disponível: ${availability.data?.owner}/${repoName.trim()} (público, com README inicial)` : " ")}
              </p>
              <p className="text-xs text-muted-foreground">O repositório começa vazio, só com o README.</p>
            </div>
          )}
          {repoMode === "import" && hasGithub && (
            <div className="space-y-2">
              <Input className="h-10" placeholder="Filtrar por nome ou proprietário" value={repoFilter} onChange={(e) => setRepoFilter(e.target.value)} aria-label="Filtrar repositórios" />
              <div className="max-h-60 overflow-y-auto rounded-md border" role="radiogroup" aria-label="Repositórios do GitHub">
                {remoteRepos.isLoading ? <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando repositórios do GitHub…</div>
                  : remoteRepos.error ? <p className="p-3 text-xs text-destructive">{(remoteRepos.error as Error).message}</p>
                  : !filteredRemote.length ? <p className="p-3 text-xs text-muted-foreground">Nenhum repositório encontrado.</p>
                  : filteredRemote.map((r: any) => {
                    const imported = repos.data?.some((x) => x.full_name === r.full_name);
                    const on = importFullName === r.full_name;
                    return (
                      <button type="button" role="radio" aria-checked={on} key={r.full_name} onClick={() => { setImportFullName(r.full_name); setTitle(r.full_name.split("/").pop() ?? r.full_name); }}
                        className={cn("flex min-h-11 w-full items-center gap-2 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted", on && "bg-primary/10")}>
                        <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", on && "border-primary bg-primary text-primary-foreground")}>{on && <Check className="h-3 w-3" />}</span>
                        <Github className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-mono text-xs">{r.full_name}</span>
                        {imported && <span className="shrink-0 text-[10px] text-muted-foreground">já importado</span>}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </Field>

        {steps && (
          <ol className="space-y-1.5 rounded-lg border bg-card p-3 text-sm" aria-live="polite">
            {steps.map((s, k) => (
              <li key={k} className="flex items-center gap-2">
                {s.state === "running" ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : s.state === "done" ? <Check className="h-4 w-4 text-success" /> : s.state === "error" ? <CircleAlert className="h-4 w-4 text-destructive" /> : <span className="h-4 w-4 rounded-full border" />}
                <span className={cn(s.state === "pending" && "text-muted-foreground", s.state === "error" && "text-destructive")}>{s.label}</span>
              </li>
            ))}
          </ol>
        )}

        <Button type="submit" className="h-11 w-full sm:w-auto sm:px-6" disabled={!canSubmit}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {busy ? "Criando…" : "Criar chat"}
        </Button>
        {!projectReady && <p className="text-xs text-muted-foreground">{projectMode === "existing" ? "Selecione um projeto para continuar." : "Dê um nome ao novo projeto para continuar."}</p>}
      </form>
    </Page>
  );
}

function Field({ n, title, optional, children }: { n: number; title: string; optional?: boolean; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{n}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {optional && <span className="text-xs text-muted-foreground">opcional</span>}
      </div>
      {children}
    </section>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string; icon: typeof Folder; disabled?: boolean }[] }) {
  return (
    <div className="grid gap-1 rounded-lg bg-muted p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} disabled={o.disabled} onClick={() => onChange(o.value)}
          className={cn("flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm",
            value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <o.icon className="h-4 w-4 shrink-0" /><span className="truncate">{o.label}</span>
        </button>
      ))}
    </div>
  );
}


import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Github, ListChecks, Save, MessageSquarePlus, KeyRound, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConnections, useProjects, useRepos } from "@/lib/data";
import { Page, Status, fmt, Loading } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Início — WLC.IA" }, { name: "description", content: "Visão geral dos seus projetos, conexões e checkpoints." }, { property: "og:title", content: "Início — WLC.IA" }, { property: "og:description", content: "Visão geral dos seus projetos, conexões e checkpoints." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

function Dashboard() {
  const projects = useProjects();
  const repos = useRepos();
  const conns = useConnections();
  const stats = useQuery({ queryKey: ["dash"], queryFn: async () => {
    const [tasks, cps, audit, chat] = await Promise.all([
      supabase.from("development_tasks").select("id", { count: "exact", head: true }).in("status", ["pending", "running", "awaiting_approval"]),
      supabase.from("checkpoints").select("id, reason, created_at, chat_id", { count: "exact" }).eq("status", "open").order("created_at", { ascending: false }).limit(3),
      supabase.from("audit_logs").select("operation, status, created_at, file_path").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("chats").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    return { tasks: tasks.count ?? 0, cps: cps.data ?? [], cpCount: cps.count ?? 0, audit: audit.data, chat: chat.data };
  } });
  const gh = conns.data?.find((c) => c.provider === "github");
  const keys = conns.data?.filter((c) => c.provider === "gemini") ?? [];
  const primary = keys.find((k) => k.is_primary);
  const s = stats.data;
  const cards = [
    { icon: FolderKanban, label: "Projetos ativos", value: projects.data?.length ?? "…", to: "/projects" as const },
    { icon: Github, label: "Repositórios", value: repos.data?.length ?? "…", to: "/repos" as const },
    { icon: ListChecks, label: "Tarefas pendentes", value: s?.tasks ?? "…", to: "/tasks" as const },
    { icon: Save, label: "Checkpoints abertos", value: s?.cpCount ?? "…", to: "/checkpoints" as const },
  ];
  return (
    <Page title="Início" desc="Estado real do seu ambiente." actions={<Button asChild><Link to="/chat"><MessageSquarePlus className="h-4 w-4" /> Novo chat</Link></Button>}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/50">
            <c.icon className="h-4 w-4 text-muted-foreground" />
            <div className="mt-3 text-2xl font-semibold tabular-nums">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </Link>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium"><KeyRound className="h-4 w-4" /> Conexões</h2>
          {conns.isLoading ? <Loading /> : (
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between gap-2"><span>GitHub {gh && <span className="text-muted-foreground">· {(gh.metadata as any)?.login}</span>}</span>{gh ? <Status s={gh.status} /> : <Link className="text-primary" to="/settings">Conectar</Link>}</li>
              <li className="flex items-center justify-between gap-2"><span>Inteligência</span><span className="text-xs text-muted-foreground">WLC.IA · local</span></li>
              
            </ul>
          )}
        </section>
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4" /> Últimas atividades</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Último desenvolvimento</span>{s?.chat ? <Link className="min-w-0 truncate text-primary" to="/chat/$id" params={{ id: s.chat.id }}>{s.chat.title}</Link> : "—"}</div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Última auditoria</span>{s?.audit ? <span className="flex items-center gap-2"><span className="hidden sm:inline">{fmt(s.audit.created_at)}</span><Status s={s.audit.status} /></span> : "—"}</div>
            {s?.cps.map((c) => (
              <div key={c.id} className="flex justify-between gap-2"><span className="min-w-0 truncate text-muted-foreground">Checkpoint: {c.reason}</span><Link to="/checkpoints" className="text-primary">Retomar</Link></div>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}

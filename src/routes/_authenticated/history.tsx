import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useChats } from "@/lib/data";
import { Page, Empty, Loading, ErrorBox, Status, fmt } from "@/components/studio/ui";
import { ChatExportButton } from "@/components/studio/ChatExportDialog";
import { ProjectFilter } from "@/components/studio/ProjectFilter";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Histórico — WLC.IA" }, { name: "description", content: "Histórico permanente de conversas por projeto." }, { property: "og:title", content: "Histórico — WLC.IA" }, { property: "og:description", content: "Histórico permanente de conversas por projeto." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: History,
});

function History() {
  const [p, setP] = useState("all");
  const { data, isLoading, error } = useChats(p === "all" ? undefined : p);
  return (
    <Page title="Histórico" desc="Todas as conversas, preservadas por projeto." actions={<ProjectFilter value={p} onChange={setP} />}>
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : !data?.length ? <Empty>Nenhuma conversa ainda.</Empty> : (
        <ol className="relative space-y-2 border-l pl-4">
          {data.map((c: any) => (
            <li key={c.id} className="relative">
              <span className="absolute -left-[21px] top-4 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
              <Link to="/chat/$id" params={{ id: c.id }} className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/50">
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{c.title}</div><div className="truncate text-xs text-muted-foreground">{c.projects?.name} · {fmt(c.updated_at)}</div></div>
                <Status s={c.status} />
                <ChatExportButton chatId={c.id} compact />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Page>
  );
}

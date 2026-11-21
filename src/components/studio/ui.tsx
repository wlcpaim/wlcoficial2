import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Page({ title, desc, actions, children }: { title: string; desc?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0"><h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>{desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}</div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Loading() {
  return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
}

export function ErrorBox({ error }: { error: unknown }) {
  return <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{(error as Error)?.message ?? String(error)}</div>;
}

const tone: Record<string, string> = {
  ok: "bg-success/15 text-success", completed: "bg-success/15 text-success", passed: "bg-success/15 text-success", resumed: "bg-success/15 text-success", active: "bg-success/15 text-success",
  running: "bg-primary/15 text-primary", testing: "bg-primary/15 text-primary animate-pulse", pending: "bg-muted text-muted-foreground", open: "bg-warning/15 text-warning", awaiting_approval: "bg-warning/15 text-warning", needs_fix: "bg-warning/15 text-warning", quota_exceeded: "bg-warning/15 text-warning", partial: "bg-warning/15 text-warning", skipped: "bg-muted text-muted-foreground",
  failed: "bg-destructive/15 text-destructive", rejected: "bg-destructive/15 text-destructive", invalid: "bg-destructive/15 text-destructive", error: "bg-destructive/15 text-destructive",
};
const label: Record<string, string> = { ok: "OK", completed: "concluído", passed: "passou", running: "executando", pending: "pendente", open: "aberto", resumed: "retomado", failed: "falhou", rejected: "rejeitado", needs_fix: "precisa correção", awaiting_approval: "aguardando aprovação", quota_exceeded: "cota esgotada", partial: "permissões incompletas", invalid: "inválida", error: "erro", skipped: "ignorado", untested: "não testada", active: "ativo", archived: "arquivado", idle: "parado", testing: "testando…" };

export function Status({ s }: { s: string | null | undefined }) {
  const v = s ?? "pending";
  return <Badge variant="secondary" className={cn("whitespace-nowrap font-normal", tone[v])}>{label[v] ?? v}</Badge>;
}

export const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

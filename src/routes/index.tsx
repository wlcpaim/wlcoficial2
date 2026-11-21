import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, GitBranch, ShieldCheck, History, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WLC.IA — IA" },
      { name: "description", content: "WLC.IA — IA" },
      { property: "og:title", content: "WLC.IA — IA" },
      { property: "og:description", content: "WLC.IA" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Bot, t: "Agente de desenvolvimento", d: "Lê, planeja e altera código no seu repositório." },
  { icon: GitBranch, t: "GitHub real", d: "Arquivos, commits, branches e diffs verificados." },
  { icon: ShieldCheck, t: "Auditoria independente", d: "Nada é aprovado só pela resposta da IA." },
  { icon: History, t: "Continuidade", d: "Checkpoints automáticos e retomada validada." },
];

function Landing() {
  return (
    <main className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center gap-5 px-4 py-4 sm:gap-7 sm:px-8 sm:py-8">
        <div className="flex shrink-0 items-center gap-2 font-mono text-sm tracking-wide text-muted-foreground">
          <Terminal className="h-4 w-4 text-primary" /> WLC.IA
        </div>
        <section className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">Inteligência para construir.</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">Planeje, desenvolva e evolua seus projetos com assistência inteligente.</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button asChild size="lg" className="min-w-0 flex-1 sm:flex-none"><Link to="/auth">Entrar</Link></Button>
            <Button asChild size="lg" variant="outline" className="min-w-0 flex-1 sm:flex-none"><Link to="/dashboard">Abrir o painel</Link></Button>
          </div>
        </section>
        <section aria-label="Recursos da plataforma" className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 sm:gap-3">
          {features.map((f) => (
            <article key={f.t} className="flex min-h-0 flex-col justify-center rounded-xl border bg-card p-3 sm:p-5">
              <f.icon className="mb-2 h-5 w-5 shrink-0 text-primary sm:mb-3" />
              <div className="text-sm font-semibold sm:text-base">{f.t}</div>
              <div className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">{f.d}</div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/studio/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Atom, BookOpen, BrainCircuit, Search, ShieldCheck, FlaskConical } from "lucide-react";
import { WLC_CORE_KNOWLEDGE } from "@/lib/wlc-knowledge-base";
import { physicsCategories, physicsFormulas, physicsPrinciples } from "@/lib/nexus-physics-knowledge";

export const Route = createFileRoute("/_authenticated/nexus")({
  head: () => ({ meta: [{ title: "WLC.IA — Inteligência independente" }] }),
  component: IntelligencePage,
});

function IntelligencePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const formulas = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return physicsFormulas.filter((item) => (category === "Todas" || item.category === category) && (!q || `${item.name} ${item.equation} ${item.variables} ${item.conditions} ${item.application} ${item.category}`.toLocaleLowerCase("pt-BR").includes(q)));
  }, [query, category]);

  return <Page title="WLC.IA" desc="" actions={<Button asChild><Link to="/chat"><BrainCircuit className="h-4 w-4"/>Novo chat WLC.IA</Link></Button>}>
    <div className="mb-5 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2"></div>
      <h2 className="mt-3 text-lg font-semibold">WLC.IA — IA</h2>
      
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/50 p-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="h-4 w-4"/>Relações cadastradas</div><p className="mt-1 text-2xl font-semibold tabular-nums">{physicsFormulas.length}</p></div>
        <div className="rounded-lg bg-muted/50 p-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Atom className="h-4 w-4"/>Áreas de conhecimento</div><p className="mt-1 text-2xl font-semibold tabular-nums">{physicsCategories.length}</p></div>
        <div className="rounded-lg bg-muted/50 p-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4"/>Princípios de validação</div><p className="mt-1 text-2xl font-semibold tabular-nums">{physicsPrinciples.length}</p></div>
      </div>
    </div>

    <KnowledgeCategories />
    <section className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Atom className="h-5 w-5 text-primary"/><h2 className="font-semibold">Física matemática — biblioteca técnica</h2></div><Badge variant="secondary">{formulas.length} resultados</Badge></div>
      <div className="grid gap-2 sm:grid-cols-[1fr_260px]">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar fórmula, conceito, variável ou aplicação..." className="pl-9" /></div>
        <select aria-label="Filtrar por área" value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="Todas">Todas as áreas</option>{physicsCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {formulas.map((item) => <Card key={item.id} className="min-w-0"><CardHeader className="pb-2"><div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="outline">{item.category}</Badge><span className="text-xs text-muted-foreground">{item.id.toUpperCase()}</span></div><CardTitle className="text-base">{item.name}</CardTitle><CardDescription className="rounded-md bg-muted/60 px-3 py-3 font-mono text-sm leading-relaxed text-foreground break-words">{item.equation}</CardDescription></CardHeader><CardContent className="pt-0"><Accordion type="single" collapsible><AccordionItem value="details" className="border-b-0"><AccordionTrigger className="py-2 text-sm">Variáveis, validade e aplicação</AccordionTrigger><AccordionContent className="space-y-3 text-sm"><div><p className="mb-1 font-medium">Variáveis e unidades</p><p className="text-muted-foreground">{item.variables}</p></div><div><p className="mb-1 font-medium">Condições de validade</p><p className="text-muted-foreground">{item.conditions}</p></div><div><p className="mb-1 font-medium">Aplicação</p><p className="text-muted-foreground">{item.application}</p></div></AccordionContent></AccordionItem></Accordion></CardContent></Card>)}
      </div>
      {formulas.length === 0 && <Card><CardContent className="p-8 text-center"><Search className="mx-auto h-7 w-7 text-muted-foreground"/><p className="mt-2 font-medium">Nenhuma fórmula encontrada</p><p className="text-sm text-muted-foreground">Tente outro termo ou selecione todas as áreas.</p></CardContent></Card>}
    </section>

    <Card className="mt-6"><CardHeader><div className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary"/><CardTitle className="text-base">Protocolo científico obrigatório</CardTitle></div><CardDescription>Regras que o WLC.IA deverá observar antes de aceitar um cálculo como confiável.</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{physicsPrinciples.map((principle, index) => <div key={index} className="rounded-md bg-muted/50 p-3 text-sm">{principle}</div>)}</CardContent></Card>
    
  </Page>;
}

function KnowledgeCategories() {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const t = q.trim().toLocaleLowerCase("pt-BR"); const m = new Map<string, typeof WLC_CORE_KNOWLEDGE>();
    for (const k of WLC_CORE_KNOWLEDGE) { if (t && !`${k.title} ${k.domain} ${k.content} ${k.keywords.join(" ")}`.toLocaleLowerCase("pt-BR").includes(t)) continue; m.set(k.domain, [...(m.get(k.domain) ?? []), k]); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [q]);
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/><h2 className="font-semibold">Tudo que a WLC.IA sabe</h2></div><Badge variant="secondary">{WLC_CORE_KNOWLEDGE.length} conhecimentos · {groups.length} categorias</Badge></div>
    <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar no conhecimento..." className="pl-9" /></div>
    <Accordion type="multiple" className="rounded-lg border bg-card px-3">
      {groups.map(([domain, items]) => <AccordionItem key={domain} value={domain}><AccordionTrigger className="text-sm"><span className="flex items-center gap-2">{domain}<Badge variant="outline">{items.length}</Badge></span></AccordionTrigger><AccordionContent className="space-y-2">{items.map((k) => <div key={k.id} className="rounded-md bg-muted/50 p-3"><p className="text-sm font-medium">{k.title}</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{k.content}</p><div className="mt-2 flex flex-wrap gap-1">{k.keywords.slice(0, 12).map((w) => <Badge key={w} variant="secondary" className="font-normal">{w}</Badge>)}</div></div>)}</AccordionContent></AccordionItem>)}
    </Accordion>
  </section>;
}

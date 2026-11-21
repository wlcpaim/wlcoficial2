import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Github, Database, Loader2, CheckCircle2, XCircle, Trash2, KeyRound, Zap, Star } from "lucide-react";
import { toast } from "sonner";
import { saveGithubToken, testGithub, deleteConnection, addGeminiKey, setPrimaryKey, listKnowledgeRepos, setKnowledgeRepo } from "@/lib/connections.functions";
import { syncAllMotors } from "@/lib/cognitive.functions";
import { schemaStatus } from "@/lib/studio.functions";
import { useConnections } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { Page, Status, fmt, Loading } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_GEMINI_MODEL } from "@/lib/models";
import { testKeyInBackground } from "@/lib/key-tester";
import { parseKeyList } from "@/lib/key-list";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações — WLC.IA" }, { name: "description", content: "Chave Gemini (Google AI Studio) e integração GitHub." }, { property: "og:title", content: "Configurações — WLC.IA" }, { property: "og:description", content: "Chave Gemini (Google AI Studio) e integração GitHub." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Settings,
});

// Tables locked to the server only: RLS on with no policies is intended.
const SYSTEM_TABLES = new Set(["migration_history"]);

function scopesText(v: unknown): string {
  const t = Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "";
  return !t || t === "fine-grained" ? "token fine-grained (sem escopos clássicos)" : t;
}

const PERMS = [
  ["Administration: leitura e escrita", "criar novos repositórios para seus projetos"],
  ["Contents: leitura e escrita", "ler, criar, editar e remover arquivos (só com sua aprovação) e fazer commits e branches"],
  ["Metadata: somente leitura", "listar repositórios e consultar suas informações (obrigatória)"],
  ["GitHub Actions (opcional)", "só se o agente precisar mexer em GitHub Actions"],
];

function PermissionGuide() {
  return (
    <details className="rounded-md bg-muted/40 p-3 text-xs">
      <summary className="cursor-pointer font-medium">Como criar o token certo (uma vez só)</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
        <li>GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.</li>
        <li>Repository access: <b>All repositories</b> (assim repositórios novos já entram sem refazer o token).</li>
        <li>Marque as permissões abaixo e escolha uma validade longa.</li>
      </ol>
      <ul className="mt-2 space-y-1">{PERMS.map(([p, why]) => <li key={p}><b>{p}</b> — <span className="text-muted-foreground">{why}</span></li>)}</ul>
    </details>
  );
}


function KnowledgeRepo({ current }: { current?: { full: string; branch: string } }) {
  const qc = useQueryClient();
  const list = useServerFn(listKnowledgeRepos);
  const pick = useServerFn(setKnowledgeRepo);
  const syncAll = useServerFn(syncAllMotors);
  const repos = useQuery({ queryKey: ["knowledge-repos"], queryFn: () => list() });
  const [sel, setSel] = useState(current?.full ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">Repositório oficial WLC.IA</p>
      <p className="text-xs text-muted-foreground">Todo motor criado ou treinado é salvo automaticamente em <span className="font-mono">knowledge/motors/</span> deste repositório (memória eterna).</p>
      {current && <p className="text-xs">Atual: <b className="font-mono">{current.full}</b> ({current.branch})</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <select aria-label="Repositório oficial" className="h-10 flex-1 rounded-md border bg-background px-2 text-sm" value={sel} onChange={(e) => setSel(e.target.value)} disabled={repos.isLoading}>
          <option value="">{repos.isLoading ? "Carregando repositórios…" : repos.isError ? "Erro ao listar repositórios" : "Escolha o repositório"}</option>
          {(repos.data ?? []).map((r) => <option key={r.full} value={r.full}>{r.full}</option>)}
        </select>
        <Button disabled={!sel || busy !== null} onClick={async () => {
          setBusy("p");
          try { const r = await pick({ data: { full: sel } }); await qc.invalidateQueries({ queryKey: ["connections"] }); toast.success(`Repositório oficial: ${r.full}`); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
        }}>{busy === "p" && <Loader2 className="h-4 w-4 animate-spin" />} Salvar repositório</Button>
        {current && <Button variant="outline" disabled={busy !== null} onClick={async () => {
          setBusy("s");
          try { const r = await syncAll(); r.error && r.ok < r.total ? toast.error(`${r.ok}/${r.total} motores salvos: ${r.error}`) : toast.success(`${r.ok} motor(es) salvos no código-fonte`); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
        }}>{busy === "s" && <Loader2 className="h-4 w-4 animate-spin" />} Salvar todos os motores agora</Button>}
      </div>
    </div>
  );
}

function GithubAudit({ audit }: { audit: any }) {
  if (!audit || !Array.isArray(audit.checks)) return <p className="text-xs text-muted-foreground">Toque em Testar para auditar as permissões.</p>;
  const state = audit.missing?.length ? "Conectado com permissões incompletas" : "Conectado e validado";
  return (
    <div className="space-y-1 text-xs">
      <div className="font-medium">{state} · {audit.kind}{audit.expires ? ` · expira ${audit.expires}` : ""}</div>
      {audit.checks.map((c: any) => (
        <div key={c.id} className="flex items-start gap-2">
          {c.ok === true ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> : c.ok === false ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" /> : <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border" />}
          <span className="min-w-0 break-anywhere"><b>{c.label}</b> — <span className="text-muted-foreground">{c.detail}</span></span>
        </div>
      ))}
    </div>
  );
}


function Settings() {
  const conns = useConnections();
  const qc = useQueryClient();
  const save = useServerFn(saveGithubToken);
  const test = useServerFn(testGithub);
  const del = useServerFn(deleteConnection);
  const status = useServerFn(schemaStatus);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [geminiName, setGeminiName] = useState("Gemini free");
  const [geminiKey, setGeminiKey] = useState("");
  const [keyList, setKeyList] = useState("");
  const addGemini = useServerFn(addGeminiKey);
  const setPrimary = useServerFn(setPrimaryKey);
  const schema = useQuery({ queryKey: ["schema"], queryFn: () => status() });
  const migrations = useQuery({ queryKey: ["migrations"], queryFn: async () => (await supabase.rpc("devstudio_installed_version")).data ?? [] });
  const gh = conns.data?.find((c) => c.provider === "github");
  const geminiKeys = (conns.data ?? []).filter((c) => c.provider === "gemini");
  const rows = schema.data?.status ?? [];
  const ok = rows.length > 0 && rows.every((r) => r.exists_flag && r.rls_enabled && (r.policy_count > 0 || SYSTEM_TABLES.has(r.table_name)));
  async function run(k: string, fn: () => Promise<any>, msg: (r: any) => string) {
    setBusy(k);
    try { const r = await fn(); toast.success(msg(r)); qc.invalidateQueries({ queryKey: ["connections"] }); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  return (
    <Page title="CONFIGURAÇÕES — WLC.IA" desc="">
      <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
        <p className="font-medium text-emerald-700 dark:text-emerald-400">WLC.IA</p>
        <p className="mt-1 text-muted-foreground">Configuração e estrutura do ambiente.</p>
      </div>
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="flex items-center gap-2 font-medium">03. <Database className="h-4 w-4" /> Banco de dados — preservado</h2>
        {schema.isLoading ? <Loading /> : (
          <>
            <div className="flex items-center gap-2 text-sm">{ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}{ok ? `Instalado: ${rows.length} tabelas com proteção por usuário ativa` : schema.data?.error ?? "Estrutura incompleta"}</div>
            <div className="text-xs text-muted-foreground">Versão: {migrations.data?.[0]?.version ?? "—"} · {migrations.data?.[0]?.name ?? ""} · aplicada {fmt(migrations.data?.[0]?.applied_at)}</div>
            <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">Ver tabelas</summary>
              <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">{rows.map((r) => <div key={r.table_name} className="flex justify-between gap-2 rounded bg-muted/50 px-2 py-1 font-mono"><span className="truncate">{r.table_name}</span><span className={r.rls_enabled ? "text-success" : "text-destructive"}>{r.rls_enabled ? (SYSTEM_TABLES.has(r.table_name) && r.policy_count === 0 ? "RLS · só servidor" : `RLS · ${r.policy_count}`) : "sem RLS"}</span></div>)}</div>
            </details>
          </>
        )}
      </section>
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="flex items-center gap-2 font-medium">01. <KeyRound className="h-4 w-4" /> Google Gemini (gratuito)</h2>
        <p className="text-sm text-muted-foreground">
          Use sua chave gratuita do <a className="text-primary underline" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.
          Assim a WLC.IA <b>não consome créditos Lovable</b> e evita o erro 402.
        </p>
        {!geminiKeys.length ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-100">
            Nenhuma chave cadastrada. Sem ela o agente não inicia (a reserva Lovable está desligada de propósito).
          </p>
        ) : (
          <ul className="space-y-2">
            {geminiKeys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="truncate">{k.name}</b>
                    {k.is_primary && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">principal</span>}
                    <Status s={k.status} />
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">{k.secret_hint} · {k.model ?? DEFAULT_GEMINI_MODEL}</div>
                  {k.last_error && <div className="break-anywhere text-xs text-destructive">{k.last_error}</div>}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" disabled={k.status === "testing"} onClick={() => testKeyInBackground(qc, k.id, k.name)}>
                    {k.status === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Testar
                  </Button>
                  {!k.is_primary && (
                    <Button size="sm" variant="ghost" disabled={busy === k.id + "p"} onClick={() => run(k.id + "p", () => setPrimary({ data: { id: k.id } }), () => "Definida como principal")}>
                      <Star className="h-4 w-4" /> Principal
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={busy === k.id + "d"} onClick={() => confirm(`Remover chave "${k.name}"?`) && run(k.id + "d", () => del({ data: { id: k.id } }), () => "Chave removida")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <p className="text-xs font-medium">Adicionar chave</p>
          <Input placeholder="Nome (ex.: Gemini free)" value={geminiName} onChange={(e) => setGeminiName(e.target.value)} className="h-9" />
          <Input type="password" autoComplete="off" placeholder="AIza…" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="h-9 font-mono" />
          <p className="text-[11px] text-muted-foreground">A chave é criptografada no servidor e nunca volta ao navegador.</p>
          <Button
            disabled={geminiKey.trim().length < 20 || !geminiName.trim() || busy === "gemini-add"}
            onClick={() =>
              run(
                "gemini-add",
                async () => {
                  const r = await addGemini({
                    data: {
                      name: geminiName.trim() || "Gemini free",
                      apiKey: geminiKey.trim(),
                      model: DEFAULT_GEMINI_MODEL,
                      setPrimary: geminiKeys.length === 0,
                    },
                  });
                  setGeminiKey("");
                  await qc.invalidateQueries({ queryKey: ["connections"] });
                  testKeyInBackground(qc, r.id, geminiName.trim() || "Gemini free");
                  return r;
                },
                () => "Chave salva — testando em segundo plano",
              )
            }
          >
            {busy === "gemini-add" && <Loader2 className="h-4 w-4 animate-spin" />} Salvar chave Gemini
          </Button>
        </div>
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <p className="text-xs font-medium">Adicionar várias chaves (uma por linha)</p>
          <Textarea rows={6} autoComplete="off" spellCheck={false} placeholder={"AQ.Ab8…\nAQ.Ab8…\nAIza…"} value={keyList} onChange={(e) => setKeyList(e.target.value)} className="font-mono text-xs" />
          {(() => {
            const list = parseKeyList(keyList, geminiKeys.map((k) => k.secret_hint ?? ""));
            return (
              <>
                <p className="text-[11px] text-muted-foreground">{list.length} chave(s) nova(s) encontrada(s). Cada uma é salva separadamente e testada em segundo plano.</p>
                <Button
                  disabled={!list.length || busy === "gemini-batch"}
                  onClick={async () => {
                    setBusy("gemini-batch");
                    let ok = 0;
                    const start = geminiKeys.length;
                    for (let i = 0; i < list.length; i++) {
                      const name = `Gemini ${start + i + 1}`;
                      try {
                        const r = await addGemini({ data: { name, apiKey: list[i]!, model: DEFAULT_GEMINI_MODEL, setPrimary: start === 0 && i === 0 } });
                        ok++;
                        testKeyInBackground(qc, r.id, name);
                      } catch (e) { toast.error(`${name}: ${(e as Error).message}`); }
                    }
                    setBusy(null);
                    setKeyList("");
                    await qc.invalidateQueries({ queryKey: ["connections"] });
                    toast.success(`${ok} de ${list.length} chave(s) salvas — testando em segundo plano`);
                  }}
                >
                  {busy === "gemini-batch" && <Loader2 className="h-4 w-4 animate-spin" />} Salvar {list.length || ""} chave(s)
                </Button>
              </>
            );
          })()}
        </div>
      </section>
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="flex items-center gap-2 font-medium">02. <Github className="h-4 w-4" /> GitHub API</h2>
        {gh ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Conectado como <b>{(gh.metadata as any)?.login}</b> <span className="font-mono text-xs text-muted-foreground">{gh.secret_hint}</span></span><Status s={gh.status} /></div>
            <div className="break-anywhere text-xs text-muted-foreground">Permissões: {scopesText((gh.metadata as any)?.scopes)} · testado {fmt(gh.last_tested_at)}</div>
            {gh.last_error && <div className="break-anywhere text-xs text-destructive">{gh.last_error}</div>}
            <GithubAudit audit={(gh.metadata as any)?.audit} />
            <KnowledgeRepo current={(gh.metadata as any)?.knowledge_repo} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={busy === "t"} onClick={() => run("t", () => test(), (r) => r.ok ? `OK: ${r.login}` : `Falhou: ${r.error}`)}>{busy === "t" && <Loader2 className="h-4 w-4 animate-spin" />} Testar</Button>
              <Button size="sm" variant="ghost" onClick={() => confirm("Desconectar o GitHub?") && run("d", () => del({ data: { id: gh.id } }), () => "GitHub desconectado")}><Trash2 className="h-4 w-4" /> Desconectar</Button>
            </div>
          </>
        ) : <p className="text-sm text-muted-foreground">Não conectado.</p>}
        <PermissionGuide />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="password" autoComplete="off" placeholder={gh ? "Substituir token" : "ghp_… ou github_pat_…"} value={token} onChange={(e) => setToken(e.target.value)} className="h-10" />
          <Button disabled={token.length < 20 || busy === "s"} onClick={() => run("s", async () => { const r = await save({ data: { name: "GitHub", token } }); setToken(""); return r; }, (r) => `Conectado como ${r.login}`)}>{busy === "s" && <Loader2 className="h-4 w-4 animate-spin" />} Salvar token</Button>
        </div>
      </section>
    </Page>
  );
}

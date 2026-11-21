import * as GH from "./github.server";

export type NexusWorkflow = "analyze" | "debug" | "implement" | "review" | "security" | "architecture";
type FileEntry = { path: string; type: string; size?: number };
type Finding = { severity: "alta" | "média" | "baixa"; rule: string; path: string; line: number; excerpt: string; explanation: string };

const SKIP = /(^|\/)(node_modules|\.git|dist|build|coverage|vendor|\.next)\//i;
const SOURCE = /\.(tsx?|jsx?|mjs|cjs|json|ya?ml|toml|py|go|rs|java|php|rb|sql|sh)$/i;
const RULES: Array<{ severity: Finding["severity"]; rule: string; re: RegExp; explanation: string }> = [
  { severity: "alta", rule: "Uso de eval", re: /\beval\s*\(/, explanation: "Execução dinâmica de texto pode permitir execução de código não confiável." },
  { severity: "alta", rule: "HTML não sanitizado", re: /dangerouslySetInnerHTML/, explanation: "Verifique se o conteúdo é sanitizado antes de ser inserido no DOM." },
  { severity: "alta", rule: "Segredo possivelmente hardcoded", re: /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{12,}["']/i, explanation: "Possível credencial literal no código. Confirme e mova segredos para armazenamento seguro." },
  { severity: "média", rule: "Tipo any explícito", re: /:\s*any\b|as\s+any\b/, explanation: "O uso de any reduz a verificação estática de tipos; avalie um tipo específico." },
  { severity: "baixa", rule: "TODO/FIXME pendente", re: /\b(TODO|FIXME|HACK)\b/, explanation: "Há uma anotação de trabalho pendente que merece revisão." },
  { severity: "baixa", rule: "console.* em código", re: /\bconsole\.(log|debug|info)\s*\(/, explanation: "Confirme se o registro é necessário em produção e se não expõe dados." },
];

function relevantFiles(files: FileEntry[], workflow: NexusWorkflow): FileEntry[] {
  const candidates = files.filter((f) => f.type === "blob" && !SKIP.test(f.path) && SOURCE.test(f.path) && (f.size ?? 0) <= 120_000);
  const score = (p: string) => {
    let n = 0;
    if (/^(README|package\.json|tsconfig|vite\.config|next\.config|Cargo\.toml|go\.mod|pyproject|requirements)/i.test(p.split("/").at(-1) ?? "")) n += 10;
    if (/(src\/|app\/|pages\/|server\/|lib\/|routes\/)/i.test(p)) n += 4;
    if (/(auth|api|security|config|database|db|route|server)/i.test(p)) n += 3;
    if (workflow === "security" && /(auth|api|security|crypto|session|permission)/i.test(p)) n += 8;
    if (workflow === "architecture" && /(index|main|app|route|config|package)/i.test(p)) n += 5;
    return n;
  };
  return candidates.sort((a, b) => score(b.path) - score(a.path)).slice(0, 35);
}

export async function runNexusEngine(input: {
  workflow: NexusWorkflow;
  request: string;
  files: FileEntry[];
  repoFullName?: string | null;
  branch?: string | null;
  token?: string | null;
  projectName?: string | null;
}) {
  const { workflow, request, files, repoFullName, branch, token } = input;
  const lines: string[] = ["# WLC.IA — diagnóstico local", "", `**Workflow:** ${workflow}`, `**Projeto:** ${input.projectName ?? "não informado"}`];
  if (!repoFullName || !token) {
    lines.push("", "Não há repositório GitHub acessível neste chat. WLC.IA funciona sem provedor de IA, mas precisa do acesso GitHub para inspecionar arquivos remotos.", "", "Posso explicar os workflows e orientar a análise, mas ainda não há código-fonte para examinar.");
    return { content: lines.join("\n"), filesRead: 0, findings: [] as Finding[] };
  }

  const selected = relevantFiles(files, workflow);
  const findings: Finding[] = [];
  const read: Array<{ path: string; content: string }> = [];
  let totalBytes = 0;
  for (const file of selected) {
    if (totalBytes >= 550_000) break;
    try {
      const result = await GH.getFile(token, repoFullName, file.path, branch ?? undefined);
      if (!result) continue;
      const content = result.content.slice(0, Math.min(120_000, 550_000 - totalBytes));
      totalBytes += content.length;
      read.push({ path: file.path, content });
      const rows = content.split(/\r?\n/);
      rows.forEach((row, index) => {
        for (const rule of RULES) {
          if (rule.re.test(row)) {
            findings.push({ severity: rule.severity, rule: rule.rule, path: file.path, line: index + 1, excerpt: row.trim().slice(0, 180), explanation: rule.explanation });
          }
        }
      });
    } catch {
      // Falhas isoladas de leitura não encerram a varredura; serão reportadas no resumo.
    }
  }

  const packageFile = read.find((f) => /(^|\/)package\.json$/i.test(f.path));
  let scripts: string[] = [];
  if (packageFile) {
    try { scripts = Object.keys(JSON.parse(packageFile.content)?.scripts ?? {}); } catch { /* JSON inválido será detectado no relatório */ }
  }
  const uniqueFindings = findings.filter((f, i, a) => a.findIndex((x) => x.rule === f.rule && x.path === f.path && x.line === f.line) === i);
  const count = (severity: Finding["severity"]) => uniqueFindings.filter((f) => f.severity === severity).length;
  lines.push("", "## Escopo da inspeção", `- Arquivos no inventário: ${files.length}`, `- Arquivos lidos: ${read.length} (limite local de 35 arquivos e aproximadamente 550 KB)`, `- Branch consultado: ${branch ?? "branch padrão"}`, `- Scripts detectados: ${scripts.length ? scripts.join(", ") : "não identificados"}`);
  lines.push("", "## Resultado das regras estáticas", `- Alta prioridade: ${count("alta")}`, `- Média prioridade: ${count("média")}`, `- Baixa prioridade: ${count("baixa")}`);
  if (uniqueFindings.length) {
    lines.push("", "## Achados com evidências");
    for (const f of uniqueFindings.slice(0, 100)) lines.push(`### [${f.severity.toUpperCase()}] ${f.rule}`, `- Arquivo: \`${f.path}\` — linha ${f.line}`, `- Evidência: \`${f.excerpt}\``, `- Por que revisar: ${f.explanation}`);
    if (uniqueFindings.length > 100) lines.push(`- Mais ${uniqueFindings.length - 100} achados omitidos nesta resposta.`);
  } else {
    lines.push("", "Nenhuma ocorrência das regras estáticas iniciais foi encontrada nos arquivos lidos. Isso não comprova ausência de bugs ou vulnerabilidades.");
  }
  lines.push("", "## Limites e confiabilidade", "- Esta versão é um motor determinístico local: usa regras, padrões e leitura real de arquivos; não chama Gemini, OpenAI, Lovable AI Gateway nem outro modelo de linguagem.", "- Os achados são sinais para revisão, não prova de vulnerabilidade. Pode haver falsos positivos e falsos negativos.", "- Não foram executados build, testes, lint ou código do repositório por esta análise.", "- Nenhum arquivo foi alterado. WLC.IA não inventa correções geradas por um modelo; alterações precisam ser propostas por regras explícitas e confirmadas pelo usuário.");
  if (workflow === "implement") lines.push("", "## Próxima ação de implementação", `Pedido recebido: ${request || "preparar implementação"}. WLC.IA pode localizar arquivos e apontar dependências, mas esta versão inicial não gera código arbitrário por linguagem natural. Para manter segurança, nenhuma gravação foi feita.`);
  if (workflow === "debug") lines.push("", "## Depuração", "Os achados acima são verificações estáticas. Para confirmar um bug, será necessário reproduzir o fluxo ou executar testes no ambiente do projeto.");
  return { content: lines.join("\n"), filesRead: read.length, findings: uniqueFindings };
}

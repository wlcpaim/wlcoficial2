import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { addDocumentFiles, createDocument, exportMotorFiles, finalizeDocument } from "@/lib/cognitive.functions";
import { batchFiles, extractUpload } from "@/lib/cognitive/files";

export const KIND_PT: Record<string, string> = { concept: "Conceito", technique: "Técnica", method: "Método", formula: "Fórmula", rule: "Regra", architecture: "Arquitetura", algorithm: "Algoritmo", pattern: "Padrão", solution: "Solução", experience: "Experiência", fact: "Fato" };
export const VALIDATION_PT: Record<string, string> = { confirmed: "Confirmado", source_validated: "Validado por fonte", hypothesis: "Hipótese", estimate: "Estimativa", unverified: "Não verificado", conflicting: "Conflitante" };
const VTONE: Record<string, string> = { confirmed: "bg-success/15 text-success", source_validated: "bg-primary/15 text-primary", conflicting: "bg-destructive/15 text-destructive", hypothesis: "bg-warning/15 text-warning", estimate: "bg-warning/15 text-warning" };
export function ValidationBadge({ v }: { v: string }) {
  return <Badge variant="secondary" className={cn("font-normal", VTONE[v])}>{VALIDATION_PT[v] ?? v}</Badge>;
}
export const DOC_STATUS_PT: Record<string, string> = { receiving: "recebendo", processing: "processando", processed: "processado", partial: "parcial", failed: "falhou" };
export const ACCEPT = ".zip,.txt,.md,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.csv,.json,.xml,.html,.htm,.css,.scss,.js,.jsx,.mjs,.ts,.tsx,.py,.java,.c,.h,.cpp,.hpp,.cs,.go,.rs,.rb,.php,.swift,.kt,.sql,.yaml,.yml,.toml,.ini,.sh,.vue,.svelte,.graphql,.proto,.log";

/** Reads, batches and sends one file through the learning pipeline. Reports progress text. */
export async function studyFile(file: File, motorId: string, conversationId: string | null, onProgress: (s: string) => void) {
  onProgress(`Lendo ${file.name}…`);
  const { kind, files, warnings } = await extractUpload(file);
  const { documentId } = await createDocument({ data: { motorId, conversationId, name: file.name, kind, size: file.size, fileCount: files.length } });
  const batches = batchFiles(files);
  for (let i = 0; i < batches.length; i++) {
    onProgress(`Enviando lote ${i + 1}/${batches.length} de ${file.name}…`);
    await addDocumentFiles({ data: { documentId, files: batches[i]! } });
  }
  onProgress(`Analisando e extraindo conhecimento de ${file.name}…`);
  const r = await finalizeDocument({ data: { documentId } });
  return { documentId, warnings, ...r };
}

/** Downloads the native file representation (/cognitive-engine/...) generated from the database. */
export async function downloadExport(motorId: string | null, name: string) {
  const { files } = await exportMotorFiles({ data: { motorId } });
  const zip = new JSZip();
  for (const [p, c] of Object.entries(files)) zip.file(p, c);
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${name}.zip`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

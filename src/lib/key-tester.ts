// Background tester for Google AI Studio keys. Lives at module level (not in a
// component), so tests keep running when the user changes screen, tab or adds
// another key; results update the shared connections cache and show a toast.
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { testGeminiKey } from "./connections.functions";

const running = new Set<string>();

export function isKeyTesting(id: string) {
  return running.has(id);
}

function setStatus(qc: QueryClient, id: string, status: string) {
  qc.setQueryData(["connections"], (rows: any[] | undefined) =>
    rows?.map((r) => (r.id === id ? { ...r, status } : r)),
  );
}

export function testKeyInBackground(qc: QueryClient, id: string, name: string, silent = false) {
  if (running.has(id)) return;
  running.add(id);
  setStatus(qc, id, "testing");
  void (async () => {
    try {
      const r: any = await testGeminiKey({ data: { id } });
      if (!silent) {
        if (r.ok) toast.success(`Chave "${name}" OK · ${r.workingModel}`);
        else toast.error(`Chave "${name}": ${r.status === "quota_exceeded" ? "cota esgotada" : r.error}`);
      }
    } catch (e) {
      if (!silent) toast.error(`Teste da chave "${name}" falhou: ${(e as Error).message}`);
    } finally {
      running.delete(id);
      qc.invalidateQueries({ queryKey: ["connections"] });
    }
  })();
}

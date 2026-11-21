// Browser-safe defaults shared by the UI and the server.
/** Modo autônomo: motor Lovable embutido — sem chaves Gemini/Vercel do usuário. */
export const AUTONOMOUS_MODEL = "builtin";
export const DEFAULT_CHAT_MODEL = AUTONOMOUS_MODEL;

export const DEFAULT_GEMINI_MODEL = "auto";
/**
 * Free-tier text models, from the largest daily quota to the smallest. "auto" walks this
 * list; a model that hits its quota is skipped and the next one is used, so the most
 * limited model (gemini-3.8-flash, ~20 requests/day) is only spent last.
 */
export const FREE_GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite-preview",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];
/** Always the quota order; a chosen model only goes first when it is outside the list. */
export function modelCandidates(preferred: string | null | undefined): string[] {
  const p = preferred && preferred !== "auto" && !FREE_GEMINI_MODELS.includes(preferred) ? [preferred] : [];
  return [...p, ...FREE_GEMINI_MODELS];
}

/** Vercel AI Gateway: the chat stores "vercel:<model>" to route through the user's Vercel key. */
export const VERCEL_PREFIX = "vercel:";
export const DEFAULT_VERCEL_MODEL = "moonshotai/kimi-k3";
export const isVercelModel = (m: string | null | undefined) => !!m && m.startsWith(VERCEL_PREFIX);
export const vercelModelId = (m: string) => m.slice(VERCEL_PREFIX.length);

import { nextDailyReset } from "./key-rotation";
// Model calls in OpenAI chat format: Google AI Studio (user keys) and the built-in fallback.
import { redactSecrets } from "./crypto.server";
import { modelCandidates } from "./models";

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
  extra_content?: unknown;
};

export type ChatMsg =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[]; [k: string]: unknown }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type AIErrorKind = "quota" | "invalid" | "model" | "busy" | "credits" | "network" | "other";

export class AIError extends Error {
  kind: AIErrorKind;
  status: number;
  constructor(kind: AIErrorKind, status: number, message: string) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

export const BUILTIN_MODEL = "google/gemini-3.8-flash";
const GEMINI_OPENAI = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function classifyGemini(status: number, body: string): AIErrorKind {
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(body)) return "quota";
  if (/API_KEY_INVALID|API key not valid|PERMISSION_DENIED|unregistered callers/i.test(body) || status === 401 || status === 403)
    return "invalid";
  if (status === 404 || /model.*not found|is not found|not supported|no longer available/i.test(body)) return "model";
  if (status >= 500 || /UNAVAILABLE|overloaded|high demand/i.test(body)) return "busy";
  return "other";
}

async function post(url: string, headers: Record<string, string>, body: unknown) {
  try {
    return await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  } catch (e) {
    throw new AIError("network", 0, redactSecrets(`Falha de rede: ${(e as Error).message}`));
  }
}

export type CompletionResult = { message: Extract<ChatMsg, { role: "assistant" }>; usage?: unknown };

export async function callGemini(
  apiKey: string,
  model: string,
  messages: ChatMsg[],
  tools?: ToolDef[],
  maxTokens?: number,
  retry = true,
): Promise<CompletionResult> {
  const body = {
    model: model.replace(/^models\//, ""),
    messages,
    ...(tools?.length ? { tools, tool_choice: "auto" } : {}),
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  };
  // Google returns temporary 503 "high demand" spikes; retry a couple of times before giving up.
  const waits = retry ? [1500, 4000] : [];
  let res: Response;
  let text: string;
  for (let i = 0; ; i++) {
    res = await post(GEMINI_OPENAI, { Authorization: `Bearer ${apiKey}` }, body);
    text = await res.text();
    if (res.ok) break;
    const kind = classifyGemini(res.status, text);
    if (kind === "busy" && i < waits.length) {
      await new Promise((r) => setTimeout(r, waits[i]));
      continue;
    }
    const msg = kind === "busy"
      ? `Google sobrecarregado no modelo ${body.model} (HTTP ${res.status}, temporário). A chave está válida; tente de novo em alguns minutos ou use outro modelo.`
      : `Gemini ${res.status}: ${text.slice(0, 600)}`;
    throw new AIError(kind, res.status, redactSecrets(msg));
  }
  const json = JSON.parse(text) as { choices?: { message: CompletionResult["message"] }[]; usage?: unknown };
  const message = json.choices?.[0]?.message;
  if (!message) throw new AIError("other", 200, "Resposta vazia do Gemini");
  return { message, usage: json.usage };
}

/**
 * Motor de IA hospedado no Lovable (gateway oficial).
 * Modo autônomo WLC.IA: único provedor usado em produção — sem Gemini/Vercel do usuário.
 * HTTP 402 = créditos/cota da plataforma esgotados (não é falha do código WLC.IA).
 */
export async function callBuiltin(messages: ChatMsg[], tools?: ToolDef[], maxTokens?: number): Promise<CompletionResult> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) {
    throw new AIError(
      "invalid",
      0,
      "Motor WLC.IA indisponível: LOVABLE_API_KEY ausente neste ambiente. No hosting Lovable essa variável é injetada automaticamente.",
    );
  }
  const res = await post(GATEWAY, { Authorization: `Bearer ${key}` }, {
    model: BUILTIN_MODEL,
    messages,
    ...(tools?.length ? { tools, tool_choice: "auto" } : {}),
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  });
  const text = await res.text();
  if (!res.ok) {
    const kind: AIErrorKind = res.status === 429 ? "quota" : res.status === 402 ? "credits" : res.status === 401 || res.status === 403 ? "invalid" : res.status >= 500 ? "busy" : "other";
    if (kind === "credits") {
      throw new AIError(
        kind,
        res.status,
        "Créditos do motor WLC.IA (Lovable) esgotados (HTTP 402). O checkpoint foi salvo. Aguarde a renovação da cota da plataforma ou contate o suporte Lovable — não é necessário configurar Gemini nem Vercel.",
      );
    }
    if (kind === "quota") {
      throw new AIError(kind, res.status, `Limite de uso do motor WLC.IA atingido (HTTP ${res.status}). Tente novamente em alguns minutos.`);
    }
    throw new AIError(kind, res.status, `Motor WLC.IA indisponível (HTTP ${res.status}): ${text.slice(0, 240)}`);
  }
  const json = JSON.parse(text) as { choices?: { message: CompletionResult["message"] }[]; usage?: unknown };
  const message = json.choices?.[0]?.message;
  if (!message) throw new AIError("other", 200, "Resposta vazia do motor WLC.IA");
  return { message, usage: json.usage };
}

/** Models of a key that hit their daily quota (key suffix + model -> retry time). */
const modelExhausted = new Map<string, number>();
const exKey = (apiKey: string, m: string) => `${apiKey.slice(-12)}|${m}`;

const KIND_PT: Record<AIErrorKind, string> = {
  quota: "cota esgotada", invalid: "chave recusada", model: "modelo indisponível para esta chave",
  busy: "Google sobrecarregado", credits: "sem créditos", network: "falha de rede", other: "erro do Google",
};

/** Tries the preferred model, then every free model, until one answers. Quota/invalid stop immediately (they affect the whole key). */
export async function callGeminiAuto(
  apiKey: string, preferred: string | null | undefined, messages: ChatMsg[], tools?: ToolDef[], maxTokens?: number,
): Promise<CompletionResult & { model: string }> {
  const tried: string[] = [];
  let last: AIError | null = null;
  let quotaErr: AIError | null = null;
  let allQuota = true;
  const now = Date.now();
  for (const m of modelCandidates(preferred)) {
    const ex = modelExhausted.get(exKey(apiKey, m));
    if (ex && ex > now) { tried.push(`${m}: ${KIND_PT.quota}`); continue; }
    try {
      const r = await callGemini(apiKey, m, messages, tools, maxTokens, tried.length === 0);
      return { ...r, model: m };
    } catch (e) {
      if (!(e instanceof AIError)) throw e;
      if (e.kind === "invalid") throw e;
      // A quota error is per model: remember it until the daily reset and try the next model.
      if (e.kind === "quota") {
        modelExhausted.set(exKey(apiKey, m), nextDailyReset(Date.now()));
        quotaErr = e;
      } else if (e.kind !== "model") allQuota = false;
      tried.push(`${m}: ${KIND_PT[e.kind]}${e.status ? ` (HTTP ${e.status})` : ""}`);
      last = e;
    }
  }
  // Every model of this key is out of quota: let the caller switch to the next key.
  if (allQuota && (quotaErr || tried.length)) {
    throw new AIError("quota", 429, `Cota diária esgotada em todos os modelos gratuitos desta chave. ${tried.join("; ")}`);
  }
  const kind = last?.kind === "network" ? "network" : "busy";
  throw new AIError(kind, last?.status ?? 0, `Nenhum modelo gratuito respondeu agora. Tentativas: ${tried.join("; ")}. A chave é válida; o Google está instável — tente em alguns minutos.`);
}

/** Cheap real call that proves the key works and has quota right now. */
export async function pingGemini(apiKey: string, model: string): Promise<{ ok: true; model: string } | { ok: false; kind: AIErrorKind; error: string }> {
  try {
    const r = await callGeminiAuto(apiKey, model, [{ role: "user", content: "Responda apenas: ok" }], undefined, 16);
    return { ok: true, model: r.model };
  } catch (e) {
    if (e instanceof AIError) return { ok: false, kind: e.kind, error: e.message };
    return { ok: false, kind: "other", error: redactSecrets(String(e)) };
  }
}

export async function listGeminiModels(apiKey: string): Promise<string[]> {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
    headers: { "x-goog-api-key": apiKey },
  });
  const text = await res.text();
  if (!res.ok) throw new AIError(classifyGemini(res.status, text), res.status, redactSecrets(`Gemini ${res.status}: ${text.slice(0, 300)}`));
  const json = JSON.parse(text) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  return (json.models ?? [])
    .filter((m) => m.name.includes("gemini") && (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .sort();
}

const VERCEL_GATEWAY = "https://ai-gateway.vercel.sh/v1/chat/completions";

/** Text models offered by the Vercel AI Gateway. */
export async function listVercelModels(apiKey: string): Promise<string[]> {
  const res = await fetch("https://ai-gateway.vercel.sh/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) return [];
  const j = (await res.json()) as { data?: { id: string; type?: string }[] };
  return (j.data ?? []).filter((m) => !m.type || m.type === "language").map((m) => m.id).sort();
}

/** Vercel AI Gateway (OpenAI-compatible) with the user's own key. */
export async function callVercel(apiKey: string, model: string, messages: ChatMsg[], tools?: ToolDef[], maxTokens?: number): Promise<CompletionResult> {
  const res = await post(VERCEL_GATEWAY, { Authorization: `Bearer ${apiKey}` }, {
    model, messages,
    ...(tools?.length ? { tools, tool_choice: "auto" } : {}),
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  });
  const text = await res.text();
  if (!res.ok) {
    const kind: AIErrorKind = res.status === 429 ? "quota" : res.status === 402 ? "credits" : res.status === 401 || res.status === 403 ? "invalid" : res.status === 404 || /model/i.test(text) && res.status === 400 ? "model" : res.status >= 500 ? "busy" : "other";
    const pt: Record<AIErrorKind, string> = { quota: "limite de uso atingido", credits: "sem créditos na Vercel", invalid: "chave da Vercel recusada", model: `modelo ${model} indisponível`, busy: "Vercel instável", network: "falha de rede", other: "erro da Vercel" };
    throw new AIError(kind, res.status, redactSecrets(`Vercel ${res.status} (${pt[kind]}): ${text.slice(0, 400)}`));
  }
  const json = JSON.parse(text) as { choices?: { message: CompletionResult["message"] }[]; usage?: unknown };
  const message = json.choices?.[0]?.message;
  if (!message) throw new AIError("other", 200, "Resposta vazia da Vercel");
  return { message, usage: json.usage };
}

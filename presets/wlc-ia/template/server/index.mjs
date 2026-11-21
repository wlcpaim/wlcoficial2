// Servidor de IA do __PROJECT_TITLE__ — sem dependências (Node 20+).
// Mantém a chave do provedor no servidor: o navegador só fala com /api.
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(join(root, ".env"));

const PORT = Number(process.env.PORT || 8787);
const BASE_URL = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const MAX_BODY = 64 * 1024;
const MAX_MESSAGES = 50;

/** Lê um arquivo .env simples (CHAVE=valor) sem sobrescrever variáveis já definidas. */
function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith("#")) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

const isConfigured = () => Boolean(process.env.AI_API_KEY && process.env.AI_API_KEY.trim());

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("Mensagem grande demais."), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Valida o corpo da requisição de chat e devolve uma versão limpa. */
export function validateChatBody(raw) {
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return { error: "JSON inválido." };
  }
  if (!body || typeof body !== "object") return { error: "Corpo inválido." };
  if (typeof body.system !== "string" || body.system.length > 20000) return { error: "Campo 'system' inválido." };
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return { error: "Campo 'messages' deve ter entre 1 e 50 itens." };
  }
  const messages = [];
  for (const m of body.messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !m.content.trim()) {
      return { error: "Cada mensagem precisa de role (user/assistant) e content." };
    }
    messages.push({ role: m.role, content: m.content.slice(0, 16000) });
  }
  return { value: { system: body.system, messages } };
}

function upstreamMessage(status) {
  if (status === 401 || status === 403) return "O provedor recusou a chave de IA. Confira AI_API_KEY.";
  if (status === 404) return "Modelo ou endereço não encontrado. Confira AI_MODEL e AI_BASE_URL.";
  if (status === 429) return "Limite de uso do provedor atingido. Tente novamente em instantes.";
  if (status >= 500) return "O provedor de IA está indisponível no momento.";
  return `O provedor de IA respondeu com erro ${status}.`;
}

async function handleChat(req, res) {
  if (!isConfigured()) return send(res, 503, { error: "not_configured", message: "Nenhum modelo de IA configurado no servidor." });
  let raw;
  try {
    raw = await readBody(req);
  } catch (e) {
    return send(res, e.status || 400, { error: "bad_request", message: e.message });
  }
  const parsed = validateChatBody(raw);
  if (parsed.error) return send(res, 400, { error: "bad_request", message: parsed.error });
  const { system, messages } = parsed.value;
  try {
    const upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, ...messages] }),
      signal: AbortSignal.timeout(60000),
    });
    if (!upstream.ok) return send(res, 502, { error: "upstream_error", status: upstream.status, message: upstreamMessage(upstream.status) });
    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return send(res, 502, { error: "empty_response", message: "O modelo não retornou texto." });
    return send(res, 200, { content, model: data.model || MODEL });
  } catch (e) {
    const timeout = e && e.name === "TimeoutError";
    return send(res, 504, { error: timeout ? "timeout" : "network_error", message: timeout ? "O modelo demorou demais para responder." : "Não foi possível falar com o provedor de IA." });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/api/health") {
    return send(res, 200, isConfigured() ? { configured: true, model: MODEL } : { configured: false });
  }
  if (req.method === "POST" && url.pathname === "/api/chat") return handleChat(req, res);
  return send(res, 404, { error: "not_found" });
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  server.listen(PORT, () => {
    console.log(`Servidor de IA em http://localhost:${PORT} — modelo ${isConfigured() ? MODEL : "não configurado"}`);
  });
}

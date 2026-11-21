/**
 * Camada local-first da WLC.IA (preparação para independência total do Supabase).
 *
 * Nesta versão:
 * - Token GitHub e preferências podem ser espelhados em localStorage.
 * - Histórico de chats "leve" pode ser cacheado localmente.
 * - O motor de análise (WLC.IA engine) continua no servidor enquanto houver
 *   conexão GitHub autorizada; a migração completa para client-side é fase 2.
 *
 * Objetivo: o repositório GitHub + este estado local sejam a "base de dados"
 * inicial de WLC.IA, permitindo operar mesmo com Supabase desligado no futuro.
 */

const PREFIX = "nexus.v0.1.";

export type LocalGithubConfig = {
  token?: string; // apenas para modo experimental client-side
  login?: string;
  updatedAt?: string;
};

export type LocalChatSummary = {
  id: string;
  title: string;
  workflow: string;
  repoFullName?: string;
  updatedAt: string;
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // quota or private mode
  }
}

export function getLocalGithubConfig(): LocalGithubConfig {
  return read<LocalGithubConfig>("github", {});
}

export function setLocalGithubConfig(cfg: LocalGithubConfig) {
  write("github", { ...cfg, updatedAt: new Date().toISOString() });
}

export function getLocalChatHistory(): LocalChatSummary[] {
  return read<LocalChatSummary[]>("chats", []);
}

export function pushLocalChat(summary: LocalChatSummary) {
  const list = getLocalChatHistory().filter((c) => c.id !== summary.id);
  list.unshift(summary);
  write("chats", list.slice(0, 50)); // keep last 50
}

export function clearLocalNexusData() {
  if (typeof window === "undefined") return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

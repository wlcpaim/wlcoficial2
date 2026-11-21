// Persistência local versionada. Dados corrompidos nunca quebram a aplicação.
export const STORAGE_PREFIX = "__PROJECT_NAME__:v1:";

export function safeParse<T>(raw: string | null, fallback: T, isValid: (v: unknown) => v is T): T {
  if (raw == null) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function loadItem<T>(key: string, fallback: T, isValid: (v: unknown) => v is T): T {
  if (typeof localStorage === "undefined") return fallback;
  return safeParse(localStorage.getItem(STORAGE_PREFIX + key), fallback, isValid);
}

export function saveItem<T>(key: string, value: T): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.error(`Não foi possível salvar "${key}" no armazenamento local.`, error);
  }
}

export function removeItem(key: string): void {
  if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_PREFIX + key);
}

export const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

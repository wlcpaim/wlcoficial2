/**
 * WLC.IA diagnostic logger.
 * Structured logs keep timestamps, module and event for easier bug triage.
 * Sensitive values are redacted before being emitted.
 */
export type WlcLogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
export type WlcLogEntry = {
  timestamp: string;
  level: WlcLogLevel;
  module: string;
  event: string;
  details?: unknown;
};

const SECRET_KEYS = /token|secret|password|authorization|api[-_]?key|cookie/i;
const MAX_DETAILS = 2_000;
const recent: WlcLogEntry[] = [];
const MAX_ENTRIES = 100;

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z_-]{20,}/g,
  /github_pat_[0-9A-Za-z_]{20,}/g,
  /\bgh[pousr]_[0-9A-Za-z]{20,}/g,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{16,}/gi,
  /(["']?(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|authorization)["']?\s*[=:]\s*["']?)[^\s,"'}]+/gi,
];

function scrubText(input: string): string {
  let value = input;
  for (const pattern of SECRET_PATTERNS) value = value.replace(pattern, (match, prefix) => `${prefix ?? ""}[REDACTED]`);
  return value.length > MAX_DETAILS ? value.slice(0, MAX_DETAILS) + "…" : value;
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth-limit]";
  if (typeof value === "string") return scrubText(value);
  if (value instanceof Error) return {
    name: scrubText(value.name),
    message: scrubText(value.message),
    ...(value.stack ? { stack: scrubText(value.stack) } : {}),
  };
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => scrub(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 40).map(([key, item]) => [
      key, SECRET_KEYS.test(key) ? "[REDACTED]" : scrub(item, depth + 1),
    ]));
  }
  return value;
}

function write(level: WlcLogLevel, module: string, event: string, details?: unknown) {
  const entry: WlcLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module: scrubText(module).slice(0, 80),
    event: scrubText(event).slice(0, 200),
    ...(details === undefined ? {} : { details: scrub(details) }),
  };
  recent.push(entry);
  if (recent.length > MAX_ENTRIES) recent.splice(0, recent.length - MAX_ENTRIES);
  const payload = `[WLC.IA][${entry.level}][${entry.module}] ${entry.event}`;
  const method = level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.info;
  method(payload, ...(entry.details === undefined ? [] : [entry.details]));
}

export const wlcLogger = {
  debug: (module: string, event: string, details?: unknown) => {
    if (import.meta.env?.DEV) write("DEBUG", module, event, details);
  },
  info: (module: string, event: string, details?: unknown) => write("INFO", module, event, details),
  warn: (module: string, event: string, details?: unknown) => write("WARN", module, event, details),
  error: (module: string, event: string, details?: unknown) => write("ERROR", module, event, details),
  getRecent: () => recent.slice(),
};

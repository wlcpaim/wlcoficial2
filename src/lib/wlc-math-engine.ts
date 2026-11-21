/** Deterministic calculator for common arithmetic. No eval/Function; supports a restricted grammar. */
export type CalculationResult = { expression: string; value: number; formatted: string };

const FUNCTIONS: Record<string, (x: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, abs: Math.abs, log: Math.log10, ln: Math.log, exp: Math.exp,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
};
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

type Token = { type: "number" | "name" | "operator" | "paren" | "comma"; value: string };
function tokenize(source: string): Token[] {
  const s = source.replace(/,/g, ".").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi");
  const out: Token[] = []; let i = 0;
  while (i < s.length) {
    if (/\s/.test(s[i]!)) { i++; continue; }
    const number = s.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) { out.push({ type: "number", value: number[0] }); i += number[0].length; continue; }
    const name = s.slice(i).match(/^[a-zA-Z]+/);
    if (name) { out.push({ type: "name", value: name[0].toLowerCase() }); i += name[0].length; continue; }
    const c = s[i]!;
    if ("+-*/^%".includes(c)) { out.push({ type: "operator", value: c }); i++; continue; }
    if (c === "(" || c === ")") { out.push({ type: "paren", value: c }); i++; continue; }
    if (c === ",") { out.push({ type: "comma", value: c }); i++; continue; }
    throw new Error(`Caractere não permitido: ${c}`);
  }
  return out;
}

export function calculateExpression(expression: string): CalculationResult {
  if (!expression.trim() || expression.length > 200) throw new Error("Informe uma expressão válida (até 200 caracteres).");
  const tokens = tokenize(expression); let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  const expect = (value: string) => { if (take()?.value !== value) throw new Error(`Esperado '${value}'.`); };
  function primary(): number {
    const t = take(); if (!t) throw new Error("Expressão incompleta.");
    if (t.type === "number") return Number(t.value);
    if (t.type === "operator" && (t.value === "+" || t.value === "-")) { const v = primary(); return t.value === "-" ? -v : v; }
    if (t.type === "paren" && t.value === "(") { const v = sum(); expect(")"); return v; }
    if (t.type === "name") {
      if (t.value in CONSTANTS) return CONSTANTS[t.value]!;
      if (!(t.value in FUNCTIONS)) throw new Error(`Função ou constante desconhecida: ${t.value}`);
      expect("("); const x = sum(); expect(")"); return FUNCTIONS[t.value]!(x);
    }
    throw new Error("Esperava número, função ou parênteses.");
  }
  function power(): number { let v = primary(); if (peek()?.value === "^") { take(); v = v ** power(); } return v; }
  function product(): number { let v = power(); while (["*", "/", "%"].includes(peek()?.value ?? "")) { const op = take()!.value; const r = power(); v = op === "*" ? v * r : op === "/" ? v / r : v % r; } return v; }
  function sum(): number { let v = product(); while (["+", "-"].includes(peek()?.value ?? "")) { const op = take()!.value; const r = product(); v = op === "+" ? v + r : v - r; } return v; }
  const value = sum();
  if (pos !== tokens.length) throw new Error(`Token inesperado: ${peek()?.value}`);
  if (!Number.isFinite(value)) throw new Error("O resultado não é um número finito (verifique divisão por zero ou domínio da função).");
  return { expression, value, formatted: new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: 12 }).format(value) };
}

// GitHub repository name rules (client + server). Returns an error message or null.
export function validateRepoName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return "Informe o nome do repositório.";
  if (name.length > 100) return "Use no máximo 100 caracteres.";
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return "Use apenas letras, números, ponto, hífen ou _ (sem espaços ou acentos).";
  if (name === "." || name === "..") return "Nome reservado pelo GitHub.";
  if (/\.git$/i.test(name)) return "O nome não pode terminar em .git.";
  return null;
}

/** Suggests a valid name from free text (e.g. "Meu App" -> "meu-app"). */
export function suggestRepoName(raw: string): string {
  return raw
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100);
}

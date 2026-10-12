/** Regras de rotas e redirecionamentos — sem dependências de servidor (testável). */

export type AppRole = "aluno" | "profissional" | "admin";

export const PROTECTED_PREFIXES = ["/aluno", "/profissional", "/admin"] as const;

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Área inicial de acordo com os papéis efetivos do usuário. */
export function homeForRoles(roles: readonly AppRole[], isActiveTrainer: boolean) {
  if (roles.includes("admin")) return "/admin/dashboard";
  if (roles.includes("profissional") && isActiveTrainer) return "/profissional/dashboard";
  return "/aluno/dashboard";
}

/**
 * Sanitiza o parâmetro "next" para evitar open redirect: aceita somente
 * caminhos internos absolutos ("/algo"), nunca "//host" ou URLs completas.
 */
export function safeNextPath(next: unknown, fallback = "/aluno/dashboard") {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  try {
    const url = new URL(next, "http://local.invalid");
    if (url.origin !== "http://local.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

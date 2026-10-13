import "server-only";
import { getViewer } from "@/lib/auth/dal";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Sessão obrigatória em toda action (nunca confiar só na interface). */
export async function requireUserId() {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Sessão expirada. Entre novamente.");
  return viewer.id;
}

/** Converte erros do Postgres (RLS, constraints, funções) em mensagens seguras. */
export function dbErrorMessage(error: unknown, fallback = "Não foi possível concluir a operação.") {
  const e = error as { code?: string; message?: string };
  if (e?.code === "42501" || e?.code === "P0001" || e?.code === "22023" || e?.code === "P0002") {
    // Mensagens escritas por nós nas funções/triggers do banco
    if (e.message && !/row-level security|permission denied/i.test(e.message)) return e.message;
    return "Você não tem permissão para esta ação.";
  }
  if (e?.code === "23505") return "Registro duplicado.";
  if (e?.code === "23514" || e?.code === "22P02") return "Dados inválidos.";
  console.error("[action]", error);
  return fallback;
}

/** Exige profissional aprovado e ativo (a RLS também exige). */
export async function requireTrainerId() {
  const viewer = await getViewer();
  if (!viewer?.isActiveTrainer) throw new Error("Acesso restrito a profissionais aprovados.");
  return viewer.id;
}

/** Exige administrador (as funções e políticas do banco também exigem). */
export async function requireAdminId() {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) throw new Error("Acesso restrito à administração.");
  return viewer.id;
}

export function fieldErrorsOf(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const i of error.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

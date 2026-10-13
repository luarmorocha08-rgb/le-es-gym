import "server-only";
import { headers } from "next/headers";
import { getPool } from "@/lib/db";

/*
 * Limite de tentativas para Server Actions sensíveis (login, cadastro, senha).
 * Contadores no Postgres (auth.rate_limits) → valem entre várias instâncias.
 * Limites por IP podem ser ampliados com RATE_LIMIT_IP_MULTIPLIER (ex.: testes
 * automatizados que criam muitas contas do mesmo IP); limites por e-mail não.
 */

export type Rule = { window: number; max: number };

export const RULES = {
  loginEmail: { window: 15 * 60, max: 8 },
  loginIp: { window: 15 * 60, max: 40 },
  signupIp: { window: 60 * 60, max: 10 },
  resetEmail: { window: 60 * 60, max: 3 },
  resetIp: { window: 60 * 60, max: 10 },
  newPasswordIp: { window: 15 * 60, max: 10 },
} satisfies Record<string, Rule>;

function ipMultiplier() {
  const n = Number(process.env.RATE_LIMIT_IP_MULTIPLIER ?? 1);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** IP do cliente informado pelo proxy da hospedagem (primeiro da cadeia). */
export async function clientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "desconhecido";
}

/** Retorna 0 se permitido ou os segundos até liberar. Sem banco, não limita. */
export async function consume(key: string, rule: Rule, scope: "ip" | "account" = "account") {
  const pool = getPool();
  if (!pool) return 0;
  const max = scope === "ip" ? rule.max * ipMultiplier() : rule.max;
  const { rows } = await pool.query<{ wait: number }>("select auth.consume_rate_limit($1, $2, $3) as wait", [key, rule.window, max]);
  return rows[0]?.wait ?? 0;
}

export async function resetLimit(key: string) {
  await getPool()?.query("select auth.reset_rate_limit($1)", [key]);
}

export function tooManyMessage(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return `Muitas tentativas. Aguarde ${minutes <= 1 ? "1 minuto" : `${minutes} minutos`} e tente novamente.`;
}

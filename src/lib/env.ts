/**
 * Leitura centralizada de configuração. Nenhuma destas variáveis é pública
 * (sem prefixo NEXT_PUBLIC_): só existem no servidor.
 */
export function getDatabaseUrl() {
  return process.env.DATABASE_URL || null;
}

/** Banco + segredo de sessão definidos → login e portais habilitados. */
export function isAuthConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * resend: envia de verdade · log: escreve no log do servidor (desenvolvimento
 * ou EMAIL_LOG_ONLY=1 em homologação/testes) · off: e-mail indisponível.
 */
export function emailMode(): "resend" | "log" | "off" {
  if (isEmailConfigured()) return "resend";
  if (process.env.NODE_ENV !== "production" || process.env.EMAIL_LOG_ONLY === "1") return "log";
  return "off";
}

export function siteUrl() {
  return (process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

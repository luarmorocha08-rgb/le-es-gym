import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { PostgresDialect } from "kysely";
import { actionEmail, sendMail } from "@/lib/email";
import { getAuthPool } from "@/lib/db";
import { isAuthConfigured, isEmailConfigured, siteUrl } from "@/lib/env";

function createAuth() {
  const emailEnabled = isEmailConfigured();
  return betterAuth({
    appName: "REVO TRAIN",
    baseURL: siteUrl(),
    secret: process.env.BETTER_AUTH_SECRET,
    // Tabelas de login no schema "auth" (sem acesso para os papéis de usuário)
    database: { dialect: new PostgresDialect({ pool: getAuthPool()! }), type: "postgres", schemaName: "auth" },
    user: { modelName: "users", deleteUser: { enabled: true } },
    advanced: {
      database: { generateId: "uuid" },
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 dias
      updateAge: 60 * 60 * 24,
    },
    // Rotas HTTP /api/auth/*: contadores no banco (valem entre instâncias).
    // As Server Actions de login/cadastro/senha usam src/lib/security/rate-limit.ts.
    rateLimit: { enabled: true, window: 60, max: 30, storage: "database" },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 72,
      // Só exige confirmação de e-mail quando há provedor de e-mail configurado.
      requireEmailVerification: emailEnabled,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await sendMail(
          actionEmail({
            to: user.email,
            subject: "Redefinir senha",
            intro: "Recebemos um pedido para redefinir a senha da sua conta. O link vale por 1 hora.",
            cta: "Criar nova senha",
            url,
          }),
        );
      },
    },
    emailVerification: {
      sendOnSignUp: emailEnabled,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendMail(
          actionEmail({
            to: user.email,
            subject: "Confirme seu e-mail",
            intro: "Falta pouco para entrar no bando. Confirme seu e-mail para ativar a conta.",
            cta: "Confirmar e-mail",
            url,
          }),
        );
      },
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;

declare global {
  var __revoAuth: Auth | undefined;
}

/** Instância do Better Auth, ou null se banco/segredo não estiverem configurados. */
export function getAuth(): Auth | null {
  if (!isAuthConfigured()) return null;
  globalThis.__revoAuth ??= createAuth();
  return globalThis.__revoAuth;
}

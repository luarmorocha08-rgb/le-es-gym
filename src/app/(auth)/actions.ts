"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/auth";
import { loadViewer } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/routes";
import { withUser } from "@/lib/db";
import { emailMode, isEmailConfigured } from "@/lib/env";
import {
  loginSchema,
  newPasswordSchema,
  resetRequestSchema,
  signupSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation/auth";

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

const NOT_CONFIGURED: FormState = {
  status: "error",
  message: "A autenticação ainda não foi configurada neste ambiente (banco de dados pendente).",
};

/** Traduz códigos do Better Auth sem expor detalhes internos. */
function authErrorMessage(error: unknown, fallback: string) {
  const code = error instanceof APIError ? String(error.body?.code ?? "") : "";
  const status = error instanceof APIError ? error.statusCode : 0;
  if (status === 429) return "Muitas tentativas. Aguarde um minuto e tente novamente.";
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "E-mail ou senha incorretos.";
    case "EMAIL_NOT_VERIFIED":
      return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Já existe uma conta com este e-mail.";
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
      return "A senha precisa ter entre 8 e 72 caracteres.";
    case "INVALID_TOKEN":
      return "Link inválido ou expirado. Solicite uma nova redefinição de senha.";
    default:
      if (!(error instanceof APIError)) console.error("[auth]", error);
      return fallback;
  }
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error), values };

  const auth = getAuth();
  if (!auth) return NOT_CONFIGURED;

  let userId: string;
  let email: string;
  try {
    const result = await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
    userId = result.user.id;
    email = result.user.email;
  } catch (error) {
    return { status: "error", message: authErrorMessage(error, "Não foi possível entrar. Tente novamente."), values };
  }

  const viewer = await withUser(userId, (db) => loadViewer(db, userId, email));
  const requested = formData.get("next");
  redirect(requested ? safeNextPath(requested, viewer.home) : viewer.home);
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const values = {
    fullName: String(raw.fullName ?? ""),
    email: String(raw.email ?? ""),
    cref: String(raw.cref ?? ""),
    wantsProfessional: raw.wantsProfessional ? "on" : "",
  };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error), values };

  const auth = getAuth();
  if (!auth) return NOT_CONFIGURED;

  const { fullName, email, password, wantsProfessional, cref } = parsed.data;
  let userId: string;
  try {
    const result = await auth.api.signUpEmail({
      body: { name: fullName, email, password, callbackURL: "/aluno/dashboard" },
      headers: await headers(),
    });
    userId = result.user.id;
  } catch (error) {
    return { status: "error", message: authErrorMessage(error, "Não foi possível criar sua conta."), values };
  }

  // O trigger do banco criou perfil + papel "aluno". Os complementos são
  // gravados com as permissões do próprio usuário (RLS): o cadastro
  // profissional só pode nascer "pendente".
  await withUser(userId, async (db) => {
    await db.query("update public.profiles set terms_accepted_at = now() where id = $1", [userId]);
    if (wantsProfessional) {
      await db.query(
        "insert into public.professional_profiles (user_id, status, cref) values ($1, 'pendente', $2)",
        [userId, cref || null],
      );
    }
  });

  if (isEmailConfigured()) {
    return {
      status: "success",
      message: `Enviamos um link de confirmação para ${email}. Abra seu e-mail para ativar a conta.`,
    };
  }
  redirect(wantsProfessional ? "/acesso-negado?motivo=profissional-pendente" : "/aluno/dashboard");
}

export async function logout() {
  const auth = getAuth();
  if (auth) {
    try {
      await auth.api.signOut({ headers: await headers() });
    } catch {
      // sessão já expirada: segue para o login
    }
  }
  redirect("/login");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const auth = getAuth();
  if (!auth) return NOT_CONFIGURED;
  if (emailMode() === "off") {
    return { status: "error", message: "A recuperação por e-mail ainda não foi configurada. Fale com a academia." };
  }

  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: "/redefinir-senha" },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 429) {
      return { status: "error", message: authErrorMessage(error, "") };
    }
    console.error("[auth] requestPasswordReset", error);
  }
  // Resposta idêntica exista ou não a conta (evita enumeração de e-mails).
  return {
    status: "success",
    message: "Se houver uma conta com este e-mail, você receberá um link para redefinir a senha.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };
  const token = String(formData.get("token") ?? "");
  if (!token) return { status: "error", message: "Link inválido ou expirado. Solicite uma nova redefinição de senha." };

  const auth = getAuth();
  if (!auth) return NOT_CONFIGURED;

  try {
    await auth.api.resetPassword({ body: { newPassword: parsed.data.password, token }, headers: await headers() });
  } catch (error) {
    return { status: "error", message: authErrorMessage(error, "Não foi possível alterar a senha.") };
  }
  redirect("/login?senha=alterada");
}

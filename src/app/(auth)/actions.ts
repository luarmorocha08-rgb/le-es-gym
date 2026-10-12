"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer, loadViewer } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";
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
  message: "A autenticação ainda não foi configurada neste ambiente (Supabase pendente).",
};

async function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Traduz mensagens comuns do Supabase Auth sem expor detalhes internos. */
function authErrorMessage(code: string | undefined, fallback: string) {
  switch (code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
    case "user_already_exists":
    case "email_exists":
      return "Já existe uma conta com este e-mail.";
    case "weak_password":
      return "Senha fraca. Use pelo menos 8 caracteres com letras e números.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    case "same_password":
      return "A nova senha precisa ser diferente da atual.";
    default:
      return fallback;
  }
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error), values };

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { status: "error", message: authErrorMessage(error?.code, "Não foi possível entrar. Tente novamente."), values };
  }

  const viewer = await loadViewer(supabase, data.user.id, data.user.email ?? null);
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

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { fullName, email, password, wantsProfessional, cref } = parsed.data;
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/aluno/dashboard`,
      // Metadados usados apenas para criar o perfil. O papel NUNCA vem daqui:
      // "wants_professional" cria um cadastro pendente de aprovação do admin.
      data: {
        full_name: fullName,
        terms_accepted: "true",
        wants_professional: wantsProfessional ? "true" : "false",
        cref: wantsProfessional ? cref : "",
      },
    },
  });

  if (error) {
    return { status: "error", message: authErrorMessage(error.code, "Não foi possível criar sua conta."), values };
  }

  // Com confirmação de e-mail ativa, não há sessão até o usuário confirmar.
  if (!data.session) {
    return {
      status: "success",
      message: `Enviamos um link de confirmação para ${email}. Abra seu e-mail para ativar a conta.`,
    };
  }
  redirect(wantsProfessional ? "/acesso-negado?motivo=profissional-pendente" : "/aluno/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/redefinir-senha`,
  });
  if (error && error.code?.startsWith("over_")) {
    return { status: "error", message: authErrorMessage(error.code, "") };
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

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const viewer = await getViewer();
  if (!viewer) {
    return { status: "error", message: "Link expirado. Solicite uma nova redefinição de senha." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error.code, "Não foi possível alterar a senha.") };
  redirect(viewer.home);
}

import { z } from "zod";

const email = z
  .string({ error: "Informe seu e-mail." })
  .trim()
  .toLowerCase()
  .min(1, "Informe seu e-mail.")
  .max(254, "E-mail muito longo.")
  .pipe(z.email({ error: "E-mail inválido." }));

export const passwordRules = z
  .string({ error: "Informe uma senha." })
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.")
  .regex(/[A-Za-z]/, "Inclua pelo menos uma letra.")
  .regex(/[0-9]/, "Inclua pelo menos um número.");

/** Checkbox de formulário: ausente = false; "on"/"true" = true. */
const checkbox = z
  .string()
  .nullish()
  .transform((v) => v === "on" || v === "true");

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Informe sua senha." }).min(1, "Informe sua senha.").max(72),
});

export const signupSchema = z
  .object({
    fullName: z
      .string({ error: "Informe seu nome." })
      .trim()
      .min(2, "Informe seu nome completo.")
      .max(120, "Nome muito longo.")
      .regex(/^[\p{L}\p{M}' .-]+$/u, "Use apenas letras no nome."),
    email,
    password: passwordRules,
    wantsProfessional: checkbox,
    cref: z.string().trim().max(30, "CREF muito longo.").optional().or(z.literal("")),
    terms: checkbox,
  })
  .superRefine((data, ctx) => {
    if (!data.terms) {
      ctx.addIssue({ code: "custom", path: ["terms"], message: "É preciso aceitar os termos e a política de privacidade." });
    }
    if (data.wantsProfessional && !data.cref) {
      ctx.addIssue({ code: "custom", path: ["cref"], message: "Informe seu registro no CREF para análise." });
    }
  });

export const resetRequestSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password: passwordRules, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não coincidem." });

export type FieldErrors = Partial<Record<string, string>>;

/** Converte erros do Zod em um mapa campo → primeira mensagem. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

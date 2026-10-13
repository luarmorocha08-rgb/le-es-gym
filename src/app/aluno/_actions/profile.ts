"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth/auth";
import { withUser } from "@/lib/db";
import { passwordRules } from "@/lib/validation/auth";
import { GOALS, LEVELS } from "@/lib/workout/constants";
import { dbErrorMessage, requireUserId } from "@/lib/action-utils";

export type ProfileFormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string> };

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of error.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

const blank = (v: unknown) => (v === "" || v == null ? null : v);

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome.").max(120).regex(/^[\p{L}\p{M}' .-]+$/u, "Use apenas letras no nome."),
  phone: z.preprocess(blank, z.string().trim().max(30).regex(/^[0-9()+\s-]{8,30}$/, "Telefone inválido.").nullable()),
  birthDate: z.preprocess(blank, z.iso.date({ error: "Data inválida." }).nullable()),
  goal: z.preprocess(blank, z.enum(GOALS).nullable()),
  level: z.preprocess(blank, z.enum(LEVELS).nullable()),
  daysPerWeek: z.preprocess(blank, z.coerce.number().int().min(1).max(7).nullable()),
  sessionMinutes: z.preprocess(blank, z.coerce.number().int().min(15).max(240).nullable()),
});

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Revise os campos destacados.", fieldErrors: fieldErrors(parsed.error) };
  const p = parsed.data;
  if (p.birthDate && p.birthDate > new Date().toISOString().slice(0, 10)) {
    return { fieldErrors: { birthDate: "Data inválida." } };
  }
  try {
    await withUser(userId, (db) =>
      db.query(
        `update public.profiles set full_name = $2, phone = $3, birth_date = $4, goal = $5, experience_level = $6,
                days_per_week = $7, session_minutes = $8, onboarding_completed_at = coalesce(onboarding_completed_at, now())
          where id = $1`,
        [userId, p.fullName, p.phone, p.birthDate, p.goal, p.level, p.daysPerWeek, p.sessionMinutes],
      ),
    );
    await getAuth()?.api.updateUser({ body: { name: p.fullName }, headers: await headers() });
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível salvar o perfil.") };
  }
  revalidatePath("/aluno", "layout");
  return { ok: true, message: "Perfil atualizado." };
}

const list = (v: unknown) =>
  typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20) : [];

const healthSchema = z.object({
  consent: z.string().nullish().transform((v) => v === "on"),
  limitations: z.string().trim().max(2000).optional().transform((v) => v || null),
  exercisesToAvoid: z.string().trim().max(1000).optional().transform((v) => v || null),
  preferences: z.string().trim().max(1000).optional().transform((v) => v || null),
  equipment: z.preprocess(list, z.array(z.string().max(40))),
  priorityMuscles: z.preprocess(list, z.array(z.string().max(40))),
});

/** Grava dados de saúde somente com consentimento explícito (também exigido pela RLS). */
export async function updateHealth(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const userId = await requireUserId();
  const parsed = healthSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Revise os campos.", fieldErrors: fieldErrors(parsed.error) };
  const h = parsed.data;
  if (!h.consent) return { fieldErrors: { consent: "Para salvar dados de saúde é preciso autorizar o tratamento." } };
  try {
    await withUser(userId, async (db) => {
      await db.query(
        "update public.profiles set health_data_consent_at = coalesce(health_data_consent_at, now()) where id = $1",
        [userId],
      );
      await db.query(
        `insert into public.student_health_info (student_id, limitations, exercises_to_avoid, preferences, available_equipment, priority_muscles)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (student_id) do update set limitations = excluded.limitations, exercises_to_avoid = excluded.exercises_to_avoid,
           preferences = excluded.preferences, available_equipment = excluded.available_equipment, priority_muscles = excluded.priority_muscles`,
        [userId, h.limitations, h.exercisesToAvoid, h.preferences, h.equipment, h.priorityMuscles],
      );
    });
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível salvar.") };
  }
  revalidatePath("/aluno/perfil");
  return { ok: true, message: "Informações de saúde salvas." };
}

/** Revoga o consentimento de saúde: o banco apaga as informações declaradas. */
export async function revokeHealthConsent() {
  const userId = await requireUserId();
  await withUser(userId, (db) => db.query("update public.profiles set health_data_consent_at = null where id = $1", [userId]));
  revalidatePath("/aluno", "layout");
}

export async function setAiConsent(enabled: boolean) {
  const userId = await requireUserId();
  await withUser(userId, (db) =>
    db.query(
      `update public.profiles set ai_consent_at = case when $2 then coalesce(ai_consent_at, now()) end where id = $1`,
      [userId, enabled],
    ),
  );
  revalidatePath("/aluno", "layout");
}

const passwordSchema = z
  .object({ current: z.string().min(1, "Informe a senha atual."), password: passwordRules, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não coincidem." });

export async function changePassword(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  await requireUserId();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    await getAuth()!.api.changePassword({
      body: { currentPassword: parsed.data.current, newPassword: parsed.data.password, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && String(error.body?.code) === "INVALID_PASSWORD") {
      return { fieldErrors: { current: "Senha atual incorreta." } };
    }
    return { message: "Não foi possível alterar a senha." };
  }
  return { ok: true, message: "Senha alterada. Outras sessões foram encerradas." };
}

const deleteSchema = z.object({
  password: z.string().min(1, "Informe sua senha."),
  confirmation: z.literal("EXCLUIR", { error: 'Digite EXCLUIR para confirmar.' }),
});

/** Exclusão da conta (LGPD art. 18, VI): remove o usuário e, em cascata, todos os seus dados. */
export async function deleteAccount(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  await requireUserId();
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    await getAuth()!.api.deleteUser({ body: { password: parsed.data.password }, headers: await headers() });
  } catch (error) {
    if (error instanceof APIError && String(error.body?.code) === "INVALID_PASSWORD") {
      return { fieldErrors: { password: "Senha incorreta." } };
    }
    console.error("[deleteAccount]", error);
    return { message: "Não foi possível excluir a conta. Tente novamente ou fale com a academia." };
  }
  redirect("/?conta=excluida");
}

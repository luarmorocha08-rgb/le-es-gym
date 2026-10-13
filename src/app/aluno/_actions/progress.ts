"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withUser } from "@/lib/db";
import { dbErrorMessage, requireUserId, type ActionResult } from "./common";

const optNum = (min: number, max: number) =>
  z
    .preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(min, "Valor inválido.").max(max, "Valor inválido.").nullable())
    .optional()
    .transform((v) => v ?? null);

const progressSchema = z.object({
  recordedOn: z.iso.date({ error: "Data inválida." }),
  weightKg: optNum(20, 400),
  bodyFatPct: optNum(2, 70),
  cintura_cm: optNum(20, 300),
  quadril_cm: optNum(20, 300),
  peito_cm: optNum(20, 300),
  braco_cm: optNum(10, 120),
  coxa_cm: optNum(10, 150),
  notes: z.string().trim().max(500).optional().transform((v) => v || null),
  share: z.string().nullish().transform((v) => v === "on"),
});

export type ProgressFormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string> };

/** Medidas corporais são dados sensíveis: exigem o consentimento de saúde. */
export async function addProgressRecord(_prev: ProgressFormState, formData: FormData): Promise<ProgressFormState> {
  const userId = await requireUserId();
  const parsed = progressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { message: "Revise os campos destacados.", fieldErrors };
  }
  const p = parsed.data;
  const measurements = Object.fromEntries(
    (["cintura_cm", "quadril_cm", "peito_cm", "braco_cm", "coxa_cm"] as const).filter((k) => p[k] !== null).map((k) => [k, p[k]]),
  );
  if (p.weightKg === null && p.bodyFatPct === null && Object.keys(measurements).length === 0) {
    return { message: "Informe pelo menos uma medida." };
  }
  if (p.recordedOn > new Date().toISOString().slice(0, 10)) return { fieldErrors: { recordedOn: "A data não pode estar no futuro." } };
  try {
    await withUser(userId, async (db) => {
      const consent = await db.one<{ ok: boolean }>(
        "select health_data_consent_at is not null as ok from public.profiles where id = $1",
        [userId],
      );
      if (!consent?.ok) {
        throw Object.assign(new Error("Para registrar medidas, autorize o uso de dados de saúde no seu perfil."), { code: "22023" });
      }
      await db.query(
        `insert into public.progress_records (student_id, recorded_on, weight_kg, body_fat_pct, measurements, notes, share_with_trainer)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, p.recordedOn, p.weightKg, p.bodyFatPct, JSON.stringify(measurements), p.notes, p.share],
      );
    });
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível salvar o registro.") };
  }
  revalidatePath("/aluno/evolucao");
  return { ok: true };
}

export async function deleteProgressRecord(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await withUser(userId, (db) => db.query("delete from public.progress_records where id = $1 and student_id = $2", [id, userId]));
  revalidatePath("/aluno/evolucao");
  return { ok: true };
}

const goalSchema = z.object({
  title: z.string().trim().min(2, "Descreva a meta.").max(120),
  targetValue: optNum(0, 100000),
  unit: z.string().trim().max(16).optional().transform((v) => v || null),
  dueOn: z.preprocess((v) => (v === "" ? undefined : v), z.iso.date().optional()).transform((v) => v ?? null),
});

export async function addGoal(_prev: ProgressFormState, formData: FormData): Promise<ProgressFormState> {
  const userId = await requireUserId();
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors };
  }
  const g = parsed.data;
  try {
    await withUser(userId, (db) =>
      db.query(
        "insert into public.personal_goals (student_id, title, target_value, unit, due_on) values ($1, $2, $3, $4, $5)",
        [userId, g.title, g.targetValue, g.unit, g.dueOn],
      ),
    );
  } catch (error) {
    return { message: dbErrorMessage(error) };
  }
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

export async function toggleGoal(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await withUser(userId, (db) =>
    db.query(
      "update public.personal_goals set achieved_at = case when achieved_at is null then now() end where id = $1 and student_id = $2",
      [id, userId],
    ),
  );
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await withUser(userId, (db) => db.query("delete from public.personal_goals where id = $1 and student_id = $2", [id, userId]));
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

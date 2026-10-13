"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withUser } from "@/lib/db";
import { finishSessionSchema, setLogSchema } from "@/lib/validation/workout";
import { dbErrorMessage, requireUserId, type ActionResult } from "./common";

/** Inicia (ou retoma) o treino de um dia da ficha e abre o modo treino. */
export async function startSession(planId: string, dayId: string) {
  const userId = await requireUserId();
  let sessionId: string;
  try {
    sessionId = await withUser(userId, async (db) => {
      const open = await db.one<{ id: string }>(
        "select id from public.workout_sessions where student_id = $1 and status = 'em_andamento'",
        [userId],
      );
      if (open) return open.id;
      const day = await db.one<{ label: string }>(
        "select label from public.workout_days where id = $1 and plan_id = $2",
        [dayId, planId],
      );
      if (!day) throw Object.assign(new Error("Dia de treino não encontrado."), { code: "P0002" });
      const row = await db.one<{ id: string }>(
        `insert into public.workout_sessions (student_id, plan_id, day_id, day_label)
         values ($1, $2, $3, $4) returning id`,
        [userId, planId, dayId, day.label],
      );
      return row!.id;
    });
  } catch (error) {
    throw new Error(dbErrorMessage(error, "Não foi possível iniciar o treino."));
  }
  revalidatePath("/aluno", "layout");
  redirect(`/aluno/treino/${sessionId}`);
}

export type LoggedSet = { id: string; workout_exercise_id: string; set_number: number; reps: number; load_kg: number | null };

/** Registra (ou corrige) uma série. Persistida na hora: nada se perde se o app fechar. */
export async function logSet(input: unknown): Promise<ActionResult<LoggedSet>> {
  const userId = await requireUserId();
  const parsed = setLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const s = parsed.data;
  try {
    const row = await withUser(userId, (db) =>
      db.one<LoggedSet & { load_kg: string | null }>(
        `insert into public.completed_sets (session_id, student_id, exercise_id, workout_exercise_id, set_number, reps, load_kg)
         select $1, $2, we.exercise_id, we.id, $4, $5, $6
           from public.workout_exercises we
           join public.workout_sessions ws on ws.id = $1 and ws.day_id = we.day_id
          where we.id = $3
         on conflict (session_id, workout_exercise_id, set_number)
         do update set reps = excluded.reps, load_kg = excluded.load_kg, completed_at = now()
         returning id, workout_exercise_id, set_number, reps, load_kg`,
        [s.sessionId, userId, s.workoutExerciseId, s.setNumber, s.reps, s.loadKg],
      ),
    );
    if (!row) return { ok: false, message: "Exercício não pertence a este treino." };
    return { ok: true, data: { ...row, load_kg: row.load_kg === null ? null : Number(row.load_kg) } };
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error, "Não foi possível registrar a série.") };
  }
}

export async function removeSet(setId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  try {
    await withUser(userId, (db) =>
      db.query(
        `delete from public.completed_sets c using public.workout_sessions s
          where c.id = $1 and c.student_id = $2 and s.id = c.session_id and s.status = 'em_andamento'`,
        [setId, userId],
      ),
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error) };
  }
}

export async function finishSession(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = finishSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };
  const { sessionId, perceivedEffort, feedback } = parsed.data;
  try {
    await withUser(userId, async (db) => {
      const done = await db.one<{ n: number }>(
        "select count(*)::int as n from public.completed_sets where session_id = $1",
        [sessionId],
      );
      if (!done?.n) throw Object.assign(new Error("Registre pelo menos uma série antes de concluir."), { code: "22023" });
      await db.query(
        `update public.workout_sessions set status = 'concluida', finished_at = now(), perceived_effort = $3, feedback = $4
          where id = $1 and student_id = $2 and status = 'em_andamento'`,
        [sessionId, userId, perceivedEffort, feedback],
      );
    });
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error, "Não foi possível concluir o treino.") };
  }
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

export async function abandonSession(sessionId: string) {
  const userId = await requireUserId();
  await withUser(userId, (db) =>
    db.query(
      `update public.workout_sessions set status = 'abandonada', finished_at = now()
        where id = $1 and student_id = $2 and status = 'em_andamento'`,
      [sessionId, userId],
    ),
  );
  revalidatePath("/aluno", "layout");
  redirect("/aluno/dashboard");
}

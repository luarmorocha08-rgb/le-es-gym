import "server-only";
import type { Db } from "@/lib/db";
import type { PlanData } from "@/lib/validation/workout";

/** Grava dias e exercícios de uma ficha (dentro da transação/RLS recebida). */
export async function insertPlanStructure(db: Db, planId: string, days: PlanData["days"]) {
  for (const [position, day] of days.entries()) {
    const row = await db.one<{ id: string }>(
      "insert into public.workout_days (plan_id, position, label, name, notes) values ($1, $2, $3, $4, $5) returning id",
      [planId, position, day.label, day.name, day.notes],
    );
    for (const [i, ex] of day.exercises.entries()) {
      await db.query(
        `insert into public.workout_exercises (day_id, exercise_id, position, sets, reps, rest_seconds, target_load_kg, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [row!.id, ex.exerciseId, i, ex.sets, ex.reps, ex.restSeconds, ex.targetLoadKg, ex.notes],
      );
    }
  }
}

/** Copia a estrutura (dias + exercícios) de uma ficha visível para outra. */
export async function copyPlanStructure(db: Db, fromPlanId: string, toPlanId: string) {
  const days = await db.query<{ id: string; position: number; label: string; name: string; notes: string | null }>(
    "select id, position, label, name, notes from public.workout_days where plan_id = $1 order by position",
    [fromPlanId],
  );
  for (const d of days) {
    const nd = await db.one<{ id: string }>(
      "insert into public.workout_days (plan_id, position, label, name, notes) values ($1, $2, $3, $4, $5) returning id",
      [toPlanId, d.position, d.label, d.name, d.notes],
    );
    await db.query(
      `insert into public.workout_exercises (day_id, exercise_id, position, sets, reps, rest_seconds, target_load_kg, notes)
       select $2, exercise_id, position, sets, reps, rest_seconds, target_load_kg, notes
         from public.workout_exercises where day_id = $1`,
      [d.id, nd!.id],
    );
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withUser, type Db } from "@/lib/db";
import { issuesByPath, planSchema, type PlanInput } from "@/lib/validation/workout";
import { dbErrorMessage, requireUserId, type ActionResult } from "./common";

async function insertStructure(db: Db, planId: string, days: ReturnType<typeof planSchema.parse>["days"]) {
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

/** Cria ou atualiza uma ficha montada pelo aluno (estrutura completa numa transação). */
export async function savePlan(planId: string | null, input: PlanInput): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Revise os campos destacados.", fieldErrors: issuesByPath(parsed.error) };
  }
  const plan = parsed.data;

  try {
    const id = await withUser(userId, async (db) => {
      let id = planId;
      if (id) {
        const current = await db.one<{ author_id: string; source: string; status: string }>(
          "select author_id, source::text, status::text from public.workout_plans where id = $1 and student_id = $2",
          [id, userId],
        );
        if (!current || current.author_id !== userId || current.source === "profissional" || current.status === "publicado") {
          throw Object.assign(new Error("Esta ficha não pode ser editada por você."), { code: "42501" });
        }
        await db.query(
          `update public.workout_plans set title = $2, split_type = $3, goal = $4, description = $5,
                  status = case when status = 'rascunho' then 'ativo'::public.plan_status else status end
            where id = $1`,
          [id, plan.title, plan.splitType, plan.goal, plan.description],
        );
        const open = await db.one(
          "select 1 from public.workout_sessions where student_id = $1 and plan_id = $2 and status = 'em_andamento'",
          [userId, id],
        );
        if (open) {
          throw Object.assign(new Error("Conclua ou encerre o treino em andamento desta ficha antes de editá-la."), { code: "22023" });
        }
        await db.query("delete from public.workout_days where plan_id = $1", [id]);
      } else {
        const row = await db.one<{ id: string }>(
          `insert into public.workout_plans (student_id, author_id, source, status, title, split_type, goal, description)
           values ($1, $1, 'aluno', 'ativo', $2, $3, $4, $5) returning id`,
          [userId, plan.title, plan.splitType, plan.goal, plan.description],
        );
        id = row!.id;
      }
      await insertStructure(db, id, plan.days);
      if (plan.makeCurrent) {
        await db.query("update public.profiles set current_plan_id = $2 where id = $1", [userId, id]);
      }
      return id;
    });
    revalidatePath("/aluno", "layout");
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error, "Não foi possível salvar o treino.") };
  }
}

async function simple(planId: string, sql: string, params: unknown[] = []): Promise<ActionResult> {
  const userId = await requireUserId();
  try {
    await withUser(userId, (db) => db.query(sql, [planId, userId, ...params]));
    revalidatePath("/aluno", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error) };
  }
}

export async function setCurrentPlan(planId: string) {
  return simple(
    planId,
    `update public.profiles set current_plan_id = $1 where id = $2
       and exists (select 1 from public.workout_plans where id = $1 and student_id = $2 and status in ('ativo', 'publicado'))`,
  );
}

export async function archivePlan(planId: string) {
  return simple(
    planId,
    `with p as (update public.workout_plans set status = 'arquivado' where id = $1 and student_id = $2 returning id)
     update public.profiles set current_plan_id = null where id = $2 and current_plan_id in (select id from p)`,
  );
}

export async function restorePlan(planId: string) {
  return simple(
    planId,
    "update public.workout_plans set status = 'ativo' where id = $1 and author_id = $2 and source <> 'profissional' and status = 'arquivado'",
  );
}

export async function deletePlan(planId: string) {
  const result = await simple(
    planId,
    "delete from public.workout_plans where id = $1 and author_id = $2 and source <> 'profissional'",
  );
  if (result.ok) redirect("/aluno/meus-treinos");
  return result;
}

/** Copia qualquer ficha visível (inclusive prescrição) como ficha própria editável. */
export async function duplicatePlan(planId: string) {
  const userId = await requireUserId();
  let newId: string;
  try {
    newId = await withUser(userId, async (db) => {
      const row = await db.one<{ id: string }>(
        `insert into public.workout_plans (student_id, author_id, source, status, title, split_type, goal, description)
         select $2, $2, 'aluno', 'ativo', left('Cópia de ' || title, 120), split_type, goal, description
           from public.workout_plans where id = $1 and student_id = $2 returning id`,
        [planId, userId],
      );
      if (!row) throw Object.assign(new Error("Ficha não encontrada."), { code: "P0002" });
      const days = await db.query<{ id: string; position: number; label: string; name: string; notes: string | null }>(
        "select id, position, label, name, notes from public.workout_days where plan_id = $1 order by position",
        [planId],
      );
      for (const d of days) {
        const nd = await db.one<{ id: string }>(
          "insert into public.workout_days (plan_id, position, label, name, notes) values ($1, $2, $3, $4, $5) returning id",
          [row.id, d.position, d.label, d.name, d.notes],
        );
        await db.query(
          `insert into public.workout_exercises (day_id, exercise_id, position, sets, reps, rest_seconds, target_load_kg, notes)
           select $2, exercise_id, position, sets, reps, rest_seconds, target_load_kg, notes
             from public.workout_exercises where day_id = $1`,
          [d.id, nd!.id],
        );
      }
      return row.id;
    });
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error) } as const;
  }
  revalidatePath("/aluno", "layout");
  redirect(`/aluno/meus-treinos/${newId}/editar`);
}

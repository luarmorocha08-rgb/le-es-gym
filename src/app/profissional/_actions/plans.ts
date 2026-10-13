"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dbErrorMessage, requireTrainerId, type ActionResult } from "@/lib/action-utils";
import { withUser, type Db } from "@/lib/db";
import { issuesByPath, planSchema, type PlanInput } from "@/lib/validation/workout";
import { copyPlanStructure, insertPlanStructure } from "@/lib/workout/plan-writer";

export type TrainerPlanContext = {
  planId?: string | null;
  studentId?: string | null;
  requestId?: string | null;
  isTemplate?: boolean;
  /** Rascunho criado a partir de uma sugestão de IA (fica marcado como tal) */
  aiGenerationId?: string | null;
};

const uuid = z.uuid();
const err = (message: string, code = "22023") => Object.assign(new Error(message), { code });

/** Ao começar a elaborar para uma solicitação, avança o status dela. */
async function advanceRequest(db: Db, requestId: string, trainerId: string) {
  const r = await db.one<{ status: string }>(
    "select status::text from public.workout_requests where id = $1 and trainer_id = $2",
    [requestId, trainerId],
  );
  if (!r) throw err("Solicitação não encontrada.", "P0002");
  if (r.status === "aguardando_profissional") {
    await db.query("select public.transition_request($1, 'em_analise', null)", [requestId]);
    await db.query("select public.transition_request($1, 'em_elaboracao', null)", [requestId]);
  } else if (r.status === "em_analise" || r.status === "ajuste_solicitado") {
    await db.query("select public.transition_request($1, 'em_elaboracao', null)", [requestId]);
  } else if (r.status !== "em_elaboracao") {
    throw err("Esta solicitação não está aberta para elaboração.");
  }
}

/**
 * Cria ou atualiza um rascunho do profissional (para um aluno vinculado ou
 * como modelo). Nunca publica: a publicação é uma ação separada e explícita.
 */
export async function saveTrainerPlan(ctx: TrainerPlanContext, input: PlanInput): Promise<ActionResult<{ id: string }>> {
  const trainerId = await requireTrainerId();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revise os campos destacados.", fieldErrors: issuesByPath(parsed.error) };
  const plan = parsed.data;
  for (const id of [ctx.planId, ctx.studentId, ctx.requestId, ctx.aiGenerationId]) {
    if (id && !uuid.safeParse(id).success) return { ok: false, message: "Parâmetros inválidos." };
  }

  try {
    const id = await withUser(trainerId, async (db) => {
      if (ctx.planId) {
        const current = await db.one<{ author_id: string; status: string }>(
          "select author_id, status::text from public.workout_plans where id = $1",
          [ctx.planId],
        );
        if (!current || current.author_id !== trainerId) throw err("Ficha não encontrada.", "P0002");
        if (current.status === "publicado" || current.status === "arquivado") {
          throw err("Fichas publicadas não são editadas: crie uma nova versão.");
        }
        await db.query(
          "update public.workout_plans set title = $2, split_type = $3, goal = $4, description = $5 where id = $1",
          [ctx.planId, plan.title, plan.splitType, plan.goal, plan.description],
        );
        await db.query("delete from public.workout_days where plan_id = $1", [ctx.planId]);
        await insertPlanStructure(db, ctx.planId, plan.days);
        return ctx.planId;
      }

      if (!ctx.isTemplate && !ctx.studentId) throw err("Escolha o aluno.");
      if (ctx.requestId) await advanceRequest(db, ctx.requestId, trainerId);
      const row = await db.one<{ id: string }>(
        `insert into public.workout_plans (student_id, author_id, source, status, is_template, title, split_type, goal, description, request_id, ai_generation_id)
         values ($1, $2, $9, 'rascunho', $3, $4, $5, $6, $7, $8, $10) returning id`,
        [
          ctx.isTemplate ? null : ctx.studentId,
          trainerId,
          Boolean(ctx.isTemplate),
          plan.title,
          plan.splitType,
          plan.goal,
          plan.description,
          ctx.requestId ?? null,
          ctx.aiGenerationId ? "ia" : "profissional",
          ctx.aiGenerationId ?? null,
        ],
      );
      await insertPlanStructure(db, row!.id, plan.days);
      return row!.id;
    });
    revalidatePath("/profissional", "layout");
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error, "Não foi possível salvar a ficha.") };
  }
}

const publishSchema = z.object({ planId: z.uuid(), note: z.string().trim().max(500).optional().transform((v) => v || null) });

export type PublishState = { ok?: boolean; message?: string };

/** Publicação explícita: gera versão imutável, notifica o aluno e audita. */
export async function publishPlan(_prev: PublishState, formData: FormData): Promise<PublishState> {
  const trainerId = await requireTrainerId();
  const parsed = publishSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Dados inválidos." };
  try {
    await withUser(trainerId, (db) => db.query("select public.publish_workout_plan($1, $2)", [parsed.data.planId, parsed.data.note]));
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível publicar.") };
  }
  revalidatePath("/profissional", "layout");
  return { ok: true, message: "Ficha publicada. O aluno já pode vê-la e foi notificado." };
}

async function copyAs(
  trainerId: string,
  sourceId: string,
  target: { studentId: string | null; isTemplate: boolean; basedOn?: boolean; titlePrefix?: string; requestId?: string | null },
) {
  return withUser(trainerId, async (db) => {
    const src = await db.one<{ id: string; title: string; student_id: string | null; request_id: string | null }>(
      "select id, title, student_id, request_id from public.workout_plans where id = $1",
      [sourceId],
    );
    if (!src) throw err("Ficha não encontrada.", "P0002");
    const row = await db.one<{ id: string }>(
      `insert into public.workout_plans (student_id, author_id, source, status, is_template, title, split_type, goal, description,
                                         progression_notes, request_id, based_on_plan_id)
       select $2, $3, 'profissional', 'rascunho', $4, left(coalesce($5, '') || title, 120), split_type, goal, description,
              progression_notes, $6, $7
         from public.workout_plans where id = $1 returning id`,
      [
        sourceId,
        target.isTemplate ? null : target.studentId,
        trainerId,
        target.isTemplate,
        target.titlePrefix ?? null,
        target.requestId ?? (target.basedOn ? src.request_id : null),
        target.basedOn ? sourceId : null,
      ],
    );
    await copyPlanStructure(db, sourceId, row!.id);
    return row!.id;
  });
}

/** Ficha publicada → nova versão em rascunho (a atual segue valendo até publicar). */
export async function createNewVersion(planId: string) {
  const trainerId = await requireTrainerId();
  let id: string;
  try {
    const src = await withUser(trainerId, (db) =>
      db.one<{ student_id: string | null; status: string }>("select student_id, status::text from public.workout_plans where id = $1", [planId]),
    );
    if (!src?.student_id) return { ok: false, message: "Ficha não encontrada." } as const;
    id = await copyAs(trainerId, planId, { studentId: src.student_id, isTemplate: false, basedOn: true });
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error) } as const;
  }
  revalidatePath("/profissional", "layout");
  redirect(`/profissional/fichas/${id}/editar`);
}

export async function saveAsTemplate(planId: string) {
  const trainerId = await requireTrainerId();
  let id: string;
  try {
    id = await copyAs(trainerId, planId, { studentId: null, isTemplate: true, titlePrefix: "Modelo — " });
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error) } as const;
  }
  revalidatePath("/profissional", "layout");
  redirect(`/profissional/fichas/${id}`);
}

/** Usa um modelo (ou duplica uma ficha) para um aluno vinculado, em rascunho. */
export async function copyToStudent(_prev: PublishState, formData: FormData): Promise<PublishState> {
  const trainerId = await requireTrainerId();
  const parsed = z
    .object({ planId: z.uuid(), studentId: z.uuid({ error: "Escolha o aluno." }), requestId: z.uuid().optional().or(z.literal("")) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  let id: string;
  try {
    id = await copyAs(trainerId, parsed.data.planId, {
      studentId: parsed.data.studentId,
      isTemplate: false,
      requestId: parsed.data.requestId || null,
    });
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível criar a ficha para o aluno.") };
  }
  revalidatePath("/profissional", "layout");
  redirect(`/profissional/fichas/${id}/editar`);
}

export async function deleteDraft(planId: string) {
  const trainerId = await requireTrainerId();
  try {
    await withUser(trainerId, (db) =>
      db.query("delete from public.workout_plans where id = $1 and author_id = $2 and (status = 'rascunho' or is_template)", [planId, trainerId]),
    );
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error) } as const;
  }
  revalidatePath("/profissional", "layout");
  redirect("/profissional/fichas");
}

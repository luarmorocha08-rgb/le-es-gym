"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withUser } from "@/lib/db";
import { GOALS } from "@/lib/workout/constants";
import { dbErrorMessage, requireUserId, type ActionResult } from "@/lib/action-utils";

const requestSchema = z.object({
  trainerId: z.uuid({ error: "Escolha um profissional." }),
  goal: z.enum(GOALS, { error: "Escolha um objetivo." }),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  sessionMinutes: z.coerce.number().int().min(15).max(240),
  details: z.string().trim().max(2000, "Máximo de 2000 caracteres.").optional().transform((v) => v || null),
  shareHealth: z.string().nullish().transform((v) => v === "on"),
});

export type RequestFormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string> };

export async function createRequest(_prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const userId = await requireUserId();
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { message: "Revise os campos destacados.", fieldErrors };
  }
  const r = parsed.data;
  let id: string;
  try {
    id = await withUser(userId, async (db) => {
      const open = await db.one(
        `select 1 from public.workout_requests where student_id = $1 and trainer_id = $2
            and status not in ('concluido', 'cancelado')`,
        [userId, r.trainerId],
      );
      if (open) throw Object.assign(new Error("Você já tem uma solicitação aberta com este profissional."), { code: "22023" });
      const row = await db.one<{ id: string }>(
        `insert into public.workout_requests (student_id, trainer_id, goal, days_per_week, session_minutes, details, share_health_info)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [userId, r.trainerId, r.goal, r.daysPerWeek, r.sessionMinutes, r.details, r.shareHealth],
      );
      return row!.id;
    });
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível enviar a solicitação.") };
  }
  revalidatePath("/aluno", "layout");
  redirect(`/aluno/solicitar-profissional/${id}`);
}

const messageSchema = z.object({
  requestId: z.uuid(),
  body: z.string().trim().min(1, "Escreva uma mensagem.").max(2000, "Máximo de 2000 caracteres."),
});

export async function sendMessage(_prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const userId = await requireUserId();
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  try {
    await withUser(userId, (db) =>
      db.query("insert into public.request_messages (request_id, author_id, body) values ($1, $2, $3)", [
        parsed.data.requestId,
        userId,
        parsed.data.body,
      ]),
    );
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível enviar a mensagem.") };
  }
  revalidatePath(`/aluno/solicitar-profissional/${parsed.data.requestId}`);
  return { ok: true };
}

const STUDENT_TRANSITIONS = ["ajuste_solicitado", "concluido", "cancelado"] as const;
const transitionSchema = z.object({
  requestId: z.uuid(),
  to: z.enum(STUDENT_TRANSITIONS),
  note: z.string().trim().max(1000).optional().transform((v) => v || null),
});

/** Transições permitidas ao aluno; a regra final é a máquina de estados do banco. */
export async function transitionRequest(_prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const userId = await requireUserId();
  const parsed = transitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Ação inválida." };
  const { requestId, to, note } = parsed.data;
  if (to === "ajuste_solicitado" && !note) return { fieldErrors: { note: "Explique o ajuste que você precisa." } };
  try {
    await withUser(userId, (db) => db.query("select public.transition_request($1, $2, $3)", [requestId, to, note]));
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível atualizar a solicitação.") };
  }
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

export async function markNotificationsRead(ids?: string[]): Promise<ActionResult> {
  const userId = await requireUserId();
  await withUser(userId, (db) =>
    ids?.length
      ? db.query("update public.notifications set read_at = now() where user_id = $1 and id = any($2::uuid[]) and read_at is null", [userId, ids])
      : db.query("update public.notifications set read_at = now() where user_id = $1 and read_at is null", [userId]),
  );
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

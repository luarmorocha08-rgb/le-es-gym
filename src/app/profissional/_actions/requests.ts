"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorMessage, fieldErrorsOf, requireTrainerId } from "@/lib/action-utils";
import { withUser } from "@/lib/db";

export type TrainerFormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string> };

const TRAINER_TRANSITIONS = ["em_analise", "em_elaboracao", "concluido"] as const;
const transitionSchema = z.object({
  requestId: z.uuid(),
  to: z.enum(TRAINER_TRANSITIONS),
  note: z.string().trim().max(1000).optional().transform((v) => v || null),
});

/** Aceitar, iniciar elaboração ou concluir. A entrega acontece ao publicar a ficha. */
export async function transitionTrainerRequest(_prev: TrainerFormState, formData: FormData): Promise<TrainerFormState> {
  const trainerId = await requireTrainerId();
  const parsed = transitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Ação inválida." };
  const { requestId, to, note } = parsed.data;
  try {
    await withUser(trainerId, async (db) => {
      const r = await db.one<{ status: string }>("select status::text from public.workout_requests where id = $1 and trainer_id = $2", [requestId, trainerId]);
      if (!r) throw Object.assign(new Error("Solicitação não encontrada."), { code: "P0002" });
      // "iniciar elaboração" direto do aguardando passa por "em análise"
      if (to === "em_elaboracao" && r.status === "aguardando_profissional") {
        await db.query("select public.transition_request($1, 'em_analise', null)", [requestId]);
      }
      await db.query("select public.transition_request($1, $2, $3)", [requestId, to, note]);
    });
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível atualizar a solicitação.") };
  }
  revalidatePath("/profissional", "layout");
  return { ok: true };
}

const messageSchema = z.object({
  requestId: z.uuid(),
  body: z.string().trim().min(1, "Escreva uma mensagem.").max(2000, "Máximo de 2000 caracteres."),
});

/** Mensagem real na solicitação (usada também para pedir informações adicionais). */
export async function sendTrainerMessage(_prev: TrainerFormState, formData: FormData): Promise<TrainerFormState> {
  const trainerId = await requireTrainerId();
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  try {
    await withUser(trainerId, (db) =>
      db.query("insert into public.request_messages (request_id, author_id, body) values ($1, $2, $3)", [
        parsed.data.requestId,
        trainerId,
        parsed.data.body,
      ]),
    );
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível enviar a mensagem.") };
  }
  revalidatePath(`/profissional/solicitacoes/${parsed.data.requestId}`);
  return { ok: true };
}

const noteSchema = z.object({
  studentId: z.uuid(),
  body: z.string().trim().min(1, "Escreva a observação.").max(4000, "Máximo de 4000 caracteres."),
});

/** Observações privadas: visíveis apenas para o profissional que escreveu. */
export async function addNote(_prev: TrainerFormState, formData: FormData): Promise<TrainerFormState> {
  const trainerId = await requireTrainerId();
  const parsed = noteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  try {
    await withUser(trainerId, (db) =>
      db.query("insert into public.trainer_notes (trainer_id, student_id, body) values ($1, $2, $3)", [trainerId, parsed.data.studentId, parsed.data.body]),
    );
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível salvar a observação.") };
  }
  revalidatePath(`/profissional/alunos/${parsed.data.studentId}`);
  return { ok: true };
}

export async function deleteNote(noteId: string, studentId: string) {
  const trainerId = await requireTrainerId();
  await withUser(trainerId, (db) => db.query("delete from public.trainer_notes where id = $1 and trainer_id = $2", [noteId, trainerId]));
  revalidatePath(`/profissional/alunos/${studentId}`);
}

const SPECIALTY_MAX = 8;
const profileSchema = z.object({
  cref: z.string().trim().max(30).optional().transform((v) => v || null),
  bio: z.string().trim().max(1200, "Máximo de 1200 caracteres.").optional().transform((v) => v || null),
  specialties: z
    .string()
    .optional()
    .transform((v) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, SPECIALTY_MAX))
    .pipe(z.array(z.string().max(40, "Especialidade muito longa."))),
  isPublic: z.string().nullish().transform((v) => v === "on"),
  acceptsRequests: z.string().nullish().transform((v) => v === "on"),
});

export async function updateProfessionalProfile(_prev: TrainerFormState, formData: FormData): Promise<TrainerFormState> {
  const trainerId = await requireTrainerId();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const p = parsed.data;
  try {
    await withUser(trainerId, (db) =>
      db.query(
        `update public.professional_profiles set cref = $2, bio = $3, specialties = $4, is_public = $5, accepts_requests = $6
          where user_id = $1`,
        [trainerId, p.cref, p.bio, p.specialties, p.isPublic, p.acceptsRequests],
      ),
    );
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível salvar.") };
  }
  revalidatePath("/profissional", "layout");
  revalidatePath("/equipe");
  return { ok: true, message: "Perfil profissional atualizado." };
}

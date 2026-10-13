"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dbErrorMessage, requireUserId } from "@/lib/action-utils";
import { suggestionToPlanInput } from "@/lib/ai/normalize";
import { adjustInstructionSchema, aiProfileInputSchema, type Suggestion } from "@/lib/ai/schemas";
import { adjustSuggestion, aiErrorMessage, explainExercise, generateSuggestion, getGeneration, suggestSubstitutes } from "@/lib/ai/service";
import { withUser } from "@/lib/db";
import { planSchema } from "@/lib/validation/workout";
import { insertPlanStructure } from "@/lib/workout/plan-writer";

export type AiResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };
export type SuggestionPayload = { generationId: string; suggestion: Suggestion };

export async function generateForMe(rawInput: unknown): Promise<AiResult<SuggestionPayload>> {
  const userId = await requireUserId();
  const parsed = aiProfileInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Revise as respostas: " + (parsed.error.issues[0]?.message ?? "dados inválidos") };
  try {
    const { generationId, result } = await generateSuggestion({ requesterId: userId, studentId: userId, input: parsed.data, withHistory: true });
    return { ok: true, data: { generationId, suggestion: result } };
  } catch (error) {
    return { ok: false, ...aiErrorMessage(error) };
  }
}

export async function adjustMine(generationId: string, instruction: string): Promise<AiResult<SuggestionPayload>> {
  const userId = await requireUserId();
  const parsed = adjustInstructionSchema.safeParse(instruction);
  if (!parsed.success || !z.uuid().safeParse(generationId).success) return { ok: false, code: "invalid", message: parsed.error?.issues[0]?.message ?? "Pedido inválido." };
  try {
    const { generationId: id, result } = await adjustSuggestion({ requesterId: userId, generationId, instruction: parsed.data });
    return { ok: true, data: { generationId: id, suggestion: result } };
  } catch (error) {
    return { ok: false, ...aiErrorMessage(error) };
  }
}

/** Cria a ficha a partir da sugestão salva no servidor (não confia no cliente). */
async function createPlanFromGeneration(userId: string, generationId: string, status: "rascunho" | "ativo") {
  const gen = await getGeneration(userId, generationId);
  if (!gen?.output || gen.status !== "sucesso" || gen.student_id !== userId || !gen.kind.endsWith("treino")) {
    throw Object.assign(new Error("Sugestão não encontrada."), { code: "P0002" });
  }
  const plan = planSchema.parse(suggestionToPlanInput(gen.output, gen.input?.profile?.goal ?? null));
  return withUser(userId, async (db) => {
    const row = await db.one<{ id: string }>(
      `insert into public.workout_plans (student_id, author_id, source, status, title, split_type, goal, description, progression_notes, ai_generation_id)
       values ($1, $1, 'ia', $2, $3, $4, $5, $6, $7, $8) returning id`,
      [userId, status, plan.title, plan.splitType, plan.goal, plan.description, gen.output!.progression.slice(0, 2000) || null, generationId],
    );
    await insertPlanStructure(db, row!.id, plan.days);
    if (status === "ativo") await db.query("update public.profiles set current_plan_id = $2 where id = $1", [userId, row!.id]);
    return row!.id;
  });
}

export async function saveSuggestion(generationId: string, mode: "editar" | "usar"): Promise<AiResult<never>> {
  const userId = await requireUserId();
  if (!z.uuid().safeParse(generationId).success) return { ok: false, code: "invalid", message: "Sugestão inválida." };
  let planId: string;
  try {
    planId = await createPlanFromGeneration(userId, generationId, mode === "usar" ? "ativo" : "rascunho");
  } catch (error) {
    return { ok: false, code: "invalid", message: dbErrorMessage(error, "Não foi possível salvar a sugestão.") };
  }
  revalidatePath("/aluno", "layout");
  redirect(mode === "editar" ? `/aluno/meus-treinos/${planId}/editar` : `/aluno/meus-treinos/${planId}`);
}

const reviewSchema = z.object({
  generationId: z.uuid(),
  trainerId: z.uuid({ error: "Escolha o profissional." }),
  message: z.string().trim().max(1000).optional().transform((v) => v || null),
});

/** Envia a sugestão para revisão: ficha "em revisão" + solicitação ao profissional. */
export async function sendForReview(_prev: { ok?: boolean; message?: string }, formData: FormData): Promise<{ ok?: boolean; message?: string }> {
  const userId = await requireUserId();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  let requestId: string;
  try {
    const planId = await createPlanFromGeneration(userId, parsed.data.generationId, "rascunho");
    // objetivo e disponibilidade informados à IA (o perfil pode estar incompleto)
    const answered = (await getGeneration(userId, parsed.data.generationId))?.input?.profile;
    requestId = await withUser(userId, async (db) => {
      const profile = await db.one<{ goal: string | null; days_per_week: number | null; session_minutes: number | null }>(
        "select goal::text, days_per_week, session_minutes from public.profiles where id = $1",
        [userId],
      );
      const plan = await db.one<{ title: string }>("select title from public.workout_plans where id = $1", [planId]);
      const req = await db.one<{ id: string }>(
        `insert into public.workout_requests (student_id, trainer_id, goal, days_per_week, session_minutes, details)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [
          userId,
          parsed.data.trainerId,
          answered?.goal ?? profile?.goal ?? "outro",
          answered?.daysPerWeek ?? profile?.days_per_week ?? null,
          answered?.sessionMinutes ?? profile?.session_minutes ?? null,
          [`Revisão de sugestão gerada por IA: "${plan?.title}".`, parsed.data.message].filter(Boolean).join("\n\n").slice(0, 2000),
        ],
      );
      await db.query("update public.workout_plans set status = 'em_revisao', request_id = $2 where id = $1", [planId, req!.id]);
      return req!.id;
    });
  } catch (error) {
    return { message: dbErrorMessage(error, "Não foi possível enviar para revisão.") };
  }
  revalidatePath("/aluno", "layout");
  redirect(`/aluno/solicitar-profissional/${requestId}`);
}

export async function studentSubstitutes(exerciseId: string): Promise<AiResult<{ options: { exerciseId: string; name: string; reason: string }[] }>> {
  const userId = await requireUserId();
  if (!z.uuid().safeParse(exerciseId).success) return { ok: false, code: "invalid", message: "Exercício inválido." };
  try {
    const { result } = await suggestSubstitutes({ requesterId: userId, studentId: userId, exerciseId });
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, ...aiErrorMessage(error) };
  }
}

export async function askAboutExercise(slug: string, question: string): Promise<AiResult<{ answer: string; safety_note: string | null }>> {
  const userId = await requireUserId();
  const q = z.string().trim().min(5, "Escreva sua dúvida.").max(400, "Máximo de 400 caracteres.").safeParse(question);
  if (!q.success) return { ok: false, code: "invalid", message: q.error.issues[0].message };
  try {
    const { result } = await explainExercise({ requesterId: userId, slug, question: q.data });
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, ...aiErrorMessage(error) };
  }
}

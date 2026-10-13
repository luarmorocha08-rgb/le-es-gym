"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTrainerId } from "@/lib/action-utils";
import { suggestionToPlanInput } from "@/lib/ai/normalize";
import { adjustInstructionSchema, aiProfileInputSchema } from "@/lib/ai/schemas";
import { adjustSuggestion, aiErrorMessage, generateSuggestion, getGeneration, suggestSubstitutes } from "@/lib/ai/service";
import type { AiResult, SuggestionPayload } from "@/app/aluno/_actions/ai";
import { saveTrainerPlan } from "./plans";

export async function generateForStudent(studentId: string, rawInput: unknown): Promise<AiResult<SuggestionPayload>> {
  const trainerId = await requireTrainerId();
  const parsed = aiProfileInputSchema.safeParse(rawInput);
  if (!z.uuid().safeParse(studentId).success || !parsed.success) {
    return { ok: false, code: "invalid", message: "Revise os dados: " + (parsed.error?.issues[0]?.message ?? "aluno inválido") };
  }
  try {
    const { generationId, result } = await generateSuggestion({ requesterId: trainerId, studentId, input: parsed.data, withHistory: true });
    return { ok: true, data: { generationId, suggestion: result } };
  } catch (error) {
    return { ok: false, ...aiErrorMessage(error) };
  }
}

export async function adjustForStudent(generationId: string, instruction: string): Promise<AiResult<SuggestionPayload>> {
  const trainerId = await requireTrainerId();
  const parsed = adjustInstructionSchema.safeParse(instruction);
  if (!parsed.success || !z.uuid().safeParse(generationId).success) return { ok: false, code: "invalid", message: parsed.error?.issues[0]?.message ?? "Pedido inválido." };
  try {
    const { generationId: id, result } = await adjustSuggestion({ requesterId: trainerId, generationId, instruction: parsed.data });
    return { ok: true, data: { generationId: id, suggestion: result } };
  } catch (error) {
    return { ok: false, ...aiErrorMessage(error) };
  }
}

/**
 * A sugestão vira RASCUNHO do profissional (origem "ia"). Nunca é publicada
 * aqui: revisão, edição e publicação acontecem na página da ficha.
 */
export async function saveAiDraft(generationId: string, asTemplate: boolean): Promise<AiResult<never>> {
  const trainerId = await requireTrainerId();
  const gen = z.uuid().safeParse(generationId).success ? await getGeneration(trainerId, generationId) : null;
  if (!gen?.output || gen.status !== "sucesso" || !gen.student_id) return { ok: false, code: "invalid", message: "Sugestão não encontrada." };
  const input = suggestionToPlanInput(gen.output, gen.input?.profile?.goal ?? null);
  const result = await saveTrainerPlan(
    asTemplate ? { isTemplate: true, aiGenerationId: generationId } : { studentId: gen.student_id, aiGenerationId: generationId },
    input,
  );
  if (!result.ok) return { ok: false, code: "invalid", message: result.message };
  revalidatePath("/profissional", "layout");
  redirect(`/profissional/fichas/${result.data.id}`);
}

export async function trainerSubstitutes(studentId: string | null, exerciseId: string): Promise<AiResult<{ options: { exerciseId: string; name: string; reason: string }[] }>> {
  const trainerId = await requireTrainerId();
  if (!z.uuid().safeParse(exerciseId).success || (studentId && !z.uuid().safeParse(studentId).success)) {
    return { ok: false, code: "invalid", message: "Parâmetros inválidos." };
  }
  try {
    const { result } = await suggestSubstitutes({ requesterId: trainerId, studentId, exerciseId });
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, ...aiErrorMessage(error) };
  }
}

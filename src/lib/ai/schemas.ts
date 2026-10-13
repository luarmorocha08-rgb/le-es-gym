import { z } from "zod";
import { GOALS, LEVELS, SPLIT_TYPES } from "@/lib/workout/constants";

/* -----------------------------------------------------------------------------
 * Entrada (já minimizada): nada de nome, e-mail, telefone ou data de nascimento.
 * -------------------------------------------------------------------------- */
export const aiProfileInputSchema = z.object({
  goal: z.enum(GOALS),
  level: z.enum(LEVELS),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  sessionMinutes: z.coerce.number().int().min(20).max(180),
  equipment: z.array(z.string().trim().max(40)).max(20).default([]),
  priorityMuscles: z.array(z.string().trim().max(40)).max(10).default([]),
  preferences: z.string().trim().max(600).optional().transform((v) => v || null),
  limitations: z.string().trim().max(800).optional().transform((v) => v || null),
  avoid: z.string().trim().max(400).optional().transform((v) => v || null),
  extraInstructions: z.string().trim().max(600).optional().transform((v) => v || null),
});
export type AiProfileInput = z.output<typeof aiProfileInputSchema>;

export const adjustInstructionSchema = z.string().trim().min(3, "Descreva o ajuste.").max(500, "Máximo de 500 caracteres.");

/* -----------------------------------------------------------------------------
 * Saída estruturada exigida do modelo (validada pelo SDK e de novo por nós).
 * Restrições numéricas são removidas do schema enviado à API e checadas no cliente.
 * -------------------------------------------------------------------------- */
export const modelExerciseSchema = z.object({
  slug: z.string().describe("Slug exato de um exercício do catálogo"),
  sets: z.number().int().describe("Séries (1 a 8)"),
  reps: z.string().describe('Repetições: número ("10"), faixa crescente ("8-12") ou "falha"'),
  rest_seconds: z.number().int().describe("Descanso em segundos (0 a 300)"),
  notes: z.string().nullable().describe("Observação curta de execução ou null"),
});

export const modelSuggestionSchema = z.object({
  title: z.string().describe("Nome curto do treino em português"),
  split_type: z.enum(SPLIT_TYPES),
  summary: z.string().describe("Resumo de 1 a 3 frases da lógica do treino"),
  weekly_schedule: z.string().describe("Como distribuir os dias na semana, incluindo descanso"),
  days: z
    .array(
      z.object({
        label: z.string().describe('Rótulo curto: "A", "B", "Upper A"...'),
        name: z.string().describe("Foco do dia"),
        exercises: z.array(modelExerciseSchema),
      }),
    )
    .describe("Um item por dia de treino"),
  progression: z.string().describe("Recomendações gerais de progressão, sem promessas de resultado"),
  general_tips: z.array(z.string()).describe("Até 5 orientações básicas"),
  safety_notes: z.array(z.string()).describe("Avisos de segurança relevantes (pode ser vazio)"),
  requires_professional_evaluation: z
    .boolean()
    .describe("true quando houver dor, lesão, condição de saúde ou limitação que exija avaliação profissional"),
});
export type ModelSuggestion = z.infer<typeof modelSuggestionSchema>;

export const modelSubstitutesSchema = z.object({
  options: z
    .array(z.object({ slug: z.string(), reason: z.string().describe("Por que é uma boa alternativa, em 1 frase") }))
    .describe("Até 4 alternativas do catálogo"),
});

export const modelExplanationSchema = z.object({
  answer: z.string().describe("Resposta clara em português, até 6 frases"),
  safety_note: z.string().nullable().describe("Aviso se a dúvida envolver dor, lesão ou condição de saúde; senão null"),
});

/* -----------------------------------------------------------------------------
 * Sugestão normalizada guardada em ai_generations.output e exibida na interface.
 * -------------------------------------------------------------------------- */
export type SuggestionExercise = {
  exercise_id: string;
  slug: string;
  name: string;
  primary_muscles: string[];
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string | null;
};
export type Suggestion = {
  title: string;
  split_type: (typeof SPLIT_TYPES)[number];
  summary: string;
  weekly_schedule: string;
  days: { label: string; name: string; exercises: SuggestionExercise[] }[];
  progression: string;
  general_tips: string[];
  safety_notes: string[];
  requires_professional_evaluation: boolean;
  dropped_exercises: string[];
};

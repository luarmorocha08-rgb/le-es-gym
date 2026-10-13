import { z } from "zod";
import { GOALS, SPLIT_TYPES } from "@/lib/workout/constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** Número opcional vindo de formulário: "", null ou ausente → null. */
const optionalNumber = (schema: z.ZodCoercedNumber<unknown>) =>
  z
    .preprocess((v) => (v === "" || v == null ? null : v), schema.nullable())
    .optional()
    .transform((v) => v ?? null);

export const REPS_PATTERN = /^([0-9]{1,3}(-[0-9]{1,3})?|falha)$/;

export const planExerciseSchema = z.object({
  exerciseId: z.uuid({ error: "Exercício inválido." }),
  sets: z.coerce.number().int().min(1, "Mínimo 1 série.").max(12, "Máximo 12 séries."),
  reps: z
    .string()
    .trim()
    .toLowerCase()
    .regex(REPS_PATTERN, 'Use um número ("10"), faixa ("8-12") ou "falha".')
    .refine((r) => {
      const [a, b] = r.split("-").map(Number);
      return r === "falha" || b === undefined || (a > 0 && b >= a);
    }, "Faixa inválida."),
  restSeconds: z.coerce.number().int().min(0).max(600, "Descanso máximo de 10 minutos."),
  targetLoadKg: optionalNumber(z.coerce.number().min(0, "Carga inválida.").max(1000, "Carga inválida.")),
  notes: optionalText(500),
});

export const planDaySchema = z.object({
  label: z.string().trim().min(1, "Informe o rótulo.").max(12),
  name: z.string().trim().min(1, "Informe o nome do dia.").max(80),
  notes: optionalText(1000),
  exercises: z.array(planExerciseSchema).max(30, "Máximo de 30 exercícios por dia."),
});

export const planSchema = z
  .object({
    title: z.string().trim().min(2, "Dê um nome ao treino.").max(120),
    splitType: z.enum(SPLIT_TYPES),
    goal: z.enum(GOALS).nullable().optional().transform((v) => v ?? null),
    description: optionalText(2000),
    days: z.array(planDaySchema).min(1, "Adicione pelo menos um dia.").max(7, "Máximo de 7 dias."),
    makeCurrent: z.boolean().optional().default(true),
  })
  .superRefine((plan, ctx) => {
    const labels = plan.days.map((d) => d.label.toUpperCase());
    labels.forEach((l, i) => {
      if (labels.indexOf(l) !== i) ctx.addIssue({ code: "custom", path: ["days", i, "label"], message: "Rótulo repetido." });
    });
    if (!plan.days.some((d) => d.exercises.length > 0)) {
      ctx.addIssue({ code: "custom", path: ["days"], message: "Adicione pelo menos um exercício." });
    }
  });

export type PlanInput = z.input<typeof planSchema>;
export type PlanData = z.output<typeof planSchema>;

export const setLogSchema = z.object({
  sessionId: z.uuid(),
  workoutExerciseId: z.uuid(),
  setNumber: z.coerce.number().int().min(1).max(20),
  reps: z.coerce.number().int().min(0, "Repetições inválidas.").max(200),
  loadKg: optionalNumber(z.coerce.number().min(0, "Carga inválida.").max(1000, "Carga inválida.")),
});

export const finishSessionSchema = z.object({
  sessionId: z.uuid(),
  perceivedEffort: optionalNumber(z.coerce.number().int().min(1).max(10)),
  feedback: optionalText(1000),
});

/** Primeiro erro de cada caminho ("days.0.exercises.1.reps" → mensagem). */
export function issuesByPath(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

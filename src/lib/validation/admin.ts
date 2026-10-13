import { z } from "zod";
import { LEVELS, MUSCLE_LABELS } from "@/lib/workout/constants";

export type FormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string> };

const MUSCLES = Object.keys(MUSCLE_LABELS) as [string, ...string[]];

/** "Supino reto (barra)" → "supino-reto-barra" */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const lines = (max: number, maxLen: number) =>
  z
    .string()
    .default("")
    .transform((v) => v.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(maxLen, `Cada linha pode ter até ${maxLen} caracteres.`)).max(max, `Máximo de ${max} linhas.`));

export const exerciseSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(120),
  slug: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  primaryMuscles: z.array(z.enum(MUSCLES)).min(1, "Escolha ao menos um músculo principal."),
  secondaryMuscles: z.array(z.enum(MUSCLES)).default([]),
  equipment: z.string().trim().min(2, "Informe o equipamento.").max(60),
  mechanics: z
    .enum(["composto", "isolado", ""])
    .default("")
    .transform((v) => v || null),
  level: z.enum(LEVELS),
  instructions: lines(12, 400).refine((l) => l.length > 0, "Descreva ao menos um passo de execução."),
  tips: lines(8, 300),
  videoUrl: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Use um link https://")
    .transform((v) => v || null),
});
export type ExerciseInput = z.output<typeof exerciseSchema>;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.");

export const hourSchema = z
  .object({
    weekdays: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Escolha ao menos um dia."),
    opensAt: time,
    closesAt: time,
    note: z
      .string()
      .trim()
      .max(120)
      .default("")
      .transform((v) => v || null),
  })
  .refine((h) => h.closesAt > h.opensAt, { message: "O fechamento deve ser depois da abertura.", path: ["closesAt"] });

export const announcementSchema = z.object({
  active: z.boolean(),
  text: z.string().trim().max(160, "Máximo de 160 caracteres."),
  linkLabel: z.string().trim().max(40).default(""),
  linkUrl: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || v.startsWith("/") || /^https:\/\/\S+$/.test(v), "Use um caminho do site (/contato) ou um link https://"),
  endsAt: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida."),
}).refine((a) => !a.active || a.text.length >= 3, { message: "Escreva o aviso para ativá-lo.", path: ["text"] });
export type Announcement = z.output<typeof announcementSchema>;

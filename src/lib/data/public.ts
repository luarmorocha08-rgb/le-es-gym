import "server-only";
import { getPool, withAnon } from "@/lib/db";

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export type OpeningHour = { weekday: number; opens_at: string; closes_at: string; note: string | null };

export type PublicResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_configured" }
  | { status: "error"; message: string };

async function publicQuery<T>(fn: Parameters<typeof withAnon<T>>[0]): Promise<PublicResult<T>> {
  if (!getPool()) return { status: "not_configured" };
  try {
    return { status: "ok", data: await withAnon(fn) };
  } catch (error) {
    console.error("[public data]", error);
    return { status: "error", message: "Falha ao consultar o banco de dados." };
  }
}

/** Horários cadastrados pela administração (tabela opening_hours). */
export function getOpeningHours() {
  return publicQuery((db) =>
    db.query<OpeningHour>(
      "select weekday, opens_at::text, closes_at::text, note from public.opening_hours order by weekday, opens_at",
    ),
  );
}

export type PublicTrainer = {
  user_id: string;
  full_name: string;
  bio: string | null;
  specialties: string[];
  photo_path: string | null;
  cref: string | null;
  accepts_requests: boolean;
};

/** Profissionais aprovados que optaram por perfil público (view public_trainers). */
export function getPublicTrainers() {
  return publicQuery((db) => db.query<PublicTrainer>("select * from public.public_trainers order by full_name"));
}

/** Agrupa faixas por dia da semana, mantendo a ordem seg→dom. */
export function groupHoursByDay(hours: OpeningHour[]) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order
    .map((weekday) => ({
      weekday,
      label: WEEKDAYS[weekday],
      ranges: hours
        .filter((h) => h.weekday === weekday)
        .map((h) => ({ from: h.opens_at.slice(0, 5), to: h.closes_at.slice(0, 5), note: h.note })),
    }))
    .filter((d) => d.ranges.length > 0);
}

import "server-only";
import { createPublicClient } from "@/lib/supabase/server";

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export type OpeningHour = { weekday: number; opens_at: string; closes_at: string; note: string | null };

export type PublicResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_configured" }
  | { status: "error"; message: string };

/** Horários cadastrados pela administração (tabela opening_hours). */
export async function getOpeningHours(): Promise<PublicResult<OpeningHour[]>> {
  const supabase = createPublicClient();
  if (!supabase) return { status: "not_configured" };
  const { data, error } = await supabase
    .from("opening_hours")
    .select("weekday, opens_at, closes_at, note")
    .order("weekday")
    .order("opens_at");
  if (error) return { status: "error", message: error.message };
  return { status: "ok", data: data ?? [] };
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
export async function getPublicTrainers(): Promise<PublicResult<PublicTrainer[]>> {
  const supabase = createPublicClient();
  if (!supabase) return { status: "not_configured" };
  const { data, error } = await supabase.from("public_trainers").select("*").order("full_name");
  if (error) return { status: "error", message: error.message };
  return { status: "ok", data: (data ?? []) as PublicTrainer[] };
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

import "server-only";
import { media } from "@/content/gym";
import { getPool, withAnon } from "@/lib/db";
import { announcementSchema } from "@/lib/validation/admin";
import { siteMediaSchema, type SiteMedia } from "@/lib/validation/media";
import { localDate } from "@/lib/workout/progress";

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

export type PublicAnnouncement = { text: string; linkLabel: string; linkUrl: string };

/** Aviso ativo cadastrado no painel (site_content "aviso"); expira no fim do dia informado. */
export async function getAnnouncement(): Promise<PublicAnnouncement | null> {
  const result = await publicQuery((db) => db.one<{ value: unknown }>("select value from public.site_content where key = 'aviso'"));
  if (result.status !== "ok" || !result.data) return null;
  const parsed = announcementSchema.safeParse(result.data.value);
  if (!parsed.success || !parsed.data.active) return null;
  const a = parsed.data;
  if (a.endsAt && localDate(new Date()) > a.endsAt) return null;
  return { text: a.text, linkLabel: a.linkLabel, linkUrl: a.linkUrl };
}

const EMPTY_MEDIA: SiteMedia = { heroVideo: null, heroPoster: null, gallery: [] };

/** Fotos e vídeos enviados pelo painel (site_content "midias"). */
export async function getSiteMedia(): Promise<SiteMedia> {
  const result = await publicQuery((db) => db.one<{ value: unknown }>("select value from public.site_content where key = 'midias'"));
  if (result.status !== "ok" || !result.data) return EMPTY_MEDIA;
  const parsed = siteMediaSchema.safeParse(result.data.value);
  return parsed.success ? parsed.data : EMPTY_MEDIA;
}

/** Mídias da página inicial: as enviadas pelo painel têm prioridade sobre as de public/media. */
export async function getLandingMedia() {
  const uploaded = await getSiteMedia();
  return {
    video: uploaded.heroVideo?.url ?? media.heroVideo,
    poster: uploaded.heroPoster?.url ?? media.heroPoster,
    gallery: uploaded.gallery.length > 0 ? uploaded.gallery.map((g) => ({ src: g.url, alt: g.alt })) : media.gallery,
  };
}

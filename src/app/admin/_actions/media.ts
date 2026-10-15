"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorMessage, requireAdminId } from "@/lib/action-utils";
import { type Db, withUser } from "@/lib/db";
import { isMediaConfigured, isOwnMediaUrl } from "@/lib/media/config";
import { altSchema, MAX_GALLERY, mediaKinds, siteMediaSchema, type MediaKind, type SiteMedia } from "@/lib/validation/media";

type Result = { ok: true; message: string } | { ok: false; message: string };

const NOT_CONFIGURED: Result = { ok: false, message: "Armazenamento de arquivos não configurado." };

/** Confere que o arquivo veio do nosso armazenamento, na pasta do uso informado. */
function checkUpload(url: unknown, kind: MediaKind) {
  if (typeof url !== "string" || !isOwnMediaUrl(url, `${mediaKinds[kind].folder}/`)) return null;
  return { url, pathname: decodeURIComponent(new URL(url).pathname.slice(1)) };
}

/** Remove arquivos que deixaram de ser usados (falha aqui não desfaz a alteração). */
async function discard(urls: (string | null | undefined)[]) {
  const list = urls.filter((u): u is string => Boolean(u) && isOwnMediaUrl(u!));
  if (list.length === 0) return;
  try {
    await del(list);
  } catch (error) {
    console.error("[mídia] falha ao remover arquivo antigo", error);
  }
}

/** Lê e grava as mídias do site numa única transação (evita perder alterações simultâneas). */
async function updateSiteMedia(adminId: string, change: (current: SiteMedia) => SiteMedia | string) {
  return withUser(adminId, async (db: Db) => {
    const row = await db.one<{ value: unknown }>("select value from public.site_content where key = 'midias' for update");
    const parsed = siteMediaSchema.safeParse(row?.value ?? {});
    const current = parsed.success ? parsed.data : siteMediaSchema.parse({});
    const next = change(current);
    if (typeof next === "string") return { error: next, previous: current };
    await db.query(
      `insert into public.site_content (key, value, updated_by) values ('midias', $1, $2)
       on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by`,
      [JSON.stringify(next), adminId],
    );
    return { error: null, previous: current };
  });
}

function refreshSite() {
  revalidatePath("/", "layout");
}

/** Vídeo de fundo ou imagem de capa da página inicial (null remove). */
export async function setHeroMedia(kind: "heroVideo" | "heroPoster", url: string | null): Promise<Result> {
  const adminId = await requireAdminId();
  if (!isMediaConfigured()) return NOT_CONFIGURED;
  if (kind !== "heroVideo" && kind !== "heroPoster") return { ok: false, message: "Tipo inválido." };
  const item = url === null ? null : checkUpload(url, kind);
  if (url !== null && !item) return { ok: false, message: "Arquivo inválido." };
  try {
    const { previous } = await updateSiteMedia(adminId, (current) => ({ ...current, [kind]: item }));
    if (previous[kind]?.url !== item?.url) await discard([previous[kind]?.url]);
  } catch (error) {
    if (item) await discard([item.url]);
    return { ok: false, message: dbErrorMessage(error, "Não foi possível salvar a mídia.") };
  }
  refreshSite();
  const messages = {
    heroVideo: ["Vídeo publicado no site.", "Vídeo removido."],
    heroPoster: ["Imagem de capa publicada no site.", "Imagem de capa removida."],
  } as const;
  return { ok: true, message: messages[kind][item ? 0 : 1] };
}

export async function addGalleryImage(url: string, alt: string): Promise<Result> {
  const adminId = await requireAdminId();
  if (!isMediaConfigured()) return NOT_CONFIGURED;
  const item = checkUpload(url, "gallery");
  const text = altSchema.safeParse(alt);
  if (!item) return { ok: false, message: "Arquivo inválido." };
  if (!text.success) {
    await discard([item.url]);
    return { ok: false, message: text.error.issues[0]!.message };
  }
  try {
    const { error } = await updateSiteMedia(adminId, (current) =>
      current.gallery.length >= MAX_GALLERY
        ? `A galeria aceita até ${MAX_GALLERY} fotos. Remova uma antes de enviar outra.`
        : { ...current, gallery: [...current.gallery, { ...item, alt: text.data }] },
    );
    if (error) {
      await discard([item.url]);
      return { ok: false, message: error };
    }
  } catch (error) {
    await discard([item.url]);
    return { ok: false, message: dbErrorMessage(error, "Não foi possível salvar a foto.") };
  }
  refreshSite();
  return { ok: true, message: "Foto adicionada à galeria." };
}

const moveSchema = z.enum(["up", "down"]);

export async function updateGalleryImage(url: string, change: { alt?: string; move?: "up" | "down" }): Promise<Result> {
  const adminId = await requireAdminId();
  const alt = change.alt === undefined ? null : altSchema.safeParse(change.alt);
  if (alt && !alt.success) return { ok: false, message: alt.error.issues[0]!.message };
  const move = change.move === undefined ? null : moveSchema.safeParse(change.move);
  if (move && !move.success) return { ok: false, message: "Ação inválida." };
  try {
    const { error } = await updateSiteMedia(adminId, (current) => {
      const i = current.gallery.findIndex((g) => g.url === url);
      if (i < 0) return "Foto não encontrada.";
      const gallery = [...current.gallery];
      if (alt?.success) gallery[i] = { ...gallery[i]!, alt: alt.data };
      if (move?.success) {
        const j = move.data === "up" ? i - 1 : i + 1;
        if (j >= 0 && j < gallery.length) [gallery[i], gallery[j]] = [gallery[j]!, gallery[i]!];
      }
      return { ...current, gallery };
    });
    if (error) return { ok: false, message: error };
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error, "Não foi possível atualizar a foto.") };
  }
  refreshSite();
  return { ok: true, message: alt ? "Descrição atualizada." : "Ordem atualizada." };
}

export async function removeGalleryImage(url: string): Promise<Result> {
  const adminId = await requireAdminId();
  try {
    const { error } = await updateSiteMedia(adminId, (current) =>
      current.gallery.some((g) => g.url === url) ? { ...current, gallery: current.gallery.filter((g) => g.url !== url) } : "Foto não encontrada.",
    );
    if (error) return { ok: false, message: error };
  } catch (error) {
    return { ok: false, message: dbErrorMessage(error, "Não foi possível remover a foto.") };
  }
  await discard([url]);
  refreshSite();
  return { ok: true, message: "Foto removida da galeria." };
}

/** Imagem demonstrativa de um exercício da biblioteca (null remove). */
export async function setExerciseImage(exerciseId: string, url: string | null): Promise<Result> {
  const adminId = await requireAdminId();
  if (!z.uuid().safeParse(exerciseId).success) return { ok: false, message: "Exercício inválido." };
  if (url !== null && !isMediaConfigured()) return NOT_CONFIGURED;
  const item = url === null ? null : checkUpload(url, "exercise");
  if (url !== null && !item) return { ok: false, message: "Arquivo inválido." };
  let previous: string | null = null;
  try {
    previous = await withUser(adminId, async (db) => {
      const row = await db.one<{ media_path: string | null }>("select media_path from public.exercises where id = $1 for update", [exerciseId]);
      if (!row) throw Object.assign(new Error("Exercício não encontrado."), { code: "P0002" });
      await db.query("update public.exercises set media_path = $2 where id = $1", [exerciseId, item?.url ?? null]);
      return row.media_path;
    });
  } catch (error) {
    if (item) await discard([item.url]);
    return { ok: false, message: dbErrorMessage(error, "Não foi possível salvar a imagem.") };
  }
  if (previous && previous !== item?.url) await discard([previous]);
  revalidatePath("/admin/exercicios", "layout");
  revalidatePath("/aluno/exercicios", "layout");
  return { ok: true, message: item ? "Imagem do exercício salva." : "Imagem removida." };
}

import { z } from "zod";

const MB = 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];

/**
 * Tipos de envio aceitos. A pasta separa o uso (site × exercícios) e o servidor
 * só emite permissão de envio para estas combinações.
 */
export const mediaKinds = {
  heroVideo: { folder: "site/video", types: VIDEO_TYPES, maxBytes: 80 * MB, label: "vídeo MP4 ou WebM, até 80 MB" },
  heroPoster: { folder: "site/capa", types: IMAGE_TYPES, maxBytes: 8 * MB, label: "imagem JPG, PNG, WebP ou AVIF, até 8 MB" },
  gallery: { folder: "site/galeria", types: IMAGE_TYPES, maxBytes: 8 * MB, label: "imagem JPG, PNG, WebP ou AVIF, até 8 MB" },
  exercise: { folder: "exercicios", types: IMAGE_TYPES, maxBytes: 8 * MB, label: "imagem JPG, PNG, WebP ou AVIF, até 8 MB" },
} as const;

export type MediaKind = keyof typeof mediaKinds;

export function isMediaKind(value: unknown): value is MediaKind {
  return typeof value === "string" && Object.hasOwn(mediaKinds, value);
}

/** Nome do arquivo no armazenamento: pasta do tipo + nome limpo (o sufixo aleatório vem do servidor). */
export function mediaPathname(kind: MediaKind, path: string) {
  const fileName = path.split(/[\\/]/).pop() ?? "";
  const dot = fileName.lastIndexOf(".");
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) : "";
  const base =
    (dot > 0 ? fileName.slice(0, dot) : fileName)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "arquivo";
  return `${mediaKinds[kind].folder}/${base}${ext ? `.${ext}` : ""}`;
}

export const altSchema = z
  .string()
  .trim()
  .min(5, "Descreva a foto em poucas palavras (mín. 5 letras) — é lida por leitores de tela.")
  .max(160, "Use no máximo 160 caracteres.");

const stored = z.object({ url: z.url(), pathname: z.string() });

/** Valor guardado em site_content (chave "midias"). */
export const siteMediaSchema = z.object({
  heroVideo: stored.nullable().default(null),
  heroPoster: stored.nullable().default(null),
  gallery: z.array(stored.extend({ alt: z.string() })).max(12).default([]),
});

export type SiteMedia = z.infer<typeof siteMediaSchema>;

export const MAX_GALLERY = 12;

import { afterEach, describe, expect, it, vi } from "vitest";
import { isOwnMediaUrl } from "@/lib/media/config";
import { isMediaKind, mediaPathname, siteMediaSchema } from "./media";

describe("mediaPathname", () => {
  it("usa a pasta do tipo e limpa o nome", () => {
    expect(mediaPathname("gallery", "Área de Musculação (1).JPG")).toBe("site/galeria/area-de-musculacao-1.jpg");
    expect(mediaPathname("heroVideo", "C:\\fotos\\Treino Noite.MP4")).toBe("site/video/treino-noite.mp4");
  });

  it("nunca sai da pasta do tipo", () => {
    for (const name of ["../../x.png", "/abs/path.png", "a/b\\c.png", "....png", ""]) {
      const path = mediaPathname("exercise", name);
      expect(path.startsWith("exercicios/")).toBe(true);
      expect(path).toMatch(/^[a-z0-9/-]+(\.[a-z0-9]+)?$/);
      expect(path.split("/")).toHaveLength(2);
    }
  });
});

describe("isMediaKind", () => {
  it("aceita só os tipos conhecidos", () => {
    expect(isMediaKind("gallery")).toBe(true);
    expect(isMediaKind("toString")).toBe(false);
    expect(isMediaKind(null)).toBe(false);
  });
});

describe("siteMediaSchema", () => {
  it("preenche padrões a partir de objeto vazio", () => {
    expect(siteMediaSchema.parse({})).toEqual({ heroVideo: null, heroPoster: null, gallery: [] });
  });
});

describe("isOwnMediaUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("aceita só arquivos do próprio armazenamento", () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_AbC123_segredo");
    const host = "https://abc123.public.blob.vercel-storage.com";
    expect(isOwnMediaUrl(`${host}/site/galeria/foto-x1.jpg`, "site/galeria/")).toBe(true);
    expect(isOwnMediaUrl(`${host}/exercicios/foto.jpg`, "site/galeria/")).toBe(false);
    expect(isOwnMediaUrl("https://outro.public.blob.vercel-storage.com/site/galeria/a.jpg")).toBe(false);
    expect(isOwnMediaUrl(`http://abc123.public.blob.vercel-storage.com/a.jpg`)).toBe(false);
    expect(isOwnMediaUrl(`${host}/a.jpg?x=1`)).toBe(false);
    expect(isOwnMediaUrl("javascript:alert(1)")).toBe(false);
  });

  it("sem armazenamento configurado, recusa tudo", () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect(isOwnMediaUrl("https://abc123.public.blob.vercel-storage.com/a.jpg")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { announcementSchema, exerciseSchema, hourSchema, slugify } from "./admin";

describe("slugify", () => {
  it("remove acentos e símbolos", () => {
    expect(slugify("Supino Reto (Barra) — Pegada Média")).toBe("supino-reto-barra-pegada-media");
    expect(slugify("  Elevação  pélvica ")).toBe("elevacao-pelvica");
  });
});

describe("exerciseSchema", () => {
  const base = {
    name: "Remada cavalinho",
    primaryMuscles: ["costas"],
    equipment: "barra",
    level: "intermediario",
    instructions: "Apoie o peito.\n\n  Puxe a barra.  \n",
  };

  it("transforma linhas em passos e normaliza opcionais", () => {
    const r = exerciseSchema.parse(base);
    expect(r.instructions).toEqual(["Apoie o peito.", "Puxe a barra."]);
    expect(r.tips).toEqual([]);
    expect(r.mechanics).toBeNull();
    expect(r.videoUrl).toBeNull();
  });

  it("exige músculo principal conhecido, execução e vídeo https", () => {
    expect(exerciseSchema.safeParse({ ...base, primaryMuscles: [] }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...base, primaryMuscles: ["pescoço"] }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...base, instructions: "   " }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...base, videoUrl: "http://exemplo.com/v" }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...base, videoUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("hourSchema", () => {
  it("aceita vários dias e rejeita fechamento antes da abertura", () => {
    expect(hourSchema.parse({ weekdays: ["1", "2"], opensAt: "06:00", closesAt: "22:00" }).weekdays).toEqual([1, 2]);
    expect(hourSchema.safeParse({ weekdays: ["1"], opensAt: "22:00", closesAt: "06:00" }).success).toBe(false);
    expect(hourSchema.safeParse({ weekdays: [], opensAt: "06:00", closesAt: "22:00" }).success).toBe(false);
    expect(hourSchema.safeParse({ weekdays: ["8"], opensAt: "06:00", closesAt: "22:00" }).success).toBe(false);
  });
});

describe("announcementSchema", () => {
  it("só ativa com texto e aceita apenas links internos ou https", () => {
    expect(announcementSchema.safeParse({ active: true, text: "" }).success).toBe(false);
    expect(announcementSchema.safeParse({ active: false, text: "" }).success).toBe(true);
    expect(announcementSchema.safeParse({ active: true, text: "Feriado", linkUrl: "/contato" }).success).toBe(true);
    expect(announcementSchema.safeParse({ active: true, text: "Feriado", linkUrl: "https://instagram.com/x" }).success).toBe(true);
    expect(announcementSchema.safeParse({ active: true, text: "Feriado", linkUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(announcementSchema.safeParse({ active: true, text: "Feriado", linkUrl: "//evil.com" }).success).toBe(false);
    expect(announcementSchema.safeParse({ active: true, text: "Feriado", linkUrl: "/\\evil.com" }).success).toBe(false);
  });
});

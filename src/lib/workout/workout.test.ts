import { describe, expect, it } from "vitest";
import { planSchema, setLogSchema } from "@/lib/validation/workout";
import {
  currentWeekDays,
  defaultReps,
  formatClock,
  loadSeries,
  nextDayIndex,
  personalRecords,
  volume,
  weekStart,
  weeklyFrequency,
} from "./progress";
import { nextDayLabel, SPLIT_TEMPLATES } from "./splits";

const ex = "3f2b8c1e-1d2a-4c5b-9e6f-7a8b9c0d1e2f";
const basePlan = {
  title: "Meu ABC",
  splitType: "ABC",
  days: [{ label: "A", name: "Peito", exercises: [{ exerciseId: ex, sets: "4", reps: "8-12", restSeconds: "90" }] }],
};

describe("planSchema", () => {
  it("aceita uma ficha válida e converte números", () => {
    const p = planSchema.parse(basePlan);
    expect(p.days[0].exercises[0]).toMatchObject({ sets: 4, reps: "8-12", restSeconds: 90, targetLoadKg: null });
    expect(p.makeCurrent).toBe(true);
  });

  it.each(["12-8", "abc", "0-0", "1000"])("rejeita repetições inválidas: %s", (reps) => {
    const r = planSchema.safeParse({ ...basePlan, days: [{ ...basePlan.days[0], exercises: [{ ...basePlan.days[0].exercises[0], reps }] }] });
    expect(r.success).toBe(false);
  });

  it("aceita 'falha' e faixa crescente", () => {
    for (const reps of ["falha", "FALHA", "10", "6-8"]) {
      const r = planSchema.safeParse({ ...basePlan, days: [{ ...basePlan.days[0], exercises: [{ ...basePlan.days[0].exercises[0], reps }] }] });
      expect(r.success, reps).toBe(true);
    }
  });

  it("exige pelo menos um exercício e rótulos únicos", () => {
    expect(planSchema.safeParse({ ...basePlan, days: [{ label: "A", name: "x", exercises: [] }] }).success).toBe(false);
    const dup = planSchema.safeParse({ ...basePlan, days: [basePlan.days[0], { ...basePlan.days[0], label: "a" }] });
    expect(dup.success).toBe(false);
  });

  it("limita a 7 dias e valida a divisão", () => {
    expect(planSchema.safeParse({ ...basePlan, days: Array.from({ length: 8 }, (_, i) => ({ ...basePlan.days[0], label: `D${i}` })) }).success).toBe(false);
    expect(planSchema.safeParse({ ...basePlan, splitType: "XYZ" }).success).toBe(false);
  });
});

describe("setLogSchema", () => {
  it("carga vazia vira null", () => {
    const r = setLogSchema.parse({ sessionId: ex, workoutExerciseId: ex, setNumber: "1", reps: "10", loadKg: "" });
    expect(r.loadKg).toBeNull();
  });
  it("rejeita repetições negativas", () => {
    expect(setLogSchema.safeParse({ sessionId: ex, workoutExerciseId: ex, setNumber: 1, reps: -1 }).success).toBe(false);
  });
});

describe("sequência e calendário", () => {
  it("nextDayIndex avança em ciclo", () => {
    expect(nextDayIndex(["a", "b", "c"], null)).toBe(0);
    expect(nextDayIndex(["a", "b", "c"], "a")).toBe(1);
    expect(nextDayIndex(["a", "b", "c"], "c")).toBe(0);
    expect(nextDayIndex(["a", "b"], "removido")).toBe(0);
    expect(nextDayIndex([], null)).toBe(-1);
  });

  it("weekStart usa segunda-feira no fuso de São Paulo", () => {
    expect(weekStart("2026-10-14T12:00:00-03:00")).toBe("2026-10-12"); // quarta → segunda
    expect(weekStart("2026-10-12T01:00:00Z")).toBe("2026-10-05"); // domingo 22h em SP
    expect(currentWeekDays(new Date("2026-10-14T12:00:00-03:00"))).toHaveLength(7);
  });

  it("weeklyFrequency agrupa por semana", () => {
    const now = new Date("2026-10-14T12:00:00-03:00");
    const f = weeklyFrequency(["2026-10-13T10:00:00-03:00", "2026-10-12T10:00:00-03:00", "2026-10-06T10:00:00-03:00", "2025-01-01"], 4, now);
    expect(f.map((b) => b.count)).toEqual([0, 0, 1, 2]);
    expect(f[3].week).toBe("2026-10-12");
  });
});

describe("evolução", () => {
  const sets = [
    { exerciseId: "s", exerciseName: "Supino", reps: 10, loadKg: 60, date: "2026-10-01T10:00:00Z" },
    { exerciseId: "s", exerciseName: "Supino", reps: 8, loadKg: 70, date: "2026-10-08T10:00:00Z" },
    { exerciseId: "s", exerciseName: "Supino", reps: 10, loadKg: 70, date: "2026-10-08T10:05:00Z" },
    { exerciseId: "a", exerciseName: "Agachamento", reps: 5, loadKg: null, date: "2026-10-08T10:00:00Z" },
  ];
  it("personalRecords pega a maior carga e desempata por reps", () => {
    const pr = personalRecords(sets);
    expect(pr).toHaveLength(1);
    expect(pr[0]).toMatchObject({ loadKg: 70, reps: 10 });
  });
  it("loadSeries usa a melhor carga do dia", () => {
    expect(loadSeries(sets, "s")).toEqual([
      { date: "2026-10-01", value: 60 },
      { date: "2026-10-08", value: 70 },
    ]);
  });
  it("volume ignora séries sem carga", () => {
    expect(volume(sets)).toBe(600 + 560 + 700);
  });
  it("utilidades de formatação", () => {
    expect(formatClock(90)).toBe("1:30");
    expect(formatClock(-3)).toBe("0:00");
    expect(defaultReps("8-12")).toBe(12);
    expect(defaultReps("10")).toBe(10);
    expect(defaultReps("falha")).toBeNull();
  });
});

describe("splits", () => {
  it("templates têm rótulos únicos", () => {
    for (const days of Object.values(SPLIT_TEMPLATES)) {
      expect(new Set(days.map((d) => d.label)).size).toBe(days.length);
    }
  });
  it("nextDayLabel encontra a próxima letra livre", () => {
    expect(nextDayLabel(["A", "B"])).toBe("C");
    expect(nextDayLabel(["B"])).toBe("A");
  });
});

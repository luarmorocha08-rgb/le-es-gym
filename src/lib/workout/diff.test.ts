import { describe, expect, it } from "vitest";
import { diffPlans, type PlanSnapshot } from "./diff";

const ex = (id: string, over: Partial<PlanSnapshot["days"][number]["exercises"][number]> = {}) => ({
  exercise_id: id, exercise_name: `Ex ${id}`, sets: 3, reps: "10", rest_seconds: 60, target_load_kg: null, notes: null, ...over,
});
const base: PlanSnapshot = {
  title: "Fase 1", split_type: "ABC", goal: null, description: null,
  days: [
    { label: "A", name: "Peito", notes: null, exercises: [ex("1"), ex("2")] },
    { label: "B", name: "Costas", notes: null, exercises: [ex("3")] },
  ],
};

describe("diffPlans", () => {
  it("detecta ausência de mudanças", () => {
    expect(diffPlans(base, structuredClone(base)).hasChanges).toBe(false);
  });

  it("detecta exercícios adicionados, removidos e alterados", () => {
    const next = structuredClone(base);
    next.days[0].exercises = [ex("1", { sets: 4, reps: "8-10", target_load_kg: 40 }), ex("9")];
    const d = diffPlans(base, next).days[0];
    expect(d.status).toBe("alterado");
    expect(d.added).toEqual(["Ex 9"]);
    expect(d.removed).toEqual(["Ex 2"]);
    expect(d.changed.map((c) => c.field)).toEqual(["séries", "repetições", "carga"]);
    expect(d.changed[2]).toMatchObject({ from: "—", to: "40 kg" });
  });

  it("detecta reordenação, dia novo, dia removido e título", () => {
    const next = structuredClone(base);
    next.title = "Fase 2";
    next.days[0].exercises.reverse();
    next.days[1] = { label: "C", name: "Pernas", notes: null, exercises: [ex("5")] };
    const d = diffPlans(base, next);
    expect(d.titleChanged).toEqual({ from: "Fase 1", to: "Fase 2" });
    expect(d.days.find((x) => x.label === "A")?.reordered).toBe(true);
    expect(d.days.find((x) => x.label === "C")?.status).toBe("adicionado");
    expect(d.days.find((x) => x.label === "B")?.status).toBe("removido");
  });
});

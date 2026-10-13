/** Comparação entre duas versões de ficha (snapshots de plan_snapshot()). */

export type SnapshotExercise = {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  target_load_kg: number | null;
  notes: string | null;
};
export type SnapshotDay = { label: string; name: string; notes: string | null; exercises: SnapshotExercise[] };
export type PlanSnapshot = { title: string; split_type: string; goal: string | null; description: string | null; days: SnapshotDay[] };

export type ExerciseChange = { name: string; field: "séries" | "repetições" | "descanso" | "carga" | "observação"; from: string; to: string };
export type DayDiff = {
  label: string;
  name: string;
  status: "adicionado" | "removido" | "alterado" | "igual";
  added: string[];
  removed: string[];
  changed: ExerciseChange[];
  reordered: boolean;
};
export type PlanDiff = { titleChanged: { from: string; to: string } | null; splitChanged: { from: string; to: string } | null; days: DayDiff[]; hasChanges: boolean };

const fmtRest = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}min${s % 60 ? ` ${s % 60}s` : ""}`);
const fmtLoad = (v: number | null) => (v === null ? "—" : `${v} kg`);

function diffDay(before: SnapshotDay | undefined, after: SnapshotDay | undefined): DayDiff {
  if (!before) return { label: after!.label, name: after!.name, status: "adicionado", added: after!.exercises.map((e) => e.exercise_name), removed: [], changed: [], reordered: false };
  if (!after) return { label: before.label, name: before.name, status: "removido", added: [], removed: before.exercises.map((e) => e.exercise_name), changed: [], reordered: false };

  const prev = new Map(before.exercises.map((e) => [e.exercise_id, e]));
  const next = new Map(after.exercises.map((e) => [e.exercise_id, e]));
  const added = after.exercises.filter((e) => !prev.has(e.exercise_id)).map((e) => e.exercise_name);
  const removed = before.exercises.filter((e) => !next.has(e.exercise_id)).map((e) => e.exercise_name);
  const changed: ExerciseChange[] = [];
  for (const e of after.exercises) {
    const p = prev.get(e.exercise_id);
    if (!p) continue;
    if (p.sets !== e.sets) changed.push({ name: e.exercise_name, field: "séries", from: String(p.sets), to: String(e.sets) });
    if (p.reps !== e.reps) changed.push({ name: e.exercise_name, field: "repetições", from: p.reps, to: e.reps });
    if (p.rest_seconds !== e.rest_seconds) changed.push({ name: e.exercise_name, field: "descanso", from: fmtRest(p.rest_seconds), to: fmtRest(e.rest_seconds) });
    if (Number(p.target_load_kg ?? -1) !== Number(e.target_load_kg ?? -1)) changed.push({ name: e.exercise_name, field: "carga", from: fmtLoad(p.target_load_kg), to: fmtLoad(e.target_load_kg) });
    if ((p.notes ?? "") !== (e.notes ?? "")) changed.push({ name: e.exercise_name, field: "observação", from: p.notes ?? "—", to: e.notes ?? "—" });
  }
  const common = after.exercises.filter((e) => prev.has(e.exercise_id)).map((e) => e.exercise_id);
  const commonBefore = before.exercises.filter((e) => next.has(e.exercise_id)).map((e) => e.exercise_id);
  const reordered = common.join() !== commonBefore.join();
  const renamed = before.name !== after.name;
  const status = added.length || removed.length || changed.length || reordered || renamed ? "alterado" : "igual";
  return { label: after.label, name: after.name, status, added, removed, changed, reordered };
}

export function diffPlans(before: PlanSnapshot, after: PlanSnapshot): PlanDiff {
  const labels = [...new Set([...after.days.map((d) => d.label), ...before.days.map((d) => d.label)])];
  const days = labels.map((l) => diffDay(before.days.find((d) => d.label === l), after.days.find((d) => d.label === l)));
  const titleChanged = before.title !== after.title ? { from: before.title, to: after.title } : null;
  const splitChanged = before.split_type !== after.split_type ? { from: before.split_type, to: after.split_type } : null;
  return { titleChanged, splitChanged, days, hasChanges: Boolean(titleChanged || splitChanged || days.some((d) => d.status !== "igual")) };
}

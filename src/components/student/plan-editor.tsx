"use client";

import { ArrowDown, ArrowUp, Check, GripVertical, Loader2, Plus, Search, StickyNote, Trash2, X } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { savePlan } from "@/app/aluno/_actions/plans";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ExerciseSummary, PlanDetail } from "@/lib/student/queries";
import { cn } from "@/lib/utils";
import { GOAL_LABELS, GOALS, muscleLabel, SPLIT_LABELS, SPLIT_TYPES, type SplitType } from "@/lib/workout/constants";
import { nextDayLabel, SPLIT_TEMPLATES } from "@/lib/workout/splits";

type Row = {
  key: string;
  exerciseId: string;
  sets: string;
  reps: string;
  restSeconds: string;
  targetLoadKg: string;
  notes: string;
  showNotes: boolean;
};
type Day = { key: string; label: string; name: string; rows: Row[] };

const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

function newRow(exerciseId: string): Row {
  return { key: uid(), exerciseId, sets: "3", reps: "10-12", restSeconds: "60", targetLoadKg: "", notes: "", showNotes: false };
}

function fromPlan(plan: PlanDetail | null, split: SplitType): Day[] {
  if (plan && plan.days.length) {
    return plan.days.map((d) => ({
      key: uid(),
      label: d.label,
      name: d.name,
      rows: d.exercises.map((e) => ({
        key: uid(),
        exerciseId: e.exercise_id,
        sets: String(e.sets),
        reps: e.reps,
        restSeconds: String(e.rest_seconds),
        targetLoadKg: e.target_load_kg === null ? "" : String(e.target_load_kg),
        notes: e.notes ?? "",
        showNotes: Boolean(e.notes),
      })),
    }));
  }
  return SPLIT_TEMPLATES[split].map((t) => ({ key: uid(), label: t.label, name: t.name, rows: [] }));
}

export function PlanEditor({ plan, catalog }: { plan: PlanDetail | null; catalog: ExerciseSummary[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(plan?.title ?? "");
  const [goal, setGoal] = useState(plan?.goal ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [split, setSplit] = useState<SplitType>((plan?.split_type as SplitType) ?? "ABC");
  const [days, setDays] = useState<Day[]>(() => fromPlan(plan, (plan?.split_type as SplitType) ?? "ABC"));
  const [active, setActive] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const picker = useRef<HTMLDialogElement>(null);

  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);
  const day = days[Math.min(active, days.length - 1)];
  const totalExercises = days.reduce((n, d) => n + d.rows.length, 0);

  function updateDay(i: number, patch: Partial<Day>) {
    setDays((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }
  function updateRow(key: string, patch: Partial<Row>) {
    setDays((ds) => ds.map((d, j) => (j === active ? { ...d, rows: d.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) } : d)));
  }
  function moveRow(index: number, delta: number) {
    const rows = [...day.rows];
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    updateDay(active, { rows });
  }

  function chooseSplit(next: SplitType) {
    if (next === split) return;
    if (totalExercises > 0 && !window.confirm("Trocar a divisão recria os dias e remove os exercícios já adicionados. Continuar?")) return;
    setSplit(next);
    setDays(fromPlan(null, next));
    setActive(0);
  }

  function addDay() {
    if (days.length >= 7) return;
    const label = nextDayLabel(days.map((d) => d.label));
    setDays((ds) => [...ds, { key: uid(), label, name: `Treino ${label}`, rows: [] }]);
    setActive(days.length);
  }

  function removeDay(i: number) {
    if (days.length === 1) return;
    if (days[i].rows.length && !window.confirm(`Remover o dia ${days[i].label} e seus exercícios?`)) return;
    setDays((ds) => ds.filter((_, j) => j !== i));
    setActive((a) => Math.max(0, a >= i ? a - 1 : a));
  }

  function addExercises(ids: string[]) {
    updateDay(active, { rows: [...day.rows, ...ids.map(newRow)] });
  }

  function err(path: string) {
    return errors[path];
  }

  function save() {
    setMessage(null);
    setErrors({});
    start(async () => {
      const result = await savePlan(plan?.id ?? null, {
        title,
        splitType: split,
        goal: goal ? (goal as (typeof GOALS)[number]) : null,
        description,
        days: days.map((d) => ({
          label: d.label,
          name: d.name,
          exercises: d.rows.map((r) => ({
            exerciseId: r.exerciseId,
            sets: r.sets,
            reps: r.reps,
            restSeconds: r.restSeconds,
            targetLoadKg: r.targetLoadKg,
            notes: r.notes,
          })),
        })),
      });
      if (!result.ok) {
        setMessage(result.message);
        setErrors(result.fieldErrors ?? {});
        // leva o usuário ao primeiro dia com erro
        const firstDay = Object.keys(result.fieldErrors ?? {}).map((k) => /^days\.(\d+)/.exec(k)?.[1]).find(Boolean);
        if (firstDay) setActive(Number(firstDay));
        return;
      }
      setSaved(true);
      router.push(`/aluno/meus-treinos/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="pb-28">
      {message && (
        <Alert tone="error" className="mb-6">
          {message}
          {errors.days && <p>{errors.days}</p>}
        </Alert>
      )}

      <section className="grid gap-4 sm:grid-cols-[1fr_240px]">
        <div>
          <Label htmlFor="plan-title">Nome do treino</Label>
          <Input
            id="plan-title"
            className="mt-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Hipertrofia — fase 1"
            maxLength={120}
            aria-invalid={err("title") ? true : undefined}
          />
          {err("title") && <p className="mt-1.5 text-xs text-[var(--color-danger)]">{err("title")}</p>}
        </div>
        <div>
          <Label htmlFor="plan-goal">Objetivo</Label>
          <div className="mt-2">
            <Select id="plan-goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="">Não informar</option>
              {GOALS.map((g) => (
                <option key={g} value={g}>
                  {GOAL_LABELS[g]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <fieldset className="mt-8">
        <legend className="font-heading text-[0.72rem] uppercase tracking-[0.18em] text-white/70">Divisão</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {SPLIT_TYPES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === split}
              onClick={() => chooseSplit(s)}
              className={cn(
                "rounded-full border px-4 py-2 font-heading text-xs uppercase tracking-[0.14em] transition",
                s === split ? "border-white bg-white text-black" : "border-white/15 text-white/70 hover:border-white/40",
              )}
            >
              {SPLIT_LABELS[s]}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Dias */}
      <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Dias do treino">
        {days.map((d, i) => {
          const hasError = Object.keys(errors).some((k) => k.startsWith(`days.${i}.`));
          return (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-left transition",
                i === active ? "border-white bg-white/10" : "border-white/10 hover:border-white/30",
                hasError && "border-[var(--color-danger)]/70",
              )}
            >
              <span className="font-display text-xl leading-none">{d.label}</span>
              <span className="text-xs text-white/50">{d.rows.length} ex.</span>
            </button>
          );
        })}
        {days.length < 7 && (
          <Button type="button" variant="ghost" size="sm" onClick={addDay} aria-label="Adicionar dia">
            <Plus /> Dia
          </Button>
        )}
      </div>

      {day && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6" aria-label={`Dia ${day.label}`}>
          <div className="grid gap-3 sm:grid-cols-[120px_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="day-label">Rótulo</Label>
              <Input
                id="day-label"
                className="mt-2"
                value={day.label}
                maxLength={12}
                onChange={(e) => updateDay(active, { label: e.target.value })}
                aria-invalid={err(`days.${active}.label`) ? true : undefined}
              />
            </div>
            <div>
              <Label htmlFor="day-name">Foco do dia</Label>
              <Input
                id="day-name"
                className="mt-2"
                value={day.name}
                maxLength={80}
                onChange={(e) => updateDay(active, { name: e.target.value })}
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeDay(active)} disabled={days.length === 1}>
              <Trash2 /> Remover dia
            </Button>
          </div>
          {(err(`days.${active}.label`) || err(`days.${active}.name`)) && (
            <p className="mt-2 text-xs text-[var(--color-danger)]">{err(`days.${active}.label`) ?? err(`days.${active}.name`)}</p>
          )}

          {day.rows.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">
              Nenhum exercício neste dia ainda.
            </p>
          ) : (
            <Reorder.Group
              axis="y"
              values={day.rows}
              onReorder={(rows) => updateDay(active, { rows })}
              className="mt-6 space-y-3"
            >
              {day.rows.map((row, i) => (
                <ExerciseRow
                  key={row.key}
                  row={row}
                  index={i}
                  count={day.rows.length}
                  exercise={byId.get(row.exerciseId)}
                  errors={errors}
                  pathPrefix={`days.${active}.exercises.${i}`}
                  onChange={(patch) => updateRow(row.key, patch)}
                  onMove={(delta) => moveRow(i, delta)}
                  onRemove={() => updateDay(active, { rows: day.rows.filter((r) => r.key !== row.key) })}
                />
              ))}
            </Reorder.Group>
          )}

          <Button type="button" variant="outline" className="mt-5 w-full sm:w-auto" onClick={() => picker.current?.showModal()}>
            <Plus /> Adicionar exercícios
          </Button>
        </section>
      )}

      <div className="mt-8">
        <Label htmlFor="plan-description">Observações gerais (opcional)</Label>
        <Textarea
          id="plan-description"
          className="mt-2"
          value={description}
          maxLength={2000}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Aquecimento, cardio, cuidados…"
        />
      </div>

      <ExercisePicker dialogRef={picker} catalog={catalog} onAdd={addExercises} dayLabel={day?.label ?? ""} />

      {/* Barra de salvar */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-white/10 bg-black/85 px-4 py-3 backdrop-blur-xl md:bottom-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <p className="text-sm text-white/55">
            {days.length} {days.length === 1 ? "dia" : "dias"} · {totalExercises} exercícios
          </p>
          <Button type="button" onClick={save} disabled={pending || saved} size="lg">
            {pending ? <Loader2 className="animate-spin" /> : saved ? <Check /> : null}
            {saved ? "Salvo" : "Salvar treino"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExerciseRow({
  row,
  index,
  count,
  exercise,
  errors,
  pathPrefix,
  onChange,
  onMove,
  onRemove,
}: {
  row: Row;
  index: number;
  count: number;
  exercise: ExerciseSummary | undefined;
  errors: Record<string, string>;
  pathPrefix: string;
  onChange: (patch: Partial<Row>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const e = (f: string) => errors[`${pathPrefix}.${f}`];
  const id = (f: string) => `${row.key}-${f}`;
  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      className="rounded-xl border border-white/10 bg-[#0c0d0f] p-3 sm:p-4"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="Arrastar para reordenar"
          className="mt-1 hidden cursor-grab touch-none rounded-md p-1 text-white/40 hover:text-white active:cursor-grabbing sm:block"
          onPointerDown={(ev) => controls.start(ev)}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-heading uppercase leading-tight tracking-[0.04em]">
                <span className="mr-2 text-white/35">{index + 1}.</span>
                {exercise?.name ?? "Exercício indisponível"}
              </p>
              {exercise && <p className="text-xs text-white/45">{exercise.primary_muscles.map(muscleLabel).join(", ")} · {exercise.equipment}</p>}
            </div>
            <div className="flex shrink-0 items-center">
              <button type="button" className="rounded-md p-1.5 text-white/50 hover:text-white disabled:opacity-20" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Mover para cima">
                <ArrowUp className="size-4" />
              </button>
              <button type="button" className="rounded-md p-1.5 text-white/50 hover:text-white disabled:opacity-20" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Mover para baixo">
                <ArrowDown className="size-4" />
              </button>
              <button type="button" className="rounded-md p-1.5 text-white/50 hover:text-[var(--color-danger)]" onClick={onRemove} aria-label="Remover exercício">
                <X className="size-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label htmlFor={id("sets")} className="text-[0.65rem] uppercase tracking-[0.14em] text-white/45">Séries</label>
              <Input id={id("sets")} inputMode="numeric" className="mt-1 h-10" value={row.sets} onChange={(ev) => onChange({ sets: ev.target.value })} aria-invalid={e("sets") ? true : undefined} />
            </div>
            <div>
              <label htmlFor={id("reps")} className="text-[0.65rem] uppercase tracking-[0.14em] text-white/45">Repetições</label>
              <Input id={id("reps")} className="mt-1 h-10" value={row.reps} placeholder="8-12" onChange={(ev) => onChange({ reps: ev.target.value })} aria-invalid={e("reps") ? true : undefined} />
            </div>
            <div>
              <label htmlFor={id("rest")} className="text-[0.65rem] uppercase tracking-[0.14em] text-white/45">Descanso</label>
              <Select id={id("rest")} className="mt-1 h-10" value={row.restSeconds} onChange={(ev) => onChange({ restSeconds: ev.target.value })}>
                {REST_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === 0 ? "Sem descanso" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}min${s % 60 ? ` ${s % 60}s` : ""}`}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor={id("load")} className="text-[0.65rem] uppercase tracking-[0.14em] text-white/45">Carga (kg)</label>
              <Input id={id("load")} inputMode="decimal" className="mt-1 h-10" value={row.targetLoadKg} placeholder="opcional" onChange={(ev) => onChange({ targetLoadKg: ev.target.value.replace(",", ".") })} aria-invalid={e("targetLoadKg") ? true : undefined} />
            </div>
          </div>
          {(e("sets") || e("reps") || e("restSeconds") || e("targetLoadKg") || e("exerciseId")) && (
            <p className="mt-2 text-xs text-[var(--color-danger)]">{e("sets") ?? e("reps") ?? e("restSeconds") ?? e("targetLoadKg") ?? e("exerciseId")}</p>
          )}
          {row.showNotes ? (
            <Textarea
              aria-label="Observações do exercício"
              className="mt-2 min-h-16 text-sm"
              value={row.notes}
              maxLength={500}
              onChange={(ev) => onChange({ notes: ev.target.value })}
              placeholder="Ex.: cadência controlada, pegada fechada…"
            />
          ) : (
            <button type="button" className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white" onClick={() => onChange({ showNotes: true })}>
              <StickyNote className="size-3.5" /> Adicionar observação
            </button>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
}

function ExercisePicker({
  dialogRef,
  catalog,
  onAdd,
  dayLabel,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  catalog: ExerciseSummary[];
  onAdd: (ids: string[]) => void;
  dayLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const muscles = useMemo(() => [...new Set(catalog.flatMap((e) => e.primary_muscles))].sort(), [catalog]);
  const normalized = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const filtered = catalog.filter(
    (e) =>
      (!muscle || e.primary_muscles.includes(muscle) || e.secondary_muscles.includes(muscle)) &&
      (!query || normalized(`${e.name} ${e.primary_muscles.join(" ")} ${e.equipment}`).includes(normalized(query))),
  );

  function close() {
    dialogRef.current?.close();
    setSelected([]);
    setQuery("");
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Adicionar exercícios"
      className="m-auto h-[min(88svh,720px)] w-[min(94vw,640px)] rounded-2xl border border-white/15 bg-[#0b0c0e] p-0 text-white backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      onClose={() => setSelected([])}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg uppercase tracking-[0.08em]">Adicionar ao dia {dayLabel}</h2>
            <button type="button" onClick={close} aria-label="Fechar" className="rounded-md p-1.5 text-white/60 hover:text-white">
              <X className="size-5" />
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px]">
            <label className="relative">
              <span className="sr-only">Buscar</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar exercício" className="h-11 pl-10" />
            </label>
            <Select aria-label="Filtrar por músculo" value={muscle} onChange={(e) => setMuscle(e.target.value)} className="h-11">
              <option value="">Todos</option>
              {muscles.map((m) => (
                <option key={m} value={m}>
                  {muscleLabel(m)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto p-2" data-lenis-prevent>
          {filtered.map((e) => {
            const checked = selected.includes(e.id);
            return (
              <li key={e.id}>
                <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/[0.05]", checked && "bg-white/[0.08]")}>
                  <input
                    type="checkbox"
                    className="size-5 accent-white"
                    checked={checked}
                    onChange={() => setSelected((s) => (checked ? s.filter((x) => x !== e.id) : [...s, e.id]))}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{e.name}</span>
                    <span className="block text-xs text-white/45">
                      {e.primary_muscles.map(muscleLabel).join(", ")} · {e.equipment}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="p-6 text-center text-sm text-white/50">Nenhum exercício encontrado.</li>}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t border-white/10 p-4">
          <span className="text-sm text-white/55">{selected.length} selecionado(s)</span>
          <Button
            type="button"
            disabled={selected.length === 0}
            onClick={() => {
              onAdd(selected);
              close();
            }}
          >
            <Plus /> Adicionar
          </Button>
        </div>
      </div>
    </dialog>
  );
}

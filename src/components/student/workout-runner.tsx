"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Info, ListChecks, Loader2, Minus, Pause, Plus, Timer, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { abandonSession, finishSession, logSet, removeSet, type LoggedSet } from "@/app/aluno/_actions/sessions";
import { ExerciseTile } from "@/components/student/exercise-tile";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Textarea } from "@/components/ui/textarea";
import type { SessionDetail } from "@/lib/student/queries";
import { cn } from "@/lib/utils";
import { muscleLabel } from "@/lib/workout/constants";
import { defaultReps, formatClock } from "@/lib/workout/progress";

type SetsByExercise = Record<string, LoggedSet[]>;

function groupSets(sets: SessionDetail["sets"]): SetsByExercise {
  const out: SetsByExercise = {};
  for (const s of sets) {
    if (!s.workout_exercise_id) continue;
    (out[s.workout_exercise_id] ??= []).push({ id: s.id, workout_exercise_id: s.workout_exercise_id, set_number: s.set_number, reps: s.reps, load_kg: s.load_kg });
  }
  return out;
}

function useElapsed(startedAt: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, (now - new Date(startedAt).getTime()) / 1000);
}

export function WorkoutRunner({ session }: { session: SessionDetail }) {
  const router = useRouter();
  const exercises = session.exercises;
  const [sets, setSets] = useState<SetsByExercise>(() => groupSets(session.sets));
  const firstUnfinished = exercises.findIndex((e) => (sets[e.id]?.length ?? 0) < e.sets);
  const [index, setIndex] = useState(firstUnfinished === -1 ? 0 : firstUnfinished);
  const [rest, setRest] = useState<{ total: number; endsAt: number } | null>(null);
  const [showList, setShowList] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [extra, setExtra] = useState<Record<string, number>>({});
  const elapsed = useElapsed(session.started_at);

  const planned = exercises.reduce((n, e) => n + e.sets, 0);
  const done = exercises.reduce((n, e) => n + Math.min(e.sets, sets[e.id]?.length ?? 0), 0);
  const progress = planned ? done / planned : 0;
  const current = exercises[index];

  if (!current) {
    return <p className="text-white/60">Este treino não tem exercícios. Volte e escolha outro dia.</p>;
  }

  function onLogged(row: LoggedSet, restSeconds: number, isNew: boolean) {
    setSets((prev) => {
      const list = (prev[row.workout_exercise_id] ?? []).filter((s) => s.set_number !== row.set_number);
      return { ...prev, [row.workout_exercise_id]: [...list, row].sort((a, b) => a.set_number - b.set_number) };
    });
    if (isNew && restSeconds > 0) setRest({ total: restSeconds, endsAt: Date.now() + restSeconds * 1000 });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(40);
  }

  function onRemoved(weId: string, setNumber: number) {
    setSets((prev) => ({ ...prev, [weId]: (prev[weId] ?? []).filter((s) => s.set_number !== setNumber) }));
  }

  return (
    <div className="-mt-4 pb-32">
      {/* Cabeçalho do modo treino */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-white/10 bg-black/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-heading text-xs uppercase tracking-[0.18em] text-white/55">
              {session.plan_title} · Treino {session.day_label}
            </p>
            <p className="font-display text-2xl tabular-nums leading-none">{formatClock(elapsed)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowList(true)} aria-label="Lista de exercícios">
              <ListChecks /> {index + 1}/{exercises.length}
            </Button>
            <Button size="sm" onClick={() => setFinishing(true)} disabled={done === 0}>
              Concluir
            </Button>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Progresso do treino" aria-valuemin={0} aria-valuemax={planned} aria-valuenow={done}>
          <motion.div className="h-full rounded-full bg-white" animate={{ width: `${progress * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={current.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="mt-6"
          aria-labelledby="exercicio-atual"
        >
          <div className="flex gap-4">
            <ExerciseTile muscles={current.primary_muscles} className="size-24 shrink-0 sm:size-28" />
            <div className="min-w-0">
              <p className="eyebrow">Exercício {index + 1} de {exercises.length}</p>
              <h1 id="exercicio-atual" className="mt-1 font-display text-4xl uppercase leading-[0.95] sm:text-5xl">
                {current.name}
              </h1>
              <p className="mt-1 text-sm text-white/55">
                {current.sets} × {current.reps} · descanso {current.rest_seconds ? formatClock(current.rest_seconds) : "livre"}
                {current.target_load_kg !== null && ` · alvo ${current.target_load_kg} kg`}
              </p>
              <button type="button" onClick={() => setShowInfo((v) => !v)} className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/70 underline-offset-4 hover:underline" aria-expanded={showInfo}>
                <Info className="size-4" /> Como executar
              </button>
            </div>
          </div>

          {showInfo && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/75">
              <p className="mb-2 text-xs text-white/45">{current.primary_muscles.map(muscleLabel).join(", ")} · {current.equipment}</p>
              <ol className="list-decimal space-y-1.5 pl-5">
                {current.instructions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              {current.video_url && (
                <a href={current.video_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block underline">
                  Ver vídeo demonstrativo
                </a>
              )}
            </div>
          )}
          {current.notes && <p className="mt-4 rounded-xl border border-white/10 px-4 py-3 text-sm italic text-white/70">Observação: {current.notes}</p>}

          <ol className="mt-6 space-y-3">
            {Array.from(
              { length: Math.min(20, Math.max(current.sets, ...(sets[current.id] ?? []).map((s) => s.set_number)) + (extra[current.id] ?? 0)) },
              (_, i) => i + 1,
            ).map((n) => (
              <SetRow
                key={`${current.id}-${n}`}
                sessionId={session.id}
                exercise={current}
                setNumber={n}
                logged={sets[current.id]?.find((s) => s.set_number === n)}
                lastLoad={[...(sets[current.id] ?? [])].reverse().find((s) => s.load_kg !== null)?.load_kg ?? null}
                onLogged={onLogged}
                onRemoved={onRemoved}
              />
            ))}
          </ol>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => setExtra((e) => ({ ...e, [current.id]: (e[current.id] ?? 0) + 1 }))}
          >
            <Plus /> Série extra
          </Button>
        </motion.section>
      </AnimatePresence>

      {/* Navegação entre exercícios */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/90 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl gap-3">
          <Button variant="outline" size="lg" className="flex-1" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <ChevronLeft /> Anterior
          </Button>
          {index < exercises.length - 1 ? (
            <Button size="lg" className="flex-[2]" onClick={() => setIndex((i) => i + 1)}>
              Próximo exercício <ChevronRight />
            </Button>
          ) : (
            <Button size="lg" className="flex-[2]" onClick={() => setFinishing(true)} disabled={done === 0}>
              <Check /> Concluir treino
            </Button>
          )}
        </div>
      </div>

      <RestTimer rest={rest} onClose={() => setRest(null)} onExtend={(s) => setRest((r) => (r ? { total: r.total + s, endsAt: r.endsAt + s * 1000 } : r))} />

      {showList && (
        <ExerciseList
          exercises={exercises}
          sets={sets}
          index={index}
          onPick={(i) => {
            setIndex(i);
            setShowList(false);
          }}
          onClose={() => setShowList(false)}
          sessionId={session.id}
        />
      )}

      {finishing && (
        <FinishDialog
          sessionId={session.id}
          done={done}
          planned={planned}
          onClose={() => setFinishing(false)}
          onFinished={() => router.refresh()}
        />
      )}
    </div>
  );
}

function SetRow({
  sessionId,
  exercise,
  setNumber,
  logged,
  lastLoad,
  onLogged,
  onRemoved,
}: {
  sessionId: string;
  exercise: SessionDetail["exercises"][number];
  setNumber: number;
  logged: LoggedSet | undefined;
  lastLoad: number | null;
  onLogged: (row: LoggedSet, rest: number, isNew: boolean) => void;
  onRemoved: (weId: string, setNumber: number) => void;
}) {
  const previous = exercise.previous[setNumber - 1] ?? exercise.previous[exercise.previous.length - 1];
  const suggestedLoad = lastLoad ?? previous?.load_kg ?? exercise.target_load_kg;
  const [editing, setEditing] = useState(!logged);
  const [reps, setReps] = useState(String(logged?.reps ?? defaultReps(exercise.reps) ?? previous?.reps ?? ""));
  const [load, setLoad] = useState(logged?.load_kg != null ? String(logged.load_kg) : suggestedLoad != null ? String(suggestedLoad) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const touched = useRef(false);

  // Atualiza a carga sugerida quando a série anterior desta sessão muda (até o usuário editar)
  useEffect(() => {
    if (!logged && !touched.current && suggestedLoad != null) setLoad(String(suggestedLoad));
  }, [suggestedLoad, logged]);

  function submit() {
    setError(null);
    start(async () => {
      const r = await logSet({ sessionId, workoutExerciseId: exercise.id, setNumber, reps, loadKg: load.replace(",", ".") });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      onLogged(r.data, exercise.rest_seconds, !logged);
      setEditing(false);
    });
  }

  function undo() {
    if (!logged) return;
    start(async () => {
      const r = await removeSet(logged.id);
      if (r.ok) {
        onRemoved(logged.workout_exercise_id, setNumber);
        setEditing(true);
      } else setError(r.message);
    });
  }

  const step = (setter: (v: string) => void, value: string, delta: number, min = 0) => {
    touched.current = true;
    const n = Math.max(min, (Number(value.replace(",", ".")) || 0) + delta);
    setter(String(Math.round(n * 100) / 100));
  };

  return (
    <li
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        logged && !editing ? "border-white/30 bg-white/[0.07]" : "border-white/10 bg-white/[0.02]",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-heading text-sm uppercase tracking-[0.16em]">
          Série {setNumber}
          {setNumber > exercise.sets && <span className="ml-2 text-white/40">extra</span>}
        </p>
        <p className="text-xs text-white/45">
          {previous ? `Anterior: ${previous.reps} × ${previous.load_kg ?? "—"} kg` : "Sem registro anterior"}
        </p>
      </div>

      {logged && !editing ? (
        <div className="mt-3 flex items-center justify-between">
          <motion.p initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-3 font-display text-3xl tabular-nums">
            <span className="grid size-9 place-items-center rounded-full bg-white text-black">
              <Check className="size-5" />
            </span>
            {logged.reps} × {logged.load_kg ?? "—"}
            <span className="text-base text-white/50">kg</span>
          </motion.p>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button variant="ghost" size="icon" onClick={undo} disabled={pending} aria-label={`Desfazer série ${setNumber}`}>
              <Undo2 />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:gap-3">
          <Stepper label="Repetições" value={reps} onChange={(v) => setReps(v)} onStep={(d) => step(setReps, reps, d)} inputMode="numeric" hint={`alvo ${exercise.reps}`} />
          <Stepper
            label="Carga (kg)"
            value={load}
            onChange={(v) => {
              touched.current = true;
              setLoad(v);
            }}
            onStep={(d) => step(setLoad, load, d * 2.5)}
            inputMode="decimal"
            hint="vazio = peso corporal"
          />
          <Button size="lg" className="h-14 px-5" onClick={submit} disabled={pending || reps === ""} aria-label={`Concluir série ${setNumber}`}>
            {pending ? <Loader2 className="animate-spin" /> : <Check className="!size-5" />}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </li>
  );
}

function Stepper({
  label,
  value,
  onChange,
  onStep,
  inputMode,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onStep: (delta: number) => void;
  inputMode: "numeric" | "decimal";
  hint: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-[0.62rem] uppercase tracking-[0.14em] text-white/45">
        {label}
      </label>
      <div className="mt-1 flex h-14 items-center rounded-xl border border-white/12 bg-white/[0.03]">
        <button type="button" className="grid h-full w-10 place-items-center text-white/60 hover:text-white" onClick={() => onStep(-1)} aria-label={`Diminuir ${label}`}>
          <Minus className="size-4" />
        </button>
        <input
          id={id}
          className="h-full w-full min-w-0 bg-transparent text-center font-display text-2xl tabular-nums outline-none"
          value={value}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={`${id}-dica`}
        />
        <button type="button" className="grid h-full w-10 place-items-center text-white/60 hover:text-white" onClick={() => onStep(1)} aria-label={`Aumentar ${label}`}>
          <Plus className="size-4" />
        </button>
      </div>
      <span id={`${id}-dica`} className="mt-1 block text-[0.62rem] text-white/35">
        {hint}
      </span>
    </div>
  );
}

function RestTimer({ rest, onClose, onExtend }: { rest: { total: number; endsAt: number } | null; onClose: () => void; onExtend: (s: number) => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [rest]);
  const remaining = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0;
  const finished = Boolean(rest) && remaining <= 0;

  useEffect(() => {
    if (finished && typeof navigator !== "undefined") navigator.vibrate?.([200, 100, 200]);
  }, [finished]);

  return (
    <AnimatePresence>
      {rest && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-[#0b0c0e] px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-5 shadow-[0_-30px_60px_rgba(0,0,0,0.8)]"
          role="timer"
          aria-live="polite"
        >
          <div className="mx-auto max-w-md">
            <div className="flex items-center justify-between">
              <p className="eyebrow flex items-center gap-2">
                <Timer className="size-3.5" /> {finished ? "Descanso concluído" : "Descanso"}
              </p>
              <button type="button" onClick={onClose} className="rounded-md p-1 text-white/60 hover:text-white" aria-label="Fechar timer">
                <X className="size-5" />
              </button>
            </div>
            <p className={cn("mt-2 text-center font-display text-7xl tabular-nums", finished && "text-metal")}>{formatClock(remaining)}</p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-white transition-[width] duration-300" style={{ width: `${(1 - remaining / rest.total) * 100}%` }} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="outline" size="lg" onClick={() => onExtend(15)}>
                <Plus /> 15s
              </Button>
              <Button size="lg" onClick={onClose}>
                {finished ? "Próxima série" : <><Pause /> Pular</>}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ExerciseList({
  exercises,
  sets,
  index,
  onPick,
  onClose,
  sessionId,
}: {
  exercises: SessionDetail["exercises"];
  sets: SetsByExercise;
  index: number;
  onPick: (i: number) => void;
  onClose: () => void;
  sessionId: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center" onClick={onClose}>
      <div className="max-h-[80svh] w-full overflow-y-auto rounded-t-3xl border border-white/15 bg-[#0b0c0e] p-5 sm:max-w-md sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Exercícios do treino" data-lenis-prevent>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg uppercase tracking-[0.08em]">Exercícios</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 text-white/60">
            <X className="size-5" />
          </button>
        </div>
        <ol className="space-y-2">
          {exercises.map((e, i) => {
            const n = sets[e.id]?.length ?? 0;
            const complete = n >= e.sets;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onPick(i)}
                  className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left", i === index ? "border-white/50 bg-white/[0.06]" : "border-white/10")}
                >
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm", complete ? "bg-white text-black" : "border border-white/20")}>
                    {complete ? <Check className="size-4" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{e.name}</span>
                  <span className="text-xs tabular-nums text-white/50">
                    {Math.min(n, e.sets)}/{e.sets}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 border-t border-white/10 pt-4">
          <ConfirmAction
            label="Encerrar sem concluir"
            variant="danger"
            title="Encerrar o treino?"
            description="As séries já registradas ficam no histórico, mas o treino não conta como concluído."
            confirmLabel="Encerrar"
            onConfirm={() => abandonSession(sessionId)}
          />
        </div>
      </div>
    </div>
  );
}

function FinishDialog({
  sessionId,
  done,
  planned,
  onClose,
  onFinished,
}: {
  sessionId: string;
  done: number;
  planned: number;
  onClose: () => void;
  onFinished: () => void;
}) {
  const [effort, setEffort] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const efforts = useMemo(() => Array.from({ length: 10 }, (_, i) => i + 1), []);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full rounded-t-3xl border border-white/15 bg-[#0b0c0e] p-6 sm:max-w-md sm:rounded-3xl" role="dialog" aria-labelledby="finish-title">
        <h2 id="finish-title" className="font-display text-4xl uppercase">Concluir treino</h2>
        <p className="mt-2 text-sm text-white/60">
          {done} de {planned} séries planejadas registradas.
          {done < planned && " Você pode concluir mesmo assim."}
        </p>
        <fieldset className="mt-6">
          <legend className="text-[0.7rem] uppercase tracking-[0.16em] text-white/55">Como foi o esforço? (opcional)</legend>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {efforts.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={effort === n}
                onClick={() => setEffort(effort === n ? null : n)}
                className={cn("h-11 rounded-lg border font-display text-lg", effort === n ? "border-white bg-white text-black" : "border-white/15 text-white/70")}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 flex justify-between text-[0.65rem] text-white/40">
            <span>muito leve</span>
            <span>máximo</span>
          </p>
        </fieldset>
        <Textarea className="mt-5 min-h-20" placeholder="Algum comentário para o seu treinador? (opcional)" value={feedback} maxLength={1000} onChange={(e) => setFeedback(e.target.value)} aria-label="Comentário" />
        {error && <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="ghost" size="lg" onClick={onClose}>
            Voltar
          </Button>
          <Button
            size="lg"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await finishSession({ sessionId, perceivedEffort: effort, feedback });
                if (!r.ok) setError(r.message);
                else onFinished();
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Check />} Concluir
          </Button>
        </div>
        <p className="mt-4 text-center text-[0.65rem] text-white/35">Sentiu dor? Interrompa o treino e procure um profissional.</p>
      </div>
    </div>
  );
}

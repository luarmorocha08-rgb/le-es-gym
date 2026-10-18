"use client";

import { ArrowRight, Check, PencilLine, Play, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { adjustMine, generateForMe, saveSuggestion, sendForReview, type SuggestionPayload } from "@/app/aluno/_actions/ai";
import { setAiConsent } from "@/app/aluno/_actions/profile";
import { RevoMark } from "@/components/brand/emblem";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PendingButton } from "@/components/ui/pending-button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/lib/hooks/use-form-action";
import { cn } from "@/lib/utils";
import { GOAL_LABELS, GOALS, LEVEL_LABELS, LEVELS, muscleLabel, type Goal, type Level } from "@/lib/workout/constants";
import { AdjustPanel } from "./adjust-panel";
import { AiThinking } from "./ai-thinking";
import { SuggestionView } from "./suggestion-view";

export type AssistantDefaults = {
  goal: Goal | null;
  level: Level | null;
  daysPerWeek: number | null;
  sessionMinutes: number | null;
  equipment: string[];
  priorityMuscles: string[];
  limitations: string | null;
  avoid: string | null;
  preferences: string | null;
};

type Answers = {
  goal: Goal | null;
  level: Level | null;
  daysPerWeek: number | null;
  sessionMinutes: number | null;
  equipment: string[];
  priorityMuscles: string[];
  limitations: string;
  avoid: string;
  preferences: string;
};

const EQUIPMENT = ["academia completa", "halteres", "barra", "máquinas", "polia", "peso corporal", "elásticos"];
const MUSCLES = ["peito", "costas", "ombros", "biceps", "triceps", "quadriceps", "posteriores", "gluteos", "panturrilhas", "abdomen"];

type StepId = "goal" | "level" | "days" | "minutes" | "equipment" | "muscles" | "limitations" | "avoid" | "preferences";
const STEPS: { id: StepId; question: string; hint?: string }[] = [
  { id: "goal", question: "Qual é o seu objetivo principal?" },
  { id: "level", question: "Como você descreve sua experiência com musculação?" },
  { id: "days", question: "Quantos dias por semana você pode treinar?" },
  { id: "minutes", question: "Quanto tempo você tem por treino?" },
  { id: "equipment", question: "Quais equipamentos você quer usar?", hint: "Na academia você tem tudo — escolha só se quiser restringir." },
  { id: "muscles", question: "Algum grupo muscular é prioridade para você?", hint: "Opcional." },
  { id: "limitations", question: "Você tem alguma limitação física, dor ou lesão que eu deva considerar?", hint: "Opcional. Não substitui avaliação médica." },
  { id: "avoid", question: "Há exercícios que você prefere evitar?", hint: "Opcional." },
  { id: "preferences", question: "Alguma preferência de treino?", hint: "Opcional — ex.: gosto de máquinas, quero treinos rápidos." },
];

const PRESETS = ["Reduzir o volume", "Aumentar o volume", "Treinos mais curtos", "Mudar para Upper / Lower", "Mais foco em pernas", "Só máquinas e polias"];

function answerLabel(id: StepId, a: Answers): string {
  switch (id) {
    case "goal":
      return a.goal ? GOAL_LABELS[a.goal] : "";
    case "level":
      return a.level ? LEVEL_LABELS[a.level] : "";
    case "days":
      return a.daysPerWeek ? `${a.daysPerWeek} ${a.daysPerWeek === 1 ? "dia" : "dias"}` : "";
    case "minutes":
      return a.sessionMinutes ? `${a.sessionMinutes} minutos` : "";
    case "equipment":
      return a.equipment.length ? a.equipment.join(", ") : "Academia completa";
    case "muscles":
      return a.priorityMuscles.length ? a.priorityMuscles.map(muscleLabel).join(", ") : "Sem prioridade";
    case "limitations":
      return a.limitations || "Nenhuma informada";
    case "avoid":
      return a.avoid || "Nenhum";
    case "preferences":
      return a.preferences || "Sem preferências";
  }
}

function Bubble({ from, children }: { from: "ia" | "aluno"; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", from === "aluno" && "justify-end")}
    >
      {from === "ia" && (
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04]" aria-hidden>
          <RevoMark className="size-5 text-white" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          from === "ia" ? "rounded-tl-md border border-white/10 bg-white/[0.04]" : "rounded-br-md bg-white text-black",
        )}
      >
        {children}
      </div>
    </motion.div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition",
        active ? "border-accent bg-accent text-black" : "border-white/15 text-white/80 hover:border-white/50",
      )}
    >
      {children}
    </button>
  );
}

export function StudentAssistant({
  defaults,
  hasConsent,
  trainers,
}: {
  defaults: AssistantDefaults;
  hasConsent: boolean;
  trainers: { user_id: string; full_name: string; accepts_requests: boolean }[];
}) {
  const router = useRouter();
  const initial: Answers = {
    goal: defaults.goal,
    level: defaults.level,
    daysPerWeek: defaults.daysPerWeek,
    sessionMinutes: defaults.sessionMinutes,
    equipment: defaults.equipment,
    priorityMuscles: defaults.priorityMuscles,
    limitations: defaults.limitations ?? "",
    avoid: defaults.avoid ?? "",
    preferences: defaults.preferences ?? "",
  };
  const prefilled = Boolean(defaults.goal && defaults.level && defaults.daysPerWeek && defaults.sessionMinutes);
  const [answers, setAnswers] = useState<Answers>(initial);
  const [step, setStep] = useState(prefilled ? STEPS.length : 0);
  const [draftText, setDraftText] = useState("");
  const [history, setHistory] = useState<SuggestionPayload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [consenting, startConsent] = useTransition();
  const current = history[history.length - 1] ?? null;
  const previous = history.length > 1 ? history[history.length - 2] : null;

  const payload = useMemo(
    () => ({
      goal: answers.goal,
      level: answers.level,
      daysPerWeek: answers.daysPerWeek,
      sessionMinutes: answers.sessionMinutes,
      equipment: answers.equipment.filter((e) => e !== "academia completa"),
      priorityMuscles: answers.priorityMuscles,
      limitations: answers.limitations,
      avoid: answers.avoid,
      preferences: answers.preferences,
    }),
    [answers],
  );

  function next(patch: Partial<Answers>) {
    setAnswers((a) => ({ ...a, ...patch }));
    setDraftText("");
    setStep((s) => s + 1);
  }

  function generate() {
    setError(null);
    start(async () => {
      const r = await generateForMe(payload);
      if (r.ok) setHistory([r.data]);
      else setError(r.message);
    });
  }

  function adjust(instruction: string) {
    if (!current) return;
    setError(null);
    start(async () => {
      const r = await adjustMine(current.generationId, instruction);
      if (r.ok) setHistory((h) => [...h, r.data]);
      else setError(r.message);
    });
  }

  if (!hasConsent) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <ShieldCheck className="size-8 text-white/70" aria-hidden />
        <h2 className="mt-4 font-display text-3xl uppercase">Antes de começar</h2>
        <p className="mt-3 text-sm text-white/70">
          Para gerar uma sugestão, enviamos ao provedor de inteligência artificial apenas os dados de treino necessários:
          objetivo, experiência, disponibilidade, equipamentos, preferências e restrições que você informar, além do seu
          histórico de cargas. <strong className="text-white">Nunca</strong> enviamos nome, e-mail ou telefone.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-white/60">
          <li>O resultado é uma sugestão — não é prescrição profissional nem avaliação de saúde.</li>
          <li>Você pode revogar esta autorização a qualquer momento no seu perfil.</li>
        </ul>
        <Button className="mt-6" disabled={consenting} onClick={() => startConsent(async () => { await setAiConsent(true); router.refresh(); })}>
          <Check /> Autorizo e quero continuar
        </Button>
      </div>
    );
  }

  if (pending && !current) return <AiThinking />;

  if (current) {
    return (
      <div className="space-y-6">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl uppercase text-metal sm:text-4xl">
          {history.length > 1 ? "Ajuste pronto." : "Seu treino está pronto."}
        </motion.p>
        {error && <Alert tone="error">{error}</Alert>}
        <AnimatePresence mode="wait">
          <motion.div key={current.generationId} initial={{ opacity: 0 }} animate={{ opacity: pending ? 0.4 : 1 }} exit={{ opacity: 0 }}>
            <SuggestionView suggestion={current.suggestion} audience="aluno" />
          </motion.div>
        </AnimatePresence>
        {pending && <AiThinking steps={["Ajustando sua rotina…", "Revisando volume e descanso…"]} />}

        <AdjustPanel presets={PRESETS} onAdjust={adjust} pending={pending} previous={previous?.suggestion ?? null} current={current.suggestion} />

        <section className="grid gap-3 sm:grid-cols-3" aria-label="O que fazer com a sugestão">
          <SaveButton generationId={current.generationId} mode="usar" icon={<Play />} label="Começar a usar" primary />
          <SaveButton generationId={current.generationId} mode="editar" icon={<PencilLine />} label="Salvar e editar" />
          <Button variant="ghost" size="lg" onClick={() => { setHistory([]); setStep(0); }}>
            <RotateCcw /> Recomeçar
          </Button>
        </section>
        <ReviewForm generationId={current.generationId} trainers={trainers} />
      </div>
    );
  }

  const active = STEPS[step];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="space-y-4" aria-live="polite">
        <Bubble from="ia">
          Olá! Vou montar uma <strong>sugestão</strong> de treino com você. Ela não substitui a orientação dos nossos profissionais —
          você pode enviá-la para revisão no final.
        </Bubble>
        {prefilled && step === STEPS.length && history.length === 0 && (
          <Bubble from="ia">Usei as informações do seu perfil. Confira o resumo abaixo ou edite as respostas.</Bubble>
        )}
        {STEPS.slice(0, step).map((s) => (
          <div key={s.id} className="space-y-2">
            <Bubble from="ia">{s.question}</Bubble>
            <Bubble from="aluno">{answerLabel(s.id, answers)}</Bubble>
          </div>
        ))}
        {active && (
          <Bubble from="ia">
            {active.question}
            {active.hint && <span className="mt-1 block text-xs text-white/50">{active.hint}</span>}
          </Bubble>
        )}
      </div>

      {active && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          {active.id === "goal" && (
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <Chip key={g} active={answers.goal === g} onClick={() => next({ goal: g })}>
                  {GOAL_LABELS[g]}
                </Chip>
              ))}
            </div>
          )}
          {active.id === "level" && (
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <Chip key={l} active={answers.level === l} onClick={() => next({ level: l })}>
                  {LEVEL_LABELS[l]}
                </Chip>
              ))}
            </div>
          )}
          {active.id === "days" && (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <Chip key={n} active={answers.daysPerWeek === n} onClick={() => next({ daysPerWeek: n })}>
                  {n}
                </Chip>
              ))}
            </div>
          )}
          {active.id === "minutes" && (
            <div className="flex flex-wrap gap-2">
              {[30, 45, 60, 75, 90].map((n) => (
                <Chip key={n} active={answers.sessionMinutes === n} onClick={() => next({ sessionMinutes: n })}>
                  {n} min
                </Chip>
              ))}
            </div>
          )}
          {(active.id === "equipment" || active.id === "muscles") && (
            <MultiPick
              options={active.id === "equipment" ? EQUIPMENT : MUSCLES}
              label={active.id === "muscles" ? muscleLabel : (v) => v.charAt(0).toUpperCase() + v.slice(1)}
              initial={active.id === "equipment" ? answers.equipment : answers.priorityMuscles}
              exclusive={active.id === "equipment" ? "academia completa" : undefined}
              onDone={(values) => next(active.id === "equipment" ? { equipment: values } : { priorityMuscles: values })}
            />
          )}
          {(active.id === "limitations" || active.id === "avoid" || active.id === "preferences") && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                next({ [active.id]: draftText.trim() } as Partial<Answers>);
              }}
              className="space-y-3"
            >
              <label className="block">
                <span className="sr-only">{active.question}</span>
                <Textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} maxLength={active.id === "limitations" ? 800 : 600} placeholder="Escreva aqui…" />
              </label>
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  {draftText.trim() ? "Responder" : "Pular"} <ArrowRight />
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {!active && (
        <div className="mt-6 space-y-4">
          <dl className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm sm:grid-cols-2">
            {STEPS.map((s) => (
              <div key={s.id}>
                <dt className="text-xs text-white/55">{s.question}</dt>
                <dd>{answerLabel(s.id, answers) || "—"}</dd>
              </div>
            ))}
          </dl>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={generate} disabled={pending || !answers.goal || !answers.level || !answers.daysPerWeek || !answers.sessionMinutes}>
              <RevoMark className="size-5" /> Gerar meu treino
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setStep(0)}>
              <PencilLine /> Editar respostas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MultiPick({ options, label, initial, exclusive, onDone }: { options: string[]; label: (v: string) => string; initial: string[]; exclusive?: string; onDone: (v: string[]) => void }) {
  const [values, setValues] = useState<string[]>(initial);
  function toggle(v: string) {
    setValues((cur) => {
      if (v === exclusive) return cur.includes(v) ? [] : [v];
      const without = cur.filter((x) => x !== exclusive);
      return without.includes(v) ? without.filter((x) => x !== v) : [...without, v];
    });
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o} active={values.includes(o)} onClick={() => toggle(o)}>
            {label(o)}
          </Chip>
        ))}
      </div>
      <Button size="sm" onClick={() => onDone(values)}>
        Continuar <ArrowRight />
      </Button>
    </div>
  );
}

function SaveButton({ generationId, mode, icon, label, primary }: { generationId: string; mode: "usar" | "editar"; icon: React.ReactNode; label: string; primary?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        size="lg"
        variant={primary ? "primary" : "outline"}
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await saveSuggestion(generationId, mode);
            if (r && !r.ok) setError(r.message);
          })
        }
      >
        {icon} {label}
      </Button>
      {error && <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

function ReviewForm({ generationId, trainers }: { generationId: string; trainers: { user_id: string; full_name: string; accepts_requests: boolean }[] }) {
  const [state, onSubmit, pending] = useFormAction<{ ok?: boolean; message?: string }>(sendForReview, {});
  const available = trainers.filter((t) => t.accepts_requests);
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-labelledby="revisao">
      <h3 id="revisao" className="eyebrow mb-3 flex items-center gap-2">
        <Send className="size-3.5" aria-hidden /> Enviar para revisão profissional
      </h3>
      {available.length === 0 ? (
        <p className="text-sm text-white/55">Nenhum profissional está recebendo solicitações no momento.</p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[240px_1fr_auto] sm:items-end">
          <input type="hidden" name="generationId" value={generationId} />
          <Field id="rev-trainer" label="Profissional">
            <Select id="rev-trainer" name="trainerId" defaultValue="" required>
              <option value="" disabled>
                Escolha
              </option>
              {available.map((t) => (
                <option key={t.user_id} value={t.user_id}>
                  {t.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="rev-msg" label="Mensagem (opcional)">
            <Textarea id="rev-msg" name="message" className="min-h-12" rows={1} maxLength={1000} />
          </Field>
          <PendingButton pending={pending} className="h-12">
            Enviar
          </PendingButton>
          {state.message && <p className="text-xs text-[var(--color-danger)] sm:col-span-3">{state.message}</p>}
        </form>
      )}
    </section>
  );
}

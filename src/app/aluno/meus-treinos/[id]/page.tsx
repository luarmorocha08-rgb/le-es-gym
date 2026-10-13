import { ArrowLeft, Play, Sparkles, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { startSession } from "@/app/aluno/_actions/sessions";
import { PlanActions } from "@/components/student/plan-actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PendingButton } from "@/components/ui/pending-button";
import { requireArea } from "@/lib/auth/dal";
import { withUser } from "@/lib/db";
import { getPlan } from "@/lib/student/queries";
import { GOAL_LABELS, muscleLabel, PLAN_SOURCE_LABELS, PLAN_STATUS_LABELS, SPLIT_LABELS, type Goal, type SplitType } from "@/lib/workout/constants";
import { nextDayIndex } from "@/lib/workout/progress";

export const metadata: Metadata = { title: "Treino" };

function restLabel(s: number) {
  if (s === 0) return "sem descanso";
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min${s % 60 ? ` ${s % 60}s` : ""}`;
}

export default async function PlanPage({ params }: PageProps<"/aluno/meus-treinos/[id]">) {
  const viewer = await requireArea("aluno");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const plan = await getPlan(viewer.id, id);
  if (!plan) notFound();

  const last = await withUser(viewer.id, (db) =>
    db.one<{ day_id: string | null }>(
      "select day_id from public.workout_sessions where student_id = $1 and plan_id = $2 and status = 'concluida' order by finished_at desc limit 1",
      [viewer.id, id],
    ),
  );
  const next = nextDayIndex(plan.days.map((d) => d.id), last?.day_id);
  const trainable = plan.status !== "arquivado";

  return (
    <div>
      <Link href="/aluno/meus-treinos" className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> Meus treinos
      </Link>

      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            {plan.is_current && <Badge className="border-white bg-white text-black">Treino atual</Badge>}
            <Badge>{PLAN_SOURCE_LABELS[plan.source]}</Badge>
            <Badge>{PLAN_STATUS_LABELS[plan.status] ?? plan.status}</Badge>
            <Badge>{SPLIT_LABELS[plan.split_type as SplitType]}</Badge>
            {plan.goal && <Badge>{GOAL_LABELS[plan.goal as Goal]}</Badge>}
          </div>
          <h1 className="mt-4 font-display text-5xl uppercase leading-[0.95] sm:text-6xl">{plan.title}</h1>
          {plan.source === "profissional" && plan.author_name && (
            <p className="mt-3 flex items-center gap-2 text-sm text-white/60">
              <UserCheck className="size-4" /> Prescrito por {plan.author_name}
              {plan.current_version > 0 && ` · versão ${plan.current_version}`}
            </p>
          )}
        </div>
        <PlanActions planId={plan.id} canEdit={plan.can_edit} isCurrent={plan.is_current} status={plan.status} source={plan.source} />
      </div>

      {plan.source === "ia" && (
        <Alert className="mb-6" title="Sugestão gerada por IA">
          Este treino é uma sugestão automática e não é uma prescrição profissional. Se possível, peça a revisão de um
          profissional da academia.
        </Alert>
      )}
      {plan.description && <p className="mb-8 max-w-2xl whitespace-pre-line text-white/70">{plan.description}</p>}
      {plan.progression_notes && (
        <Alert className="mb-8" title="Progressão">
          <p className="whitespace-pre-line">{plan.progression_notes}</p>
        </Alert>
      )}

      <div className="space-y-5">
        {plan.days.map((day, i) => (
          <section key={day.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6" aria-labelledby={`dia-${day.id}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white font-display text-2xl text-black">{day.label}</span>
                <div>
                  <h2 id={`dia-${day.id}`} className="font-heading text-xl uppercase tracking-[0.04em]">
                    {day.name}
                  </h2>
                  <p className="text-sm text-white/50">
                    {day.exercises.length} {day.exercises.length === 1 ? "exercício" : "exercícios"}
                    {i === next && trainable && <span className="ml-2 text-white">· próximo da sequência</span>}
                  </p>
                </div>
              </div>
              {trainable && day.exercises.length > 0 && (
                <form action={startSession.bind(null, plan.id, day.id)}>
                  <PendingButton size="lg" variant={i === next ? "primary" : "outline"} className="w-full sm:w-auto">
                    <Play className="fill-current" /> Iniciar treino
                  </PendingButton>
                </form>
              )}
            </div>
            <ol className="mt-5 divide-y divide-white/[0.06]">
              {day.exercises.map((e, j) => (
                <li key={e.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/aluno/exercicios/${e.slug}`} className="font-medium hover:underline">
                      <span className="mr-2 text-white/55">{j + 1}.</span>
                      {e.name}
                    </Link>
                    <p className="text-xs text-white/55">{e.primary_muscles.map(muscleLabel).join(", ")}</p>
                    {e.notes && <p className="mt-1 text-xs italic text-white/60">{e.notes}</p>}
                  </div>
                  <p className="shrink-0 text-right text-sm tabular-nums">
                    {e.sets} × {e.reps}
                    <span className="block text-xs text-white/55">
                      {restLabel(e.rest_seconds)}
                      {e.target_load_kg !== null && ` · ${e.target_load_kg} kg`}
                    </span>
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      {plan.source === "profissional" && (
        <p className="mt-8 flex items-center gap-2 text-sm text-white/50">
          <Sparkles className="size-4" /> Para mudar uma prescrição, peça um ajuste ao seu treinador em{" "}
          <Link href="/aluno/solicitar-profissional" className="underline">
            Meu Treinador
          </Link>
          .
        </p>
      )}
    </div>
  );
}

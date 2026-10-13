import { ArrowLeft, GitCompare, History, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanDiffView } from "@/components/trainer/plan-diff";
import { CopyToStudentForm, PublishForm, TrainerPlanActions } from "@/components/trainer/plan-controls";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { requireArea } from "@/lib/auth/dal";
import { muscleLabel, PLAN_SOURCE_LABELS, PLAN_STATUS_LABELS, SPLIT_LABELS, type SplitType } from "@/lib/workout/constants";
import { diffPlans, type PlanSnapshot } from "@/lib/workout/diff";
import { getTrainerPlan, listStudents } from "@/lib/trainer/queries";

export const metadata: Metadata = { title: "Ficha" };

const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const rest = (s: number) => (s === 0 ? "sem descanso" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}min${s % 60 ? ` ${s % 60}s` : ""}`);

export default async function TrainerPlanPage({ params }: PageProps<"/profissional/fichas/[id]">) {
  const viewer = await requireArea("profissional");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [plan, students] = await Promise.all([getTrainerPlan(viewer.id, id), listStudents(viewer.id)]);
  if (!plan) notFound();

  const diff =
    plan.based_on_snapshot && plan.snapshot ? diffPlans(plan.based_on_snapshot as PlanSnapshot, plan.snapshot as PlanSnapshot) : null;
  const isDraft = plan.status === "rascunho" && !plan.is_template;
  const hasExercises = plan.days.some((d) => d.exercises.length > 0);

  return (
    <div className="space-y-6">
      <Link href={plan.student_id ? `/profissional/alunos/${plan.student_id}` : "/profissional/fichas"} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> {plan.student_name ?? "Fichas"}
      </Link>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            {plan.is_template ? <Badge>Modelo</Badge> : <Badge className={isDraft ? "border-white text-white" : ""}>{PLAN_STATUS_LABELS[plan.status]}</Badge>}
            <Badge>{PLAN_SOURCE_LABELS[plan.source]}</Badge>
            <Badge>{SPLIT_LABELS[plan.split_type as SplitType]}</Badge>
            {plan.current_version > 0 && <Badge>Versão {plan.current_version}</Badge>}
            {plan.based_on_plan_id && <Badge>Nova versão em preparo</Badge>}
          </div>
          <h1 className="mt-3 font-display text-5xl uppercase leading-[0.95]">{plan.title}</h1>
          {plan.student_name && <p className="mt-2 text-white/60">Aluno: {plan.student_name}</p>}
          {plan.request_id && (
            <Link href={`/profissional/solicitacoes/${plan.request_id}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/60 underline-offset-4 hover:underline">
              <Inbox className="size-4" /> Ligada a uma solicitação
            </Link>
          )}
        </div>
        {plan.is_mine && (
          <TrainerPlanActions planId={plan.id} status={plan.status} isTemplate={plan.is_template} isMine={plan.is_mine} canEdit={plan.can_edit} />
        )}
      </div>

      {isDraft && plan.is_mine && (
        <div className="flex flex-col gap-4 rounded-2xl border border-white/20 bg-white/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/70">
            <strong className="text-white">Rascunho:</strong> o aluno ainda não vê esta ficha. Revise e publique quando estiver pronta.
          </p>
          {hasExercises ? (
            <PublishForm planId={plan.id} studentName={plan.student_name ?? "o aluno"} isUpdate={Boolean(plan.based_on_plan_id)} />
          ) : (
            <p className="text-sm text-white/50">Adicione exercícios para publicar.</p>
          )}
        </div>
      )}
      {plan.status === "publicado" && !plan.is_template && (
        <Alert tone="success" title={`Publicada${plan.published_at ? ` em ${fmt.format(new Date(plan.published_at))}` : ""}`}>
          O aluno já vê esta ficha como treino atual. Para alterar, crie uma nova versão — esta continua valendo até a próxima publicação.
        </Alert>
      )}
      {plan.source === "ia" && (
        <Alert title="Sugestão gerada por IA">Revise e ajuste antes de publicar. A publicação é sempre uma decisão sua.</Alert>
      )}

      {plan.is_template && plan.is_mine && (
        <div className="rounded-2xl border border-white/10 p-5">
          <p className="mb-3 text-sm text-white/65">Crie um rascunho a partir deste modelo para um aluno vinculado:</p>
          <CopyToStudentForm planId={plan.id} students={students} />
        </div>
      )}
      {!plan.is_template && plan.is_mine && (
        <CopyToStudentForm planId={plan.id} students={students} label="Duplicar para outro aluno" />
      )}

      {diff && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-labelledby="comparacao">
          <h2 id="comparacao" className="eyebrow mb-4 flex items-center gap-2">
            <GitCompare className="size-3.5" aria-hidden /> Comparação com a versão publicada
          </h2>
          <PlanDiffView diff={diff} fromLabel="versão publicada" toLabel="esta versão" />
        </section>
      )}

      {plan.description && <p className="max-w-2xl whitespace-pre-line text-white/70">{plan.description}</p>}

      <div className="space-y-4">
        {plan.days.map((day) => (
          <section key={day.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-label={`Dia ${day.label}`}>
            <h2 className="flex items-center gap-3 font-heading text-lg uppercase tracking-[0.04em]">
              <span className="grid size-10 place-items-center rounded-xl bg-white font-display text-black">{day.label}</span> {day.name}
            </h2>
            {day.exercises.length === 0 ? (
              <p className="mt-3 text-sm text-white/45">Sem exercícios.</p>
            ) : (
              <ol className="mt-4 divide-y divide-white/[0.06]">
                {day.exercises.map((e, i) => (
                  <li key={e.id} className="flex justify-between gap-4 py-2.5 text-sm">
                    <span>
                      <span className="mr-2 text-white/35">{i + 1}.</span>
                      {e.name}
                      <span className="block text-xs text-white/45">{e.primary_muscles.map(muscleLabel).join(", ")}</span>
                      {e.notes && <span className="block text-xs italic text-white/60">{e.notes}</span>}
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      {e.sets} × {e.reps}
                      <span className="block text-xs text-white/45">
                        {rest(e.rest_seconds)}
                        {e.target_load_kg !== null && ` · ${e.target_load_kg} kg`}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>

      {plan.versions.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-labelledby="versoes">
          <h2 id="versoes" className="eyebrow mb-3 flex items-center gap-2">
            <History className="size-3.5" aria-hidden /> Histórico de publicações
          </h2>
          <ol className="space-y-2 text-sm">
            {plan.versions.map((v) => (
              <li key={`${v.plan_id}-${v.version}`} className="flex flex-wrap justify-between gap-2 border-b border-white/[0.06] pb-2">
                <span>
                  <strong>Versão {v.version}</strong>
                  {v.change_note && <span className="text-white/65"> — {v.change_note}</span>}
                </span>
                <span className="text-xs text-white/45">
                  {v.author_name ?? "—"} · {fmt.format(new Date(v.created_at))}
                  {v.plan_id !== plan.id && (
                    <Link href={`/profissional/fichas/${v.plan_id}`} className="ml-2 underline">
                      ver
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

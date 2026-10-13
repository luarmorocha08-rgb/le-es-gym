import { Activity, ArrowLeft, ClipboardList, HeartPulse, LineChart as LineIcon, NotebookPen, Plus, Ruler, Target, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart } from "@/components/charts/charts";
import { LoadEvolution } from "@/components/student/load-evolution";
import { TrainerNotes } from "@/components/trainer/notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/auth/dal";
import { getStudentForTrainer } from "@/lib/trainer/queries";
import { GOAL_LABELS, LEVEL_LABELS, MEASUREMENTS, PLAN_SOURCE_LABELS, PLAN_STATUS_LABELS, REQUEST_STATUS_LABELS, type Goal, type Level } from "@/lib/workout/constants";
import { loadSeries, personalRecords, weeklyFrequency } from "@/lib/workout/progress";

export const metadata: Metadata = { title: "Aluno" };

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });
const kg = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function Card({ icon: Icon, title, children, className }: { icon: typeof Activity; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.02] p-5 ${className ?? ""}`} aria-label={title}>
      <h2 className="eyebrow mb-4 flex items-center gap-2">
        <Icon className="size-3.5" aria-hidden /> {title}
      </h2>
      {children}
    </section>
  );
}

export default async function TrainerStudentPage({ params }: PageProps<"/profissional/alunos/[id]">) {
  const viewer = await requireArea("profissional");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getStudentForTrainer(viewer.id, id);
  if (!data) notFound();
  const { profile: p } = data;

  const freq = weeklyFrequency(data.sessions.map((s) => s.finished_at), 12);
  const records = personalRecords(data.sets);
  const series = [...new Set(data.sets.filter((s) => s.loadKg !== null).map((s) => s.exerciseId))]
    .map((eid) => ({ id: eid, name: data.sets.find((s) => s.exerciseId === eid)!.exerciseName, points: loadSeries(data.sets, eid) }))
    .sort((a, b) => b.points.length - a.points.length);
  const current = data.plans.find((pl) => pl.id === p.current_plan_id);

  return (
    <div className="space-y-5">
      <Link href="/profissional/alunos" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> Meus alunos
      </Link>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-5xl uppercase leading-[0.95] sm:text-6xl">{p.full_name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{p.goal ? GOAL_LABELS[p.goal as Goal] : "Objetivo não informado"}</Badge>
            {p.experience_level && <Badge>{LEVEL_LABELS[p.experience_level as Level]}</Badge>}
            {p.days_per_week && <Badge>{p.days_per_week}x/semana</Badge>}
            {p.session_minutes && <Badge>{p.session_minutes} min</Badge>}
          </div>
        </div>
        <Button asChild>
          <Link href={`/profissional/criar-treino?aluno=${p.id}`}>
            <Plus /> Montar ficha
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card icon={ClipboardList} title="Fichas">
          {current && (
            <p className="mb-3 text-sm">
              Treino atual: <Link href={`/profissional/fichas/${current.id}`} className="font-medium underline">{current.title}</Link>{" "}
              <span className="text-white/45">({PLAN_SOURCE_LABELS[current.source]})</span>
            </p>
          )}
          {data.plans.length === 0 ? (
            <p className="text-sm text-white/50">O aluno ainda não tem fichas visíveis para você.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {data.plans.map((pl) => (
                <li key={pl.id}>
                  <Link href={`/profissional/fichas/${pl.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:opacity-80">
                    <span>
                      {pl.title}
                      <span className="block text-xs text-white/45">
                        {PLAN_SOURCE_LABELS[pl.source]}
                        {pl.author_name && pl.source === "profissional" ? ` · ${pl.author_name}` : ""}
                        {pl.current_version > 0 ? ` · v${pl.current_version}` : ""}
                      </span>
                    </span>
                    <Badge>{PLAN_STATUS_LABELS[pl.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card icon={HeartPulse} title="Saúde e preferências declaradas">
          {!data.health ? (
            <p className="text-sm text-white/50">O aluno não declarou informações de saúde (ou não autorizou o tratamento).</p>
          ) : (
            <dl className="space-y-3 text-sm">
              {[
                ["Limitações", data.health.limitations],
                ["Evitar", data.health.exercises_to_avoid],
                ["Preferências", data.health.preferences],
                ["Equipamentos", data.health.available_equipment.join(", ")],
                ["Prioridades", data.health.priority_muscles.join(", ")],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-white/45">{k}</dt>
                    <dd className="whitespace-pre-line text-white/80">{v}</dd>
                  </div>
                ))}
              <p className="text-xs text-white/40">Dado sensível informado pelo aluno. Em caso de dor ou condição clínica, oriente avaliação adequada.</p>
            </dl>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card icon={Activity} title="Frequência semanal">
          {data.sessions.length === 0 ? (
            <p className="text-sm text-white/50">Ainda sem treinos concluídos.</p>
          ) : (
            <BarChart
              title={`Treinos por semana — ${p.full_name}`}
              unit="treinos"
              unitOne="treino"
              integer
              points={freq.map((b) => ({ label: shortDate.format(new Date(`${b.week}T00:00:00Z`)), detail: `Semana de ${shortDate.format(new Date(`${b.week}T00:00:00Z`))}`, value: b.count }))}
            />
          )}
        </Card>
        <Card icon={LineIcon} title="Evolução de cargas">
          {series.length ? <LoadEvolution series={series} /> : <p className="text-sm text-white/50">Sem cargas registradas.</p>}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card icon={Activity} title="Histórico e feedback">
          {data.sessions.length === 0 ? (
            <p className="text-sm text-white/50">Nenhuma sessão concluída.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-white/[0.06] overflow-y-auto" data-lenis-prevent>
              {data.sessions.map((s) => (
                <li key={s.id} className="py-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <span>
                      {s.plan_title ?? "Treino"} · {s.day_label}
                      <span className="block text-xs text-white/45">{longDate.format(new Date(s.finished_at))}</span>
                    </span>
                    <span className="text-right text-xs tabular-nums text-white/60">
                      {s.sets} {s.sets === 1 ? "série" : "séries"} · {kg.format(s.volume)} kg
                      {s.perceived_effort && <span className="block">esforço {s.perceived_effort}/10</span>}
                    </span>
                  </div>
                  {s.feedback && <p className="mt-1 text-xs italic text-white/65">“{s.feedback}”</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card icon={Trophy} title="Recordes">
          {records.length === 0 ? (
            <p className="text-sm text-white/50">Sem recordes registrados.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06] text-sm">
              {records.map((r) => (
                <li key={r.exerciseId} className="flex justify-between py-2">
                  <span>{r.exerciseName}</span>
                  <span className="tabular-nums">
                    {kg.format(r.loadKg!)} kg × {r.reps}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card icon={Target} title="Metas do aluno">
          {data.goals.length === 0 ? (
            <p className="text-sm text-white/50">Sem metas cadastradas.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.goals.map((g) => (
                <li key={g.id} className={g.achieved_at ? "text-white/45 line-through" : ""}>
                  {g.title}
                  {g.target_value !== null && ` — ${g.target_value} ${g.unit ?? ""}`}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card icon={Ruler} title="Medidas compartilhadas">
          {data.progress.length === 0 ? (
            <p className="text-sm text-white/50">O aluno não compartilhou medidas com você.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06] text-sm">
              {data.progress.map((r) => (
                <li key={r.id} className="py-2">
                  <span className="text-white/55">{shortDate.format(new Date(`${r.recorded_on}T00:00:00Z`))}</span> ·{" "}
                  {[r.weight_kg !== null && `${r.weight_kg} kg`, r.body_fat_pct !== null && `${r.body_fat_pct}% gord.`, ...MEASUREMENTS.filter((m) => r.measurements?.[m.key]).map((m) => `${m.label.replace(" (cm)", "")} ${r.measurements[m.key]} cm`)]
                    .filter(Boolean)
                    .join(" · ")}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card icon={NotebookPen} title="Observações profissionais">
          <TrainerNotes studentId={p.id} notes={data.notes} />
        </Card>
        <Card icon={ClipboardList} title="Solicitações deste aluno">
          {data.requests.length === 0 ? (
            <p className="text-sm text-white/50">Nenhuma solicitação.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {data.requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/profissional/solicitacoes/${r.id}`} className="flex justify-between py-2.5 text-sm hover:opacity-80">
                    {longDate.format(new Date(r.created_at))}
                    <Badge>{REQUEST_STATUS_LABELS[r.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

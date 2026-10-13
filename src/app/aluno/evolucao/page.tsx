import { Activity, Flame, LineChart as LineIcon, Lock, Ruler, Target, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BarChart, LineChart } from "@/components/charts/charts";
import { LoadEvolution } from "@/components/student/load-evolution";
import { DeleteProgress, GoalForm, GoalItem, ProgressForm } from "@/components/student/progress-forms";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireArea } from "@/lib/auth/dal";
import { withUser } from "@/lib/db";
import { getEvolution } from "@/lib/student/queries";
import { MEASUREMENTS } from "@/lib/workout/constants";
import { loadSeries, localDate, personalRecords, weekStart, weeklyFrequency, withinLastDays } from "@/lib/workout/progress";

export const metadata: Metadata = { title: "Minha evolução" };

const kg = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });

function Section({ id, icon: Icon, title, children }: { id?: string; icon: typeof Activity; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6" aria-labelledby={`${id ?? title}-t`}>
      <h2 id={`${id ?? title}-t`} className="eyebrow mb-4 flex items-center gap-2">
        <Icon className="size-3.5" aria-hidden /> {title}
      </h2>
      {children}
    </section>
  );
}

export default async function EvolutionPage() {
  const viewer = await requireArea("aluno");
  const [data, consent] = await Promise.all([
    getEvolution(viewer.id),
    withUser(viewer.id, (db) => db.one<{ ok: boolean }>("select health_data_consent_at is not null as ok from public.profiles where id = $1", [viewer.id])),
  ]);

  const freq = weeklyFrequency(data.sessions.map((s) => s.finished_at), 12);
  const volumeByWeek = new Map<string, number>();
  for (const s of data.sessions) volumeByWeek.set(weekStart(s.finished_at), (volumeByWeek.get(weekStart(s.finished_at)) ?? 0) + s.volume);
  const records = personalRecords(data.sets);
  const exerciseIds = [...new Set(data.sets.filter((s) => s.loadKg !== null).map((s) => s.exerciseId))];
  const series = exerciseIds
    .map((id) => ({ id, name: data.sets.find((s) => s.exerciseId === id)!.exerciseName, points: loadSeries(data.sets, id) }))
    .sort((a, b) => b.points.length - a.points.length || a.name.localeCompare(b.name, "pt-BR"));
  const last30 = withinLastDays(data.sessions, (s) => s.finished_at, 30);
  const weights = data.progress.filter((p) => p.weight_kg !== null).reverse();

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Evolução" title="Minha evolução">
        Constância, cargas e metas — o seu progresso, sem comparações.
      </PageHeader>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Treinos (30 dias)", value: String(last30.length), icon: Activity },
          { label: "Volume (30 dias)", value: `${kg.format(last30.reduce((n, s) => n + s.volume, 0))} kg`, icon: Flame },
          { label: "Exercícios com carga", value: String(series.length), icon: LineIcon },
          { label: "Metas concluídas", value: String(data.goals.filter((g) => g.achieved_at).length), icon: Target },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <s.icon className="size-4 text-white/50" aria-hidden />
            <dd className="mt-3 font-display text-3xl leading-none tabular-nums">{s.value}</dd>
            <dt className="mt-1 text-[0.65rem] uppercase tracking-[0.14em] text-white/45">{s.label}</dt>
          </div>
        ))}
      </dl>

      {data.sessions.length === 0 ? (
        <EmptyState icon={Activity} title="Sua evolução começa no primeiro treino" action={<Button asChild><Link href="/aluno/meus-treinos">Ir para meus treinos</Link></Button>}>
          Conclua treinos no modo treino para ver frequência, cargas, volume e recordes.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Section icon={Activity} title="Frequência semanal">
              <BarChart
                title="Treinos concluídos por semana (12 semanas)"
                unit="treinos"
                unitOne="treino"
            integer
                points={freq.map((b) => ({ label: shortDate.format(new Date(`${b.week}T00:00:00Z`)), detail: `Semana de ${shortDate.format(new Date(`${b.week}T00:00:00Z`))}`, value: b.count }))}
              />
            </Section>
            <Section icon={Flame} title="Volume semanal (séries × reps × carga)">
              <BarChart
                title="Volume por semana em kg (12 semanas)"
                unit="kg"
                points={freq.map((b) => ({ label: shortDate.format(new Date(`${b.week}T00:00:00Z`)), detail: `Semana de ${shortDate.format(new Date(`${b.week}T00:00:00Z`))}`, value: Math.round(volumeByWeek.get(b.week) ?? 0) }))}
              />
            </Section>
          </div>

          <Section icon={LineIcon} title="Evolução de cargas">
            {series.length ? <LoadEvolution series={series} /> : <p className="text-sm text-white/50">Registre cargas no modo treino para acompanhar a evolução.</p>}
          </Section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section icon={Trophy} title="Recordes registrados">
              {records.length === 0 ? (
                <p className="text-sm text-white/50">Seus recordes aparecem quando você registra cargas.</p>
              ) : (
                <table className="w-full text-sm">
                  <caption className="sr-only">Maior carga por exercício</caption>
                  <thead>
                    <tr className="text-left text-xs text-white/40">
                      <th className="pb-2 font-normal">Exercício</th>
                      <th className="pb-2 text-right font-normal">Carga</th>
                      <th className="pb-2 text-right font-normal">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.exerciseId} className="border-t border-white/[0.06]">
                        <td className="py-2">{r.exerciseName}</td>
                        <td className="py-2 text-right tabular-nums">
                          {kg.format(r.loadKg!)} kg × {r.reps}
                        </td>
                        <td className="py-2 text-right text-white/50">{shortDate.format(new Date(`${localDate(r.date)}T00:00:00Z`))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
            <Section icon={Activity} title="Histórico de treinos">
              <ul className="max-h-96 divide-y divide-white/[0.06] overflow-y-auto" data-lenis-prevent>
                {data.sessions.map((s) => (
                  <li key={s.id}>
                    <Link href={`/aluno/treino/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                      <span>
                        <span className="block text-sm">
                          {s.plan_title ?? "Treino"} · {s.day_label}
                        </span>
                        <span className="block text-xs text-white/45">{longDate.format(new Date(s.finished_at))}</span>
                      </span>
                      <span className="text-right text-xs tabular-nums text-white/60">
                        {s.sets} {s.sets === 1 ? "série" : "séries"}
                        <span className="block">{kg.format(s.volume)} kg</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </>
      )}

      <Section id="metas" icon={Target} title="Metas pessoais">
        <GoalForm />
        {data.goals.length > 0 && (
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {data.goals.map((g) => (
              <GoalItem key={g.id} goal={g} />
            ))}
          </ul>
        )}
      </Section>

      <Section id="medidas" icon={Ruler} title="Medidas corporais (opcional e privado)">
        {!consent?.ok ? (
          <Alert title="Autorização necessária">
            <p>
              Medidas corporais são dados sensíveis. Para registrá-las, autorize o tratamento de dados de saúde em{" "}
              <Link href="/aluno/perfil#saude" className="underline">
                Perfil
              </Link>
              . Você pode revogar e excluir a qualquer momento.
            </p>
          </Alert>
        ) : (
          <>
            <p className="mb-4 flex items-center gap-2 text-xs text-white/45">
              <Lock className="size-3.5" /> Visível só para você — e para seu treinador apenas nos registros que você compartilhar. Fotos de progresso chegam em breve.
            </p>
            {weights.length >= 2 && (
              <div className="mb-6">
                <LineChart
                  title="Peso corporal (kg)"
                  unit="kg"
                  points={weights.map((p) => ({ label: shortDate.format(new Date(`${p.recorded_on}T00:00:00Z`)), value: p.weight_kg! }))}
                />
              </div>
            )}
            <ProgressForm />
            {data.progress.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <caption className="sr-only">Registros de medidas</caption>
                  <thead>
                    <tr className="text-left text-xs text-white/40">
                      <th className="pb-2 font-normal">Data</th>
                      <th className="pb-2 font-normal">Peso</th>
                      <th className="pb-2 font-normal">% gord.</th>
                      {MEASUREMENTS.map((m) => (
                        <th key={m.key} className="pb-2 font-normal">
                          {m.label.replace(" (cm)", "")}
                        </th>
                      ))}
                      <th className="pb-2 font-normal">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {data.progress.map((p) => (
                      <tr key={p.id} className="border-t border-white/[0.06]">
                        <td className="py-2">{shortDate.format(new Date(`${p.recorded_on}T00:00:00Z`))}</td>
                        <td className="py-2">{p.weight_kg ?? "—"}</td>
                        <td className="py-2">{p.body_fat_pct ?? "—"}</td>
                        {MEASUREMENTS.map((m) => (
                          <td key={m.key} className="py-2">
                            {p.measurements?.[m.key] ?? "—"}
                          </td>
                        ))}
                        <td className="py-1 text-right">
                          <DeleteProgress id={p.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Section>
      <p className="text-center text-xs text-white/35">
        Respeite seu corpo: dor persistente, cansaço excessivo ou queda de desempenho são sinais para conversar com um profissional.
      </p>
    </div>
  );
}

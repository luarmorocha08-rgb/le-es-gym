import { ArrowRight, Check, ChevronRight, Dumbbell, Play, Plus, Target, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { startSession } from "@/app/aluno/_actions/sessions";
import { BarChart, ProgressRing } from "@/components/charts/charts";
import { greeting } from "@/components/layout/portal-shell";
import { CountUp } from "@/components/motion/count-up";
import { NotificationsList } from "@/components/student/notifications-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { requireArea } from "@/lib/auth/dal";
import { getDashboard, getOpenSession } from "@/lib/student/queries";
import { REQUEST_STATUS_LABELS } from "@/lib/workout/constants";
import { currentWeekDays, localDate, nextDayIndex, weeklyFrequency } from "@/lib/workout/progress";

export const metadata: Metadata = { title: "Início" };

const WEEK_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"];
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const kg = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export default async function StudentDashboard() {
  const viewer = await requireArea("aluno");
  const [data, open] = await Promise.all([getDashboard(viewer.id), getOpenSession(viewer.id)]);
  const firstName = viewer.fullName.split(" ")[0];

  const week = currentWeekDays();
  const today = localDate(new Date());
  const trainedDays = new Set(data.sessions.map((s) => localDate(s.finished_at)));
  const weekCount = week.filter((d) => trainedDays.has(d)).length;
  const weekVolume = data.sessions.filter((s) => week.includes(localDate(s.finished_at))).reduce((n, s) => n + s.volume, 0);
  const target = data.daysPerWeek ?? Math.max(3, data.plan?.days.length ?? 3);
  const freq = weeklyFrequency(data.sessions.map((s) => s.finished_at), 8);

  const plan = data.plan;
  const nextIdx = plan ? nextDayIndex(plan.days.map((d) => d.id), data.lastCompletedDayId) : -1;
  const nextDay = plan && nextIdx >= 0 ? plan.days[nextIdx] : null;
  const afterDay = plan && plan.days.length > 1 ? plan.days[(nextIdx + 1) % plan.days.length] : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{greeting()},</p>
        <h1 className="mt-1 font-display text-6xl uppercase leading-none sm:text-7xl">{firstName}</h1>
        {viewer.professionalStatus === "pendente" && (
          <p className="mt-3 text-sm text-white/55">Seu cadastro profissional está em análise pela administração.</p>
        )}
      </div>

      {/* Card principal */}
      <section className="grain relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#3ee6ff,#8a7dff)] p-6 text-black sm:p-8" aria-labelledby="treino-do-dia">
        <div className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.08),transparent_70%)]" />
        {open ? (
          <>
            <p className="font-heading text-xs uppercase tracking-[0.2em] text-black/55">Treino em andamento</p>
            <h2 id="treino-do-dia" className="mt-2 font-display text-4xl uppercase leading-[0.95] sm:text-5xl">
              Continue de onde parou.
            </h2>
            <p className="mt-2 text-black/60">
              {open.plan_title} · Treino {open.day_label}
            </p>
            <Button asChild size="lg" className="mt-6 bg-black text-white hover:bg-black/85">
              <Link href={`/aluno/treino/${open.id}`}>
                <Play className="fill-current" /> Continuar treino
              </Link>
            </Button>
          </>
        ) : plan && nextDay ? (
          <>
            <p className="font-heading text-xs uppercase tracking-[0.2em] text-black/55">
              Treino do dia · {plan.title}
            </p>
            <h2 id="treino-do-dia" className="mt-2 font-display text-4xl uppercase leading-[0.95] sm:text-5xl">
              Pronto para mais uma conquista?
            </h2>
            <p className="mt-3 text-black/70">
              <strong className="font-display text-xl">Treino {nextDay.label}</strong> — {nextDay.name} · {nextDay.exercises.length} {nextDay.exercises.length === 1 ? "exercício" : "exercícios"}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <form action={startSession.bind(null, plan.id, nextDay.id)}>
                <PendingButton size="lg" className="bg-black text-white shadow-none hover:bg-black/85">
                  <Play className="fill-current" /> Iniciar treino
                </PendingButton>
              </form>
              <Button asChild size="lg" variant="ghost" className="text-black hover:bg-black/5 hover:text-black">
                <Link href={`/aluno/meus-treinos/${plan.id}`}>Ver ficha</Link>
              </Button>
            </div>
            {afterDay && afterDay.id !== nextDay.id && (
              <p className="mt-5 text-sm text-black/60">
                Próximo: Treino {afterDay.label} — {afterDay.name}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="font-heading text-xs uppercase tracking-[0.2em] text-black/55">Comece por aqui</p>
            <h2 id="treino-do-dia" className="mt-2 font-display text-4xl uppercase leading-[0.95] sm:text-5xl">
              Monte seu primeiro treino.
            </h2>
            <p className="mt-3 max-w-md text-black/65">Escolha uma divisão e os exercícios, ou peça um treino personalizado a um profissional da academia.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-black text-white hover:bg-black/85">
                <Link href="/aluno/criar-treino">
                  <Plus /> Montar treino
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-black hover:bg-black/5 hover:text-black">
                <Link href="/aluno/solicitar-profissional">
                  <UserCheck /> Pedir a um profissional
                </Link>
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Semana */}
      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="eyebrow">Esta semana</h2>
              <p className="mt-2 text-sm text-white/60">
                {weekCount === 0 ? "Nenhum treino ainda — bora começar?" : `${weekCount} ${weekCount === 1 ? "treino" : "treinos"} · ${kg.format(weekVolume)} kg de volume`}
              </p>
            </div>
            <ProgressRing value={weekCount} max={target} label={`${weekCount} de ${target} treinos na semana`} />
          </div>
          <ol className="mt-5 grid grid-cols-7 gap-1.5" aria-label="Calendário da semana">
            {week.map((d, i) => {
              const done = trainedDays.has(d);
              const isToday = d === today;
              return (
                <li key={d} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[0.65rem] ${isToday ? "text-white" : "text-white/55"}`}>{WEEK_LETTERS[i]}</span>
                  <span
                    className={`grid aspect-square w-full max-w-11 place-items-center rounded-full border text-xs ${
                      done ? "border-accent bg-accent text-black" : isToday ? "border-white/70" : "border-white/15 text-white/55"
                    }`}
                    aria-label={`${shortDate.format(new Date(`${d}T00:00:00Z`))}${done ? ": treinou" : ""}${isToday ? " (hoje)" : ""}`}
                  >
                    {done ? <Check className="size-4" /> : shortDate.format(new Date(`${d}T00:00:00Z`)).slice(0, 2)}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs text-white/55">Meta: {target} treinos por semana{data.daysPerWeek ? "" : " (ajuste no seu perfil)"}. Descanso também faz parte da evolução.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <Dumbbell className="size-5 text-white/50" aria-hidden />
            <p className="mt-4 font-display text-5xl leading-none tabular-nums">
              <CountUp value={data.totals.completed} />
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/50">Treinos concluídos</p>
          </div>
          <Link href="/aluno/evolucao#metas" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/30">
            <Target className="size-5 text-white/50" aria-hidden />
            <p className="mt-4 font-display text-5xl leading-none tabular-nums">
              <CountUp value={data.totals.goals_open} />
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/50">Metas em andamento</p>
            {data.totals.goals_done > 0 && <p className="mt-1 text-xs text-white/55">{data.totals.goals_done} concluídas</p>}
          </Link>
        </div>
      </section>

      {/* Frequência */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-labelledby="frequencia">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="frequencia" className="eyebrow">
            Frequência · últimas 8 semanas
          </h2>
          <Link href="/aluno/evolucao" className="flex items-center gap-1 text-xs text-white/55 hover:text-white">
            Evolução <ChevronRight className="size-3.5" />
          </Link>
        </div>
        {data.totals.completed === 0 ? (
          <p className="py-6 text-center text-sm text-white/50">Seus treinos concluídos aparecem aqui semana a semana.</p>
        ) : (
          <BarChart
            title="Treinos concluídos por semana"
            unit="treinos"
            unitOne="treino"
            integer
            points={freq.map((b) => ({
              label: shortDate.format(new Date(`${b.week}T00:00:00Z`)),
              detail: `Semana de ${shortDate.format(new Date(`${b.week}T00:00:00Z`))}`,
              value: b.count,
            }))}
          />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <NotificationsList items={data.notifications} />
        <section aria-labelledby="solicitacoes" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <h2 id="solicitacoes" className="eyebrow flex items-center gap-2">
              <UserCheck className="size-3.5" aria-hidden /> Solicitações ao treinador
            </h2>
            <Link href="/aluno/solicitar-profissional" className="flex items-center gap-1 text-xs text-white/55 hover:text-white">
              Meu Treinador <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {data.requests.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">Nenhuma solicitação em aberto.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/[0.06]">
              {data.requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/aluno/solicitar-profissional/${r.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <span className="text-sm">{r.trainer_name ?? "Profissional"}</span>
                    <Badge>{REQUEST_STATUS_LABELS[r.status] ?? r.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

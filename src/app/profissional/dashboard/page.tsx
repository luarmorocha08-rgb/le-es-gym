import { AlertTriangle, ArrowRight, ClipboardList, Inbox, MessageSquareQuote, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BarChart } from "@/components/charts/charts";
import { greeting } from "@/components/layout/portal-shell";
import { CountUp } from "@/components/motion/count-up";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/auth/dal";
import { getTrainerDashboard } from "@/lib/trainer/queries";
import { REQUEST_STATUS_LABELS } from "@/lib/workout/constants";
import { weeklyFrequency } from "@/lib/workout/progress";

export const metadata: Metadata = { title: "Painel profissional" };

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const dayOnly = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

export default async function TrainerDashboard() {
  const viewer = await requireArea("profissional");
  const data = await getTrainerDashboard(viewer.id);
  const c = data.counts;
  const weekly = weeklyFrequency(data.published, 12);

  const stats = [
    { label: "Alunos vinculados", value: c.students, href: "/profissional/alunos" },
    { label: "Solicitações novas", value: c.pending, href: "/profissional/solicitacoes" },
    { label: "Ajustes pedidos", value: c.adjustments, href: "/profissional/solicitacoes" },
    { label: "Em análise/elaboração", value: c.in_progress, href: "/profissional/solicitacoes" },
    { label: "Rascunhos", value: c.drafts, href: "/profissional/fichas" },
    { label: "Entregues (30 dias)", value: c.delivered_30d, href: "/profissional/fichas" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{greeting()},</p>
          <h1 className="mt-1 font-display text-6xl uppercase leading-none sm:text-7xl">{viewer.fullName.split(" ")[0]}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/profissional/criar-treino">
              <Plus /> Nova ficha
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/profissional/solicitacoes">
              <Inbox /> Solicitações
            </Link>
          </Button>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="block h-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/30">
              <span className="block font-display text-4xl leading-none tabular-nums">
                <CountUp value={s.value} />
              </span>
              <span className="mt-2 block text-[0.65rem] uppercase tracking-[0.14em] text-white/55">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="atencao" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 id="atencao" className="eyebrow mb-3 flex items-center gap-2">
            <AlertTriangle className="size-3.5" aria-hidden /> Precisa da sua atenção
          </h2>
          {data.waiting.length === 0 && data.inactive.length === 0 ? (
            <p className="text-sm text-white/50">Tudo em dia. Nenhuma solicitação aguardando e nenhum aluno parado.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {data.waiting.map((r) => (
                <li key={r.id}>
                  <Link href={`/profissional/solicitacoes/${r.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <span className="text-sm">
                      {r.full_name}
                      <span className="block text-xs text-white/55">desde {dayOnly.format(new Date(r.updated_at))}</span>
                    </span>
                    <Badge className={r.status === "ajuste_solicitado" ? "border-white text-white" : ""}>{REQUEST_STATUS_LABELS[r.status]}</Badge>
                  </Link>
                </li>
              ))}
              {data.inactive.map((s) => (
                <li key={s.student_id}>
                  <Link href={`/profissional/alunos/${s.student_id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <span className="text-sm">
                      {s.full_name}
                      <span className="block text-xs text-white/55">
                        {s.last_session ? `último treino em ${dayOnly.format(new Date(s.last_session))}` : "ainda não registrou treinos"}
                      </span>
                    </span>
                    <Badge>Sem treinar 7+ dias</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="atividades" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 id="atividades" className="eyebrow mb-3 flex items-center gap-2">
            <Users className="size-3.5" aria-hidden /> Últimas atividades dos alunos
          </h2>
          {data.activity.length === 0 ? (
            <p className="text-sm text-white/50">Os treinos concluídos pelos seus alunos aparecem aqui.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {data.activity.map((a) => (
                <li key={a.id}>
                  <Link href={`/profissional/alunos/${a.student_id}`} className="block py-3 hover:opacity-80">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm">
                        {a.full_name} <span className="text-white/55">· {a.plan_title ?? "Treino"} {a.day_label}</span>
                      </span>
                      <span className="shrink-0 text-xs text-white/55">{dateTime.format(new Date(a.finished_at))}</span>
                    </div>
                    {(a.perceived_effort || a.feedback) && (
                      <p className="mt-1 flex gap-2 text-xs text-white/60">
                        <MessageSquareQuote className="size-3.5 shrink-0" aria-hidden />
                        {a.perceived_effort ? `Esforço ${a.perceived_effort}/10` : ""}
                        {a.perceived_effort && a.feedback ? " · " : ""}
                        {a.feedback ? `“${a.feedback}”` : ""}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="produtividade" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="produtividade" className="eyebrow flex items-center gap-2">
            <ClipboardList className="size-3.5" aria-hidden /> Fichas publicadas por semana
          </h2>
          <Link href="/profissional/fichas" className="flex items-center gap-1 text-xs text-white/55 hover:text-white">
            Fichas <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {data.published.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/50">Quando você publicar fichas, a produtividade semanal aparece aqui.</p>
        ) : (
          <BarChart
            title="Fichas publicadas por semana (12 semanas)"
            unit="fichas"
            unitOne="ficha"
            integer
            points={weekly.map((b) => ({ label: shortDate.format(new Date(`${b.week}T00:00:00Z`)), detail: `Semana de ${shortDate.format(new Date(`${b.week}T00:00:00Z`))}`, value: b.count }))}
          />
        )}
      </section>
    </div>
  );
}

import { ArrowRight, BadgeCheck, ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BarChart } from "@/components/charts/charts";
import { StatCard } from "@/components/layout/portal-shell";
import { AuditList } from "@/components/admin/audit-list";
import { Button } from "@/components/ui/button";
import { getAdminDashboard } from "@/lib/admin/queries";
import { requireArea } from "@/lib/auth/dal";
import { weeklyFrequency } from "@/lib/workout/progress";

export const metadata: Metadata = { title: "Administração" };

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

function weekly(dates: string[]) {
  return weeklyFrequency(dates, 12).map((b) => {
    const d = shortDate.format(new Date(`${b.week}T00:00:00Z`));
    return { label: d, detail: `Semana de ${d}`, value: b.count };
  });
}

export default async function AdminDashboard() {
  const viewer = await requireArea("admin");
  const { counts: c, signups, sessions, pendingPros, recent } = await getAdminDashboard(viewer.id);

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">Administração</p>
        <h1 className="mt-2 font-display text-6xl uppercase leading-none sm:text-7xl">Visão geral</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Usuários" value={c.users} hint={`${c.students} alunos`} />
        <StatCard label="Profissionais ativos" value={c.trainers} hint={`${c.links} vínculos ativos`} />
        <StatCard label="Treinos em 7 dias" value={c.sessions_7d} hint={`${c.active_students_30d} alunos ativos em 30 dias`} />
        <StatCard label="IA em 24 h" value={c.ai_24h} hint={c.ai_errors_24h ? `${c.ai_errors_24h} sem sucesso` : "sem falhas"} />
      </div>

      {pendingPros.length > 0 && (
        <section aria-labelledby="pendentes" className="rounded-2xl border border-white/25 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 id="pendentes" className="eyebrow flex items-center gap-2">
              <BadgeCheck className="size-3.5" aria-hidden /> {c.pending} {c.pending === 1 ? "profissional aguarda" : "profissionais aguardam"} aprovação
            </h2>
            <Button asChild size="sm">
              <Link href="/admin/profissionais">
                Revisar <ArrowRight />
              </Link>
            </Button>
          </div>
          <ul className="mt-3 divide-y divide-white/[0.06] text-sm">
            {pendingPros.map((p) => (
              <li key={p.user_id} className="flex justify-between gap-3 py-2.5">
                <span>
                  {p.full_name} <span className="text-white/55">· CREF {p.cref ?? "não informado"}</span>
                </span>
                <span className="text-white/55">{dateFmt.format(new Date(p.created_at))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="eyebrow mb-3">Novos cadastros por semana · 12 semanas</h2>
          <BarChart title="Novos cadastros por semana" unit="cadastros" unitOne="cadastro" integer points={weekly(signups)} />
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="eyebrow mb-3">Treinos concluídos por semana · 12 semanas</h2>
          <BarChart title="Treinos concluídos por semana" unit="treinos" unitOne="treino" integer points={weekly(sessions)} />
        </section>
      </div>

      <section aria-labelledby="atividade" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="atividade" className="eyebrow flex items-center gap-2">
            <ScrollText className="size-3.5" aria-hidden /> Atividade recente (auditoria)
          </h2>
          <Link href="/admin/logs" className="text-sm text-white/60 hover:text-white">
            Ver todos
          </Link>
        </div>
        <AuditList rows={recent} empty="Nenhuma ação registrada ainda." />
      </section>
    </div>
  );
}

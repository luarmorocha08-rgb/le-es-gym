import type { Metadata } from "next";
import { StatCard } from "@/components/layout/portal-shell";
import { StageNotice } from "@/components/layout/stage-notice";
import { requireArea } from "@/lib/auth/dal";
import { withUser } from "@/lib/db";

export const metadata: Metadata = { title: "Administração" };

export default async function AdminDashboard() {
  const viewer = await requireArea("admin");
  const counts = await withUser(viewer.id, (db) =>
    db.one<{ users: number; pending: number; exercises: number }>(
      `select
         (select count(*)::int from public.profiles) as users,
         (select count(*)::int from public.professional_profiles where status = 'pendente') as pending,
         (select count(*)::int from public.exercises where is_active) as exercises`,
    ),
  );

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">Administração</p>
        <h1 className="mt-2 font-display text-6xl uppercase leading-none sm:text-7xl">Visão geral</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Usuários" value={counts?.users ?? 0} />
        <StatCard label="Profissionais aguardando aprovação" value={counts?.pending ?? 0} />
        <StatCard label="Exercícios ativos" value={counts?.exercises ?? 0} />
      </div>
      <StageNotice
        stage="Etapa 7"
        items={["Aprovar cadastros profissionais", "Vincular alunos a treinadores", "Biblioteca de exercícios e mídias", "Horários, conteúdos e logs de auditoria"]}
      />
    </div>
  );
}

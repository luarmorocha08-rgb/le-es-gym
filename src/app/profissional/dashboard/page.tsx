import type { Metadata } from "next";
import { greeting, StatCard } from "@/components/layout/portal-shell";
import { StageNotice } from "@/components/layout/stage-notice";
import { requireArea } from "@/lib/auth/dal";
import { withUser } from "@/lib/db";

export const metadata: Metadata = { title: "Painel profissional" };

export default async function TrainerDashboard() {
  const viewer = await requireArea("profissional");
  const counts = await withUser(viewer.id, (db) =>
    db.one<{ students: number; pending: number; drafts: number }>(
      `select
         (select count(*)::int from public.trainer_student_links where trainer_id = $1 and status = 'ativo') as students,
         (select count(*)::int from public.workout_requests where trainer_id = $1 and status in ('aguardando_profissional', 'ajuste_solicitado')) as pending,
         (select count(*)::int from public.workout_plans where author_id = $1 and status = 'rascunho') as drafts`,
      [viewer.id],
    ),
  );

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">{greeting()},</p>
        <h1 className="mt-2 font-display text-6xl uppercase leading-none sm:text-7xl">{viewer.fullName.split(" ")[0]}</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Alunos vinculados" value={counts?.students ?? 0} />
        <StatCard label="Solicitações pendentes" value={counts?.pending ?? 0} />
        <StatCard label="Fichas em rascunho" value={counts?.drafts ?? 0} />
      </div>
      <StageNotice
        stage="Etapa 5"
        items={["Meus alunos e perfis", "Editor de fichas com drag-and-drop", "Central de solicitações", "Acompanhamento e notas privadas"]}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { greeting, StatCard } from "@/components/layout/portal-shell";
import { StageNotice } from "@/components/layout/stage-notice";
import { requireArea } from "@/lib/auth/dal";
import { withUser } from "@/lib/db";

export const metadata: Metadata = { title: "Início" };

export default async function StudentDashboard() {
  const viewer = await requireArea("aluno");
  const counts = await withUser(viewer.id, (db) =>
    db.one<{ plans: number; sessions: number; unread: number }>(
      `select
         (select count(*)::int from public.workout_plans where student_id = $1 and status in ('ativo', 'publicado')) as plans,
         (select count(*)::int from public.workout_sessions where student_id = $1 and status = 'concluida') as sessions,
         (select count(*)::int from public.notifications where user_id = $1 and read_at is null) as unread`,
      [viewer.id],
    ),
  );

  const firstName = viewer.fullName.split(" ")[0];

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">{greeting()},</p>
        <h1 className="mt-2 font-display text-6xl uppercase leading-none sm:text-7xl">{firstName}</h1>
        {viewer.professionalStatus === "pendente" && (
          <p className="mt-4 text-sm text-white/55">Seu cadastro profissional está em análise pela administração.</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Fichas em uso" value={counts?.plans ?? 0} />
        <StatCard label="Treinos concluídos" value={counts?.sessions ?? 0} />
        <StatCard label="Notificações novas" value={counts?.unread ?? 0} />
      </div>
      <StageNotice
        stage="Etapa 4"
        items={[
          "Montar meu treino com a biblioteca de exercícios",
          "Modo treino com timer de descanso e registro de cargas",
          "Minha evolução com gráficos de frequência e cargas",
          "Pedir treino a um profissional (Meu Treinador)",
        ]}
      />
    </div>
  );
}

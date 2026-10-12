import type { Metadata } from "next";
import { greeting, StatCard } from "@/components/layout/portal-shell";
import { StageNotice } from "@/components/layout/stage-notice";
import { requireArea } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Início" };

export default async function StudentDashboard() {
  const viewer = await requireArea("aluno");
  const supabase = (await createClient())!;

  const [plans, sessions, unread] = await Promise.all([
    supabase.from("workout_plans").select("id", { count: "exact", head: true }).eq("student_id", viewer.id).in("status", ["ativo", "publicado"]),
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("student_id", viewer.id).eq("status", "concluida"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null),
  ]);

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
        <StatCard label="Fichas em uso" value={plans.count ?? 0} />
        <StatCard label="Treinos concluídos" value={sessions.count ?? 0} />
        <StatCard label="Notificações novas" value={unread.count ?? 0} />
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

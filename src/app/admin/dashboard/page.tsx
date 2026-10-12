import type { Metadata } from "next";
import { StatCard } from "@/components/layout/portal-shell";
import { StageNotice } from "@/components/layout/stage-notice";
import { requireArea } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Administração" };

export default async function AdminDashboard() {
  await requireArea("admin");
  const supabase = (await createClient())!;

  const [users, pendingPros, exercises] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("professional_profiles").select("user_id", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("exercises").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">Administração</p>
        <h1 className="mt-2 font-display text-6xl uppercase leading-none sm:text-7xl">Visão geral</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Usuários" value={users.count ?? 0} />
        <StatCard label="Profissionais aguardando aprovação" value={pendingPros.count ?? 0} />
        <StatCard label="Exercícios ativos" value={exercises.count ?? 0} />
      </div>
      <StageNotice
        stage="Etapa 7"
        items={["Aprovar cadastros profissionais", "Vincular alunos a treinadores", "Biblioteca de exercícios e mídias", "Horários, conteúdos e logs de auditoria"]}
      />
    </div>
  );
}

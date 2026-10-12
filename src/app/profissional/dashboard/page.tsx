import type { Metadata } from "next";
import { greeting, StatCard } from "@/components/layout/portal-shell";
import { StageNotice } from "@/components/layout/stage-notice";
import { requireArea } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Painel profissional" };

export default async function TrainerDashboard() {
  const viewer = await requireArea("profissional");
  const supabase = (await createClient())!;

  const [students, pending, drafts] = await Promise.all([
    supabase.from("trainer_student_links").select("id", { count: "exact", head: true }).eq("trainer_id", viewer.id).eq("status", "ativo"),
    supabase.from("workout_requests").select("id", { count: "exact", head: true }).eq("trainer_id", viewer.id).in("status", ["aguardando_profissional", "ajuste_solicitado"]),
    supabase.from("workout_plans").select("id", { count: "exact", head: true }).eq("author_id", viewer.id).eq("status", "rascunho"),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">{greeting()},</p>
        <h1 className="mt-2 font-display text-6xl uppercase leading-none sm:text-7xl">{viewer.fullName.split(" ")[0]}</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Alunos vinculados" value={students.count ?? 0} />
        <StatCard label="Solicitações pendentes" value={pending.count ?? 0} />
        <StatCard label="Fichas em rascunho" value={drafts.count ?? 0} />
      </div>
      <StageNotice
        stage="Etapa 5"
        items={["Meus alunos e perfis", "Editor de fichas com drag-and-drop", "Central de solicitações", "Acompanhamento e notas privadas"]}
      />
    </div>
  );
}

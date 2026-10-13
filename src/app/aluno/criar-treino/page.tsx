import type { Metadata } from "next";
import { savePlan } from "@/app/aluno/_actions/plans";
import { PlanEditor } from "@/components/student/plan-editor";
import { PageHeader } from "@/components/ui/page-header";
import { requireArea } from "@/lib/auth/dal";
import { listExercises } from "@/lib/student/queries";

export const metadata: Metadata = { title: "Montar treino" };

export default async function CreatePlanPage() {
  const viewer = await requireArea("aluno");
  const catalog = await listExercises(viewer.id);
  return (
    <div>
      <PageHeader eyebrow="Meu treino" title="Montar treino">
        Escolha a divisão, adicione exercícios da biblioteca e ajuste séries, repetições e descanso.
      </PageHeader>
      <PlanEditor plan={null} catalog={catalog} save={savePlan.bind(null, null)} afterSaveBase="/aluno/meus-treinos" />
    </div>
  );
}

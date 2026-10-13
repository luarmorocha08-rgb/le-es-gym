import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { savePlan } from "@/app/aluno/_actions/plans";
import { PlanEditor } from "@/components/student/plan-editor";
import { PageHeader } from "@/components/ui/page-header";
import { requireArea } from "@/lib/auth/dal";
import { getPlan, listExercises } from "@/lib/student/queries";

export const metadata: Metadata = { title: "Editar treino" };

export default async function EditPlanPage({ params }: PageProps<"/aluno/meus-treinos/[id]/editar">) {
  const viewer = await requireArea("aluno");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [plan, catalog] = await Promise.all([getPlan(viewer.id, id), listExercises(viewer.id)]);
  if (!plan) notFound();
  if (!plan.can_edit) redirect(`/aluno/meus-treinos/${id}`);
  return (
    <div>
      <PageHeader eyebrow="Meu treino" title="Editar treino" />
      <PlanEditor plan={plan} catalog={catalog} save={savePlan.bind(null, plan.id)} afterSaveBase="/aluno/meus-treinos" />
    </div>
  );
}

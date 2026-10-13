import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { trainerSubstitutes } from "@/app/profissional/_actions/ai";
import { saveTrainerPlan } from "@/app/profissional/_actions/plans";
import { PlanEditor } from "@/components/student/plan-editor";
import { PageHeader } from "@/components/ui/page-header";
import { isAiConfigured } from "@/lib/ai/config";
import { requireArea } from "@/lib/auth/dal";
import { listExercises } from "@/lib/student/queries";
import { getTrainerPlan } from "@/lib/trainer/queries";

export const metadata: Metadata = { title: "Editar ficha" };

export default async function EditTrainerPlanPage({ params }: PageProps<"/profissional/fichas/[id]/editar">) {
  const viewer = await requireArea("profissional");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [plan, catalog] = await Promise.all([getTrainerPlan(viewer.id, id), listExercises(viewer.id)]);
  if (!plan) notFound();
  if (!plan.can_edit) redirect(`/profissional/fichas/${id}`);
  return (
    <div>
      <PageHeader eyebrow={plan.is_template ? "Modelo" : `Rascunho · ${plan.student_name ?? ""}`} title="Editar ficha">
        Salvar mantém a ficha como rascunho. A publicação é feita na página da ficha.
      </PageHeader>
      <PlanEditor
        plan={{ title: plan.title, goal: plan.goal, description: plan.description, split_type: plan.split_type, days: plan.days }}
        catalog={catalog}
        save={saveTrainerPlan.bind(null, { planId: plan.id })}
        afterSaveBase="/profissional/fichas"
        saveLabel="Salvar rascunho"
        substitutes={isAiConfigured() ? trainerSubstitutes.bind(null, plan.is_template ? null : plan.student_id) : undefined}
      />
    </div>
  );
}

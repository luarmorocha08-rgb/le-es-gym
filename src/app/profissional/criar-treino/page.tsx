import { BookCopy, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { trainerSubstitutes } from "@/app/profissional/_actions/ai";
import { saveTrainerPlan } from "@/app/profissional/_actions/plans";
import { PlanEditor } from "@/components/student/plan-editor";
import { CopyToStudentForm } from "@/components/trainer/plan-controls";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { isAiConfigured } from "@/lib/ai/config";
import { requireArea } from "@/lib/auth/dal";
import { listExercises } from "@/lib/student/queries";
import { getTrainerRequest, listMyTemplates, listStudents } from "@/lib/trainer/queries";
import { GOAL_LABELS, type Goal } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Nova ficha" };

const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export default async function CreateTrainerPlanPage({ searchParams }: PageProps<"/profissional/criar-treino">) {
  const viewer = await requireArea("profissional");
  const sp = await searchParams;
  const asTemplate = sp.tipo === "modelo";
  const requestId = isUuid(sp.solicitacao) ? sp.solicitacao : null;
  const [students, templates] = await Promise.all([listStudents(viewer.id), listMyTemplates(viewer.id)]);

  const request = requestId ? await getTrainerRequest(viewer.id, requestId) : null;
  if (requestId && !request) notFound();
  const studentId = request?.request.student_id ?? (isUuid(sp.aluno) ? sp.aluno : null);
  const student = students.find((s) => s.id === studentId);

  // Sem aluno nem modelo: escolher o destino
  if (!asTemplate && !student && !request) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Profissional" title="Nova ficha">
          Escolha o aluno vinculado, comece de um modelo ou crie um modelo reutilizável.
        </PageHeader>
        {students.length === 0 ? (
          <EmptyState icon={UserPlus} title="Nenhum aluno vinculado" action={<Button asChild variant="outline"><Link href="/profissional/criar-treino?tipo=modelo">Criar um modelo</Link></Button>}>
            Fichas são criadas para alunos vinculados. Aceite uma solicitação ou peça um vínculo à administração.
          </EmptyState>
        ) : (
          <form className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="font-heading text-[0.72rem] uppercase tracking-[0.18em] text-white/70">Aluno</span>
              <div className="mt-2">
                <Select name="aluno" defaultValue="" required>
                  <option value="" disabled>
                    Escolha o aluno
                  </option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </Select>
              </div>
            </label>
            <Button type="submit" className="h-12">
              Montar do zero
            </Button>
          </form>
        )}
        {templates.length > 0 && students.length > 0 && (
          <section aria-labelledby="modelos">
            <h2 id="modelos" className="eyebrow mb-3 flex items-center gap-2">
              <BookCopy className="size-3.5" aria-hidden /> A partir de um modelo
            </h2>
            <ul className="space-y-2">
              {templates.map((t) => (
                <li key={t.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/profissional/fichas/${t.id}`} className="font-medium hover:underline">
                    {t.title}
                  </Link>
                  <CopyToStudentForm planId={t.id} students={students} label="Usar para aluno" />
                </li>
              ))}
            </ul>
          </section>
        )}
        <Button asChild variant="ghost">
          <Link href="/profissional/criar-treino?tipo=modelo">
            <BookCopy /> Criar modelo reutilizável
          </Link>
        </Button>
      </div>
    );
  }

  if (!asTemplate && !student) notFound();
  const catalog = await listExercises(viewer.id);
  const r = request?.request;

  return (
    <div>
      <PageHeader eyebrow={asTemplate ? "Modelo reutilizável" : `Ficha para ${student!.full_name}`} title={asTemplate ? "Novo modelo" : "Montar ficha"}>
        Salvar cria um rascunho. O aluno só vê a ficha depois que você publicar.
      </PageHeader>
      {r && (
        <Alert className="mb-6" title="Solicitação do aluno">
          <p>
            {GOAL_LABELS[r.goal as Goal]} · {r.days_per_week} dias/semana · {r.session_minutes} min
          </p>
          {r.details && <p className="mt-1 italic">“{r.details}”</p>}
        </Alert>
      )}
      <PlanEditor
        plan={null}
        catalog={catalog}
        save={saveTrainerPlan.bind(null, { studentId: student?.id ?? null, requestId, isTemplate: asTemplate })}
        afterSaveBase="/profissional/fichas"
        saveLabel="Salvar rascunho"
        substitutes={isAiConfigured() ? trainerSubstitutes.bind(null, asTemplate ? null : (student?.id ?? null)) : undefined}
      />
    </div>
  );
}

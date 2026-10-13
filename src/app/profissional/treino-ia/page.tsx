import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { AiNotConfigured } from "@/components/ai/ai-not-configured";
import { TrainerAssistant } from "@/components/ai/trainer-assistant";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { isAiConfigured } from "@/lib/ai/config";
import { requireArea } from "@/lib/auth/dal";
import { withUser } from "@/lib/db";
import { listStudents } from "@/lib/trainer/queries";
import type { Goal, Level } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Sugestão com IA" };

export default async function TrainerAiPage({ searchParams }: PageProps<"/profissional/treino-ia">) {
  const viewer = await requireArea("profissional");
  const header = (
    <PageHeader eyebrow="Assistente" title="Sugestão com IA">
      Gere uma proposta editável para um aluno vinculado. Ela entra como rascunho — publicar é sempre uma decisão sua.
    </PageHeader>
  );
  if (!isAiConfigured()) {
    return (
      <div>
        {header}
        <AiNotConfigured area="profissional" />
      </div>
    );
  }

  const sp = await searchParams;
  const students = await listStudents(viewer.id);
  const studentId = typeof sp.aluno === "string" && students.some((s) => s.id === sp.aluno) ? sp.aluno : null;

  const data = studentId
    ? await withUser(viewer.id, async (db) => {
        const p = await db.one<{ full_name: string; goal: string | null; experience_level: string | null; days_per_week: number | null; session_minutes: number | null; ai_consent: boolean }>(
          `select full_name, goal::text, experience_level::text, days_per_week, session_minutes,
                  (select ai_consent_at is not null from public.profiles where id = $1) as ai_consent
             from public.profiles where id = $1`,
          [studentId],
        );
        const h = await db.one<{ limitations: string | null; exercises_to_avoid: string | null; preferences: string | null; available_equipment: string[]; priority_muscles: string[] }>(
          "select limitations, exercises_to_avoid, preferences, available_equipment, priority_muscles from public.student_health_info where student_id = $1",
          [studentId],
        );
        return { p: p!, h };
      })
    : null;

  return (
    <div className="space-y-8">
      {header}
      {students.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Nenhum aluno vinculado">
          A IA trabalha apenas com alunos vinculados a você.
        </EmptyState>
      ) : (
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 sm:max-w-sm">
            <span className="font-heading text-[0.72rem] uppercase tracking-[0.18em] text-white/70">Aluno</span>
            <div className="mt-2">
              <Select name="aluno" defaultValue={studentId ?? ""} required>
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
          <Button type="submit" variant="outline" className="h-12">
            Selecionar
          </Button>
        </form>
      )}

      {data && !data.p.ai_consent && (
        <Alert tone="error" title="O aluno não autorizou o uso de IA">
          Por privacidade, os dados de {data.p.full_name} só podem ser usados pela IA após o consentimento dele (Perfil → Inteligência
          artificial). Você pode montar a ficha manualmente.
        </Alert>
      )}
      {data && data.p.ai_consent && studentId && (
        <TrainerAssistant
          key={studentId}
          studentId={studentId}
          studentName={data.p.full_name}
          defaults={{
            goal: (data.p.goal as Goal | null) ?? null,
            level: (data.p.experience_level as Level | null) ?? null,
            daysPerWeek: data.p.days_per_week,
            sessionMinutes: data.p.session_minutes,
            equipment: data.h?.available_equipment ?? [],
            priorityMuscles: data.h?.priority_muscles ?? [],
            limitations: data.h?.limitations ?? null,
            avoid: data.h?.exercises_to_avoid ?? null,
            preferences: data.h?.preferences ?? null,
          }}
        />
      )}
    </div>
  );
}

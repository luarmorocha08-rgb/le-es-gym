import type { Metadata } from "next";
import { AiNotConfigured } from "@/components/ai/ai-not-configured";
import { StudentAssistant } from "@/components/ai/student-assistant";
import { PageHeader } from "@/components/ui/page-header";
import { isAiConfigured } from "@/lib/ai/config";
import { requireArea } from "@/lib/auth/dal";
import { getProfile, listTrainers } from "@/lib/student/queries";
import type { Goal, Level } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Treino com IA" };

export default async function AiPage() {
  const viewer = await requireArea("aluno");
  if (!isAiConfigured()) {
    return (
      <div>
        <PageHeader eyebrow="Assistente" title="Treino com IA" />
        <AiNotConfigured area="aluno" />
      </div>
    );
  }
  const [profile, trainers] = await Promise.all([getProfile(viewer.id), listTrainers(viewer.id)]);
  const h = profile?.health;
  return (
    <div>
      <PageHeader eyebrow="Assistente" title="Treino com IA">
        Responda algumas perguntas e receba uma sugestão de treino editável. Você decide o que fazer com ela.
      </PageHeader>
      <StudentAssistant
        hasConsent={Boolean(profile?.ai_consent_at)}
        trainers={trainers}
        defaults={{
          goal: (profile?.goal as Goal | null) ?? null,
          level: (profile?.experience_level as Level | null) ?? null,
          daysPerWeek: profile?.days_per_week ?? null,
          sessionMinutes: profile?.session_minutes ?? null,
          equipment: h?.available_equipment ?? [],
          priorityMuscles: h?.priority_muscles ?? [],
          limitations: h?.limitations ?? null,
          avoid: h?.exercises_to_avoid ?? null,
          preferences: h?.preferences ?? null,
        }}
      />
    </div>
  );
}

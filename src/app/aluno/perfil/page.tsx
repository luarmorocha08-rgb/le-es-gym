import { BrainCircuit, HeartPulse, KeyRound, ShieldCheck, User } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotificationsList } from "@/components/student/notifications-list";
import { AiConsent, DataRights, HealthForm, PasswordForm, ProfileForm } from "@/components/student/profile-forms";
import { PageHeader } from "@/components/ui/page-header";
import { requireArea } from "@/lib/auth/dal";
import { getProfile, listNotifications } from "@/lib/student/queries";

export const metadata: Metadata = { title: "Perfil" };

function Section({ id, icon: Icon, title, children }: { id: string; icon: typeof User; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-32 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
      <h2 id={`${id}-t`} className="mb-5 flex items-center gap-2 font-heading text-lg uppercase tracking-[0.06em]">
        <Icon className="size-4 text-white/60" aria-hidden /> {title}
      </h2>
      {children}
    </section>
  );
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });

export default async function ProfilePage() {
  const viewer = await requireArea("aluno");
  const [profile, notifications] = await Promise.all([getProfile(viewer.id), listNotifications(viewer.id)]);
  if (!profile) notFound();

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Conta" title="Perfil">
        {viewer.email}
      </PageHeader>
      <Section id="dados" icon={User} title="Dados e rotina">
        <ProfileForm profile={profile} />
      </Section>
      <Section id="saude" icon={HeartPulse} title="Saúde e preferências">
        <HealthForm profile={profile} />
      </Section>
      <Section id="ia" icon={BrainCircuit} title="Inteligência artificial">
        <AiConsent enabled={Boolean(profile.ai_consent_at)} />
      </Section>
      <NotificationsList items={notifications} compact />
      <Section id="seguranca" icon={KeyRound} title="Segurança">
        <PasswordForm />
      </Section>
      <Section id="privacidade" icon={ShieldCheck} title="Seus dados (LGPD)">
        <dl className="mb-6 grid gap-2 text-xs text-white/50 sm:grid-cols-3">
          <div>
            <dt>Termos aceitos em</dt>
            <dd className="text-white/75">{profile.terms_accepted_at ? dateFmt.format(new Date(profile.terms_accepted_at)) : "—"}</dd>
          </div>
          <div>
            <dt>Consentimento de saúde</dt>
            <dd className="text-white/75">{profile.health_data_consent_at ? dateFmt.format(new Date(profile.health_data_consent_at)) : "não concedido"}</dd>
          </div>
          <div>
            <dt>Consentimento de IA</dt>
            <dd className="text-white/75">{profile.ai_consent_at ? dateFmt.format(new Date(profile.ai_consent_at)) : "não concedido"}</dd>
          </div>
        </dl>
        <DataRights />
      </Section>
    </div>
  );
}

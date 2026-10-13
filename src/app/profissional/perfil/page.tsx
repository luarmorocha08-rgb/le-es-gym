import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfessionalProfileForm } from "@/components/trainer/profile-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireArea } from "@/lib/auth/dal";
import { getMyProfessionalProfile } from "@/lib/trainer/queries";

export const metadata: Metadata = { title: "Perfil profissional" };

export default async function TrainerProfilePage() {
  const viewer = await requireArea("profissional");
  const profile = await getMyProfessionalProfile(viewer.id);
  if (!profile) notFound();
  return (
    <div>
      <PageHeader eyebrow="Profissional" title="Meu perfil">
        Dados pessoais, senha e exclusão de conta ficam no{" "}
        <a href="/aluno/perfil" className="underline">
          perfil da conta
        </a>
        .
      </PageHeader>
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <ProfessionalProfileForm profile={profile} />
      </div>
    </div>
  );
}

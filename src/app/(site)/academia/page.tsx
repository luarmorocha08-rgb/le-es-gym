import type { Metadata } from "next";
import { AcademySection } from "@/components/landing/academy-section";
import { FinalCta } from "@/components/landing/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { gym } from "@/content/gym";

/** Horários e equipe vêm do banco; revalida a cada 5 minutos. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "A academia",
  description: `Conheça a ${gym.name}: estrutura, aulas, Espaço Kids, localização e horários.`,
};

export default function AcademyPage() {
  return (
    <>
      <PageHero eyebrow="A academia" title={<>A casa dos <span className="text-metal">leões.</span></>}>
        {gym.pillars.join(" · ")}.
      </PageHero>
      <AcademySection />
      <FinalCta />
    </>
  );
}

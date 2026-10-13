import { AcademySection } from "@/components/landing/academy-section";
import { ExperiencePreview } from "@/components/landing/experience-preview";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { ManifestoMarquee } from "@/components/landing/manifesto-marquee";
import { ShieldStory } from "@/components/landing/shield-story";
import { SmartTraining } from "@/components/landing/smart-training";
import { GymStructuredData } from "@/components/landing/structured-data";

/** Horários e equipe vêm do banco; revalida a cada 5 minutos. */
export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <GymStructuredData />
      <Hero />
      <ManifestoMarquee />
      <AcademySection />
      <ShieldStory />
      <SmartTraining />
      <ExperiencePreview />
      <FinalCta />
    </>
  );
}

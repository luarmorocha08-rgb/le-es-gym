import { AcademySection } from "@/components/landing/academy-section";
import { ExperiencePreview } from "@/components/landing/experience-preview";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { ManifestoMarquee } from "@/components/landing/manifesto-marquee";
import { RevoStory } from "@/components/landing/revo-story";
import { SmartTraining } from "@/components/landing/smart-training";
import { GymStructuredData } from "@/components/landing/structured-data";
import { getLandingMedia } from "@/lib/data/public";

/** Horários, equipe e mídias vêm do banco; revalida a cada 5 minutos. */
export const revalidate = 300;

export default async function HomePage() {
  const { video, poster, gallery } = await getLandingMedia();

  return (
    <>
      <GymStructuredData />
      <Hero video={video} poster={poster} />
      <ManifestoMarquee />
      <AcademySection gallery={gallery} />
      <RevoStory />
      <SmartTraining />
      <ExperiencePreview />
      <FinalCta />
    </>
  );
}

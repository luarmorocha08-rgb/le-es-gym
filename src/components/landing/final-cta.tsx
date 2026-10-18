import { ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { TextReveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { gym } from "@/content/gym";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="grain relative overflow-hidden border-t border-white/10 py-32 sm:py-48">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgba(62,230,255,0.14),transparent_70%)]" />
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-10">
        <TextReveal>
          <h2 id="cta-title" className="font-display text-[clamp(3.2rem,13vw,13rem)] uppercase leading-[0.85]">
            <span className="block overflow-hidden py-[0.14em] -my-[0.14em]">
              <span data-line className="block">
                Os resultados
              </span>
            </span>
            <span className="block overflow-hidden py-[0.14em] -my-[0.14em]">
              <span data-line className="block text-metal text-metal-animated">
                começam aqui.
              </span>
            </span>
          </h2>
        </TextReveal>
        <p className="mx-auto mt-8 max-w-lg text-lg text-white/60">{gym.slogan}</p>
        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/cadastro">
              Criar minha conta <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={gym.links.whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle /> Falar no WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

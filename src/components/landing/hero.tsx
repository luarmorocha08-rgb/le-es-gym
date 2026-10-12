"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Scene3D } from "@/components/three/scene-3d";
import { gym, media } from "@/content/gym";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Sem máscara: preserva acentos (Ã, Ê) acima da altura das maiúsculas
        const split = SplitText.create("[data-hero-title] .line", { type: "chars", charsClass: "char" });
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.from("[data-hero-bg]", { scale: 1.25, filter: "blur(12px)", opacity: 0, duration: 2.4 })
          .from("[data-hero-scene]", { opacity: 0, scale: 0.8, duration: 2 }, 0.3)
          .from(
            split.chars,
            { yPercent: 70, rotateX: -85, opacity: 0, transformOrigin: "50% 100%", duration: 1.3, stagger: 0.028 },
            0.35,
          )
          .from("[data-hero-fade]", { y: 24, opacity: 0, duration: 1, stagger: 0.12 }, 1.1);

        // profundidade no scroll: título se afasta enquanto a cena avança
        gsap.to("[data-hero-content]", {
          yPercent: -18,
          scale: 0.92,
          opacity: 0,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to("[data-hero-scene]", {
          scale: 1.25,
          yPercent: 12,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
        return () => split.revert();
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-labelledby="hero-title"
      className="grain relative isolate flex min-h-[100svh] items-end overflow-hidden pb-14 pt-28 sm:items-center sm:pb-0"
    >
      {/* Fundo cinematográfico */}
      <div data-hero-bg className="absolute inset-0 -z-20">
        {media.heroVideo ? (
          <video
            className="h-full w-full object-cover opacity-60 grayscale"
            src={media.heroVideo}
            poster={media.heroPoster ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_70%_55%_at_70%_10%,rgba(255,255,255,0.18),transparent_60%),radial-gradient(ellipse_60%_50%_at_10%_100%,rgba(119,123,130,0.25),transparent_70%),linear-gradient(180deg,#0b0b0c,#000_70%)]" />
        )}
        {/* feixes de luz */}
        <div className="absolute -top-1/4 left-[58%] h-[140%] w-40 rotate-[18deg] bg-gradient-to-b from-white/20 via-white/[0.04] to-transparent blur-2xl" />
        <div className="absolute -top-1/4 left-[72%] h-[140%] w-16 rotate-[18deg] bg-gradient-to-b from-white/15 via-white/[0.03] to-transparent blur-xl" />
        {/* piso em perspectiva */}
        <div className="absolute inset-x-0 bottom-0 h-[45%] [perspective:600px]">
          <div className="absolute inset-0 origin-bottom [transform:rotateX(62deg)] bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_top,black,transparent_85%)]" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60" />
      </div>

      {/* Cena 3D */}
      <div
        data-hero-scene
        className="absolute inset-x-0 top-[6%] -z-10 mx-auto h-[50svh] max-w-3xl opacity-45 sm:opacity-90 sm:inset-x-auto sm:right-[-6%] sm:top-1/2 sm:h-[80svh] sm:w-[60vw] sm:max-w-none sm:-translate-y-1/2 lg:right-[-3%] lg:w-[44vw]"
      >
        <Scene3D className="h-full w-full" size={0.032} />
      </div>

      <div data-hero-content className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <p data-hero-fade className="eyebrow mb-6 flex items-center gap-3">
          <span className="h-px w-10 bg-white/40" />
          {gym.name} · Santos/SP
        </p>
        <h1
          id="hero-title"
          data-hero-title
          className="font-display text-[clamp(3.4rem,12.5vw,11.5rem)] uppercase leading-[0.98] tracking-[0.005em] [perspective:800px]"
        >
          <span className="line block">Desperte o leão</span>
          <span className="line block text-metal">que existe</span>
          <span className="line block">em você.</span>
        </h1>
        <p data-hero-fade className="mt-6 max-w-md font-heading text-lg uppercase tracking-[0.16em] text-white/70 sm:text-xl">
          Seu treino. Sua evolução. Sua força.
        </p>
        <div data-hero-fade className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg">
            <Link href="/login?perfil=aluno">
              Sou aluno <ArrowRight className="transition-transform group-hover/btn:translate-x-1" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login?perfil=profissional">Sou profissional</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <a href="#academia">
              Conhecer a academia <ArrowDown />
            </a>
          </Button>
        </div>
      </div>

      <div
        data-hero-fade
        className="pointer-events-none absolute bottom-6 right-6 hidden items-center gap-3 font-heading text-[0.65rem] uppercase tracking-[0.3em] text-white/45 sm:flex"
        aria-hidden
      >
        Role para explorar
        <span className="relative h-10 w-px overflow-hidden bg-white/15">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-[marquee-y_1.8s_ease-in-out_infinite] bg-white" />
        </span>
      </div>
    </section>
  );
}

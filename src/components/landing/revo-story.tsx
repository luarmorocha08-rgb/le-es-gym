"use client";

import { useRef } from "react";
import { Scene3D } from "@/components/three/scene-3d";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

const chapters = [
  { word: "Precisão", text: "Cada série registrada vira dado. Cada dado vira uma decisão melhor no próximo treino." },
  { word: "Evolução", text: "Progressão de cargas guiada pelo seu histórico, com técnica e acompanhamento de quem entende." },
  { word: "Conexão", text: "A tecnologia conecta. As pessoas transformam. Ninguém evolui sozinho aqui." },
];

/** Seção sticky: o núcleo 3D gira com o scroll enquanto os capítulos se alternam. */
export function RevoStory() {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);

  useGSAP(
    () => {
      const words = gsap.utils.toArray<HTMLElement>("[data-chapter]");
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(words.slice(1), { autoAlpha: 0, yPercent: 40 });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
            onUpdate: (self) => {
              progress.current = self.progress;
            },
          },
        });
        words.forEach((el, i) => {
          if (i === 0) return;
          tl.to(words[i - 1], { autoAlpha: 0, yPercent: -40, duration: 0.4 }, i).to(
            el,
            { autoAlpha: 1, yPercent: 0, duration: 0.4 },
            i + 0.45,
          );
        });
        tl.to({}, { duration: 0.6 });
        tl.fromTo("[data-story-bar]", { scaleX: 0 }, { scaleX: 1, ease: "none", duration: tl.duration() }, 0);
      });

      // Sem animação: capítulos empilhados e legíveis
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(words, { clearProps: "all" });
      });
      return () => ScrollTrigger.refresh();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-label="Nossos valores"
      className="relative h-[320svh] bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,#0d1622,#05070b_70%)] motion-reduce:h-auto"
    >
      <div className="sticky top-0 flex h-svh items-center overflow-hidden motion-reduce:static motion-reduce:h-auto motion-reduce:py-24">
        <div className="absolute inset-0 m-auto aspect-square max-h-[92svh] w-full max-w-[920px] opacity-60 motion-reduce:relative motion-reduce:hidden">
          <Scene3D className="h-full w-full" progress={progress} size={0.034} />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 px-4 sm:px-6 lg:px-10">
          {chapters.map((c, i) => (
            <div
              key={c.word}
              data-chapter
              className="col-start-1 row-start-1 flex flex-col items-center text-center motion-reduce:row-auto motion-reduce:mb-16"
            >
              <span className="eyebrow mb-4 text-accent">0{i + 1} / 03</span>
              <h2 className="font-display text-[clamp(4rem,17vw,15rem)] uppercase leading-none text-white drop-shadow-[0_10px_50px_rgba(0,0,0,0.95)]">
                {c.word}
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">{c.text}</p>
            </div>
          ))}
        </div>

        <div className="absolute inset-x-4 bottom-8 mx-auto h-px max-w-xs bg-white/10 sm:inset-x-0 motion-reduce:hidden">
          <div data-story-bar className="h-full origin-left bg-gradient-to-r from-accent to-accent-2" />
        </div>
      </div>
    </section>
  );
}

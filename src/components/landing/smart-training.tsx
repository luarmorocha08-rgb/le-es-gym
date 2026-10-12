import { ArrowUpRight, BrainCircuit, ClipboardList, UserCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal, TextReveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";

const cards: { n: string; icon: ReactNode; title: string; text: string; detail: string[] }[] = [
  {
    n: "01",
    icon: <ClipboardList />,
    title: "Monte seu treino",
    text: "Personalize sua rotina de exercícios.",
    detail: ["Divisões ABC, ABCD, Full Body, Upper/Lower", "Biblioteca com instruções de execução", "Séries, repetições, descanso e cargas"],
  },
  {
    n: "02",
    icon: <BrainCircuit />,
    title: "Treine com IA",
    text: "Receba sugestões de treino personalizadas por inteligência artificial.",
    detail: ["Considera objetivo, rotina e equipamentos", "Ficha editável, identificada como sugestão", "Envie para revisão de um profissional"],
  },
  {
    n: "03",
    icon: <UserCheck />,
    title: "Acompanhamento profissional",
    text: "Solicite orientação dos treinadores da academia.",
    detail: ["Peça um treino ao seu treinador", "Acompanhe o status da solicitação", "Receba ajustes conforme você evolui"],
  },
];

export function SmartTraining() {
  return (
    <section id="plataforma" aria-labelledby="plataforma-title" className="relative scroll-mt-20 py-28 sm:py-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <TextReveal>
            <p className="eyebrow mb-6">02 — Plataforma</p>
            <h2 id="plataforma-title" className="font-display text-[clamp(2.8rem,8vw,7.5rem)] uppercase leading-[0.9]">
              <span className="block overflow-hidden py-[0.14em] -my-[0.14em]">
                <span data-line className="block">
                  Treine com
                </span>
              </span>
              <span className="block overflow-hidden py-[0.14em] -my-[0.14em]">
                <span data-line className="block text-metal text-metal-animated">
                  inteligência.
                </span>
              </span>
            </h2>
          </TextReveal>
          <p className="max-w-sm text-base leading-relaxed text-white/60">
            Tecnologia a serviço do seu treino — e nunca no lugar de quem entende. Sugestões da IA são sempre
            identificadas e podem ser revisadas pelos nossos profissionais.
          </p>
        </div>

        <Reveal as="ul" className="mt-16 grid gap-5 lg:grid-cols-3" stagger={0.12}>
          {cards.map((card) => (
            <li key={card.n} data-reveal>
              <TiltCard className="flex min-h-[440px] flex-col p-7">
                <div className="flex items-center justify-between [transform:translateZ(40px)]">
                  <span className="grid size-14 place-items-center rounded-2xl bg-white text-black [&_svg]:size-6">
                    {card.icon}
                  </span>
                  <span className="font-display text-5xl text-white/10">{card.n}</span>
                </div>
                <div className="mt-auto [transform:translateZ(30px)]">
                  <h3 className="font-display text-4xl uppercase leading-none">{card.title}</h3>
                  <p className="mt-3 text-white/65">{card.text}</p>
                  <ul className="mt-6 space-y-2 border-t border-white/10 pt-5">
                    {card.detail.map((d) => (
                      <li key={d} className="flex gap-2 text-sm text-white/55">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-white/50" aria-hidden />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </TiltCard>
            </li>
          ))}
        </Reveal>

        <div className="mt-10 flex justify-center">
          <Link
            href="/cadastro"
            className="group inline-flex items-center gap-2 font-heading text-xs uppercase tracking-[0.24em] text-white/80 hover:text-white"
          >
            Criar minha conta de aluno
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

import { ArrowUpRight, Baby, CalendarDays, Dumbbell, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Reveal, Parallax, TextReveal } from "@/components/motion/reveal";
import { gym, fullAddress, mapsEmbedUrl, mapsUrl, media } from "@/content/gym";
import { OpeningHours } from "./opening-hours";

const features: { icon: ReactNode; title: string; text: string; href?: string }[] = [
  {
    icon: <Dumbbell />,
    title: "Estrutura de grandes redes",
    text: "Área de musculação completa para treinos de força, hipertrofia e condicionamento.",
  },
  {
    icon: <Users />,
    title: "Atendimento de bairro",
    text: "Equipe próxima, que conhece cada aluno pelo nome e acompanha a sua evolução.",
    href: "/equipe",
  },
  {
    icon: <CalendarDays />,
    title: "Grade de aulas",
    text: "Aulas coletivas para variar o estímulo e treinar em comunidade.",
  },
  {
    icon: <Baby />,
    title: "Espaço Kids",
    text: "A academia da família: um espaço pensado para quem treina com os filhos por perto.",
  },
];

export function AcademySection() {
  return (
    <section id="academia" aria-labelledby="academia-title" className="relative scroll-mt-20 py-28 sm:py-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <TextReveal>
            <p className="eyebrow mb-6">01 — A academia</p>
            <h2 id="academia-title" className="font-display text-[clamp(2.8rem,7.5vw,7rem)] uppercase leading-[0.9]">
              <span className="block overflow-hidden py-[0.14em] -my-[0.14em]">
                <span data-line className="block">
                  Estrutura de rede.
                </span>
              </span>
              <span className="block overflow-hidden py-[0.14em] -my-[0.14em]">
                <span data-line className="block text-white/55">
                  Alma de bairro.
                </span>
              </span>
            </h2>
          </TextReveal>
          <Reveal className="flex flex-col justify-end gap-6 text-lg leading-relaxed text-white/70">
            <p data-reveal>
              A {gym.name} nasceu em Santos com uma proposta clara: unir a estrutura das grandes redes ao atendimento
              próximo de uma academia de bairro — e entregar uma experiência premium para toda a família.
            </p>
            <p data-reveal className="font-heading text-base uppercase tracking-[0.14em] text-white">
              “{gym.slogan}”
            </p>
          </Reveal>
        </div>

        <Reveal as="ul" className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
          {features.map((f, i) => {
            const content = (
              <>
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-xl border border-white/15 bg-white/[0.04] [&_svg]:size-5">
                    {f.icon}
                  </span>
                  <span className="font-heading text-xs tracking-[0.2em] text-white/55">0{i + 1}</span>
                </div>
                <h3 className="mt-10 font-heading text-xl uppercase tracking-[0.06em]">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{f.text}</p>
                {f.href && (
                  <span className="mt-6 inline-flex items-center gap-1.5 font-heading text-[0.7rem] uppercase tracking-[0.2em] text-white/80">
                    Conhecer <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                )}
              </>
            );
            const cls =
              "group metal-border relative flex h-full flex-col rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent p-6 transition-colors duration-500 hover:from-white/[0.09]";
            return (
              <li key={f.title} data-reveal>
                {f.href ? (
                  <Link href={f.href} className={cls}>
                    {content}
                  </Link>
                ) : (
                  <div className={cls}>{content}</div>
                )}
              </li>
            );
          })}
        </Reveal>

        {media.gallery.length > 0 && (
          <div className="mt-24 grid grid-cols-2 gap-4 lg:grid-cols-3" aria-label="Galeria da academia">
            {media.gallery.map((img, i) => (
              <Parallax key={img.src} speed={i % 2 ? 0.08 : 0.16} className="overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element -- mídias locais da academia */}
                <img src={img.src} alt={img.alt} className="aspect-[4/5] w-full object-cover grayscale" loading="lazy" />
              </Parallax>
            ))}
          </div>
        )}

        {/* Localização e horários */}
        <div className="mt-24 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="metal-border relative min-h-[320px] overflow-hidden rounded-2xl bg-[#0b0b0c]">
            <iframe
              title={`Mapa — ${gym.name}`}
              src={mapsEmbedUrl}
              className="absolute inset-0 h-full w-full grayscale invert-[0.92] contrast-[0.9]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="metal-border glass relative flex flex-col gap-10 rounded-2xl p-7">
            <div>
              <p className="eyebrow mb-4 flex items-center gap-2">
                <MapPin className="size-3.5" aria-hidden /> Localização
              </p>
              <address className="not-italic">
                <span className="block font-heading text-2xl uppercase leading-tight tracking-[0.04em]">
                  {gym.address.street}
                </span>
                <span className="mt-1 block text-white/60">
                  {gym.address.complement} · {gym.address.city}/{gym.address.state} · {gym.address.zip}
                </span>
              </address>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Como chegar: ${fullAddress} (abre o Google Maps)`}
                className="mt-5 inline-flex items-center gap-1.5 font-heading text-[0.72rem] uppercase tracking-[0.2em] text-white hover:underline"
              >
                Como chegar <ArrowUpRight className="size-3.5" />
              </a>
            </div>
            <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-white/[0.04]" />}>
              <OpeningHours />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}

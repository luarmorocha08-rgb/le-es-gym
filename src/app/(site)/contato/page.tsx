import { ArrowUpRight, MapPin, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { InstagramIcon } from "@/components/brand/social-icons";
import { OpeningHours } from "@/components/landing/opening-hours";
import { PageHero } from "@/components/layout/page-hero";
import { fullAddress, gym, mapsEmbedUrl, mapsUrl } from "@/content/gym";

/** Horários e equipe vêm do banco; revalida a cada 5 minutos. */
export const revalidate = 300;

export const metadata: Metadata = { title: "Contato", description: `Fale com a ${gym.name} em Santos/SP.` };

const channels = [
  { href: gym.links.whatsapp, icon: MessageCircle, title: "WhatsApp", text: "Planos, aula experimental e dúvidas." },
  { href: gym.links.instagram, icon: InstagramIcon, title: "Instagram", text: gym.links.instagramHandle },
  { href: mapsUrl, icon: MapPin, title: "Como chegar", text: fullAddress },
];

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contato" title={<>Vem treinar <span className="text-metal">com a gente.</span></>} />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-20 sm:px-6 lg:grid-cols-3 lg:px-10">
        {channels.map((c) => (
          <a
            key={c.title}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className="metal-border glass group relative flex flex-col rounded-2xl p-7 transition hover:bg-white/[0.06]"
          >
            <c.icon className="size-6" />
            <span className="mt-10 flex items-center justify-between font-heading text-2xl uppercase tracking-[0.04em]">
              {c.title}
              <ArrowUpRight className="size-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
            </span>
            <span className="mt-2 text-sm text-white/60">{c.text}</span>
          </a>
        ))}
        <div className="metal-border relative min-h-[360px] overflow-hidden rounded-2xl lg:col-span-2">
          <iframe
            title={`Mapa — ${gym.name}`}
            src={mapsEmbedUrl}
            className="absolute inset-0 h-full w-full grayscale invert-[0.92]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="metal-border glass relative rounded-2xl p-7">
          <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-white/[0.04]" />}>
            <OpeningHours />
          </Suspense>
        </div>
      </section>
    </>
  );
}

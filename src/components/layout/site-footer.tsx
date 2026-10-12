import { ArrowUpRight, MapPin, MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/brand/social-icons";
import Link from "next/link";
import { Emblem } from "@/components/brand/emblem";
import { gym, mapsUrl } from "@/content/gym";

const columns = [
  {
    title: "Academia",
    links: [
      { href: "/academia", label: "Sobre" },
      { href: "/equipe", label: "Equipe" },
      { href: "/contato", label: "Contato" },
    ],
  },
  {
    title: "Plataforma",
    links: [
      { href: "/login?perfil=aluno", label: "Portal do aluno" },
      { href: "/login?perfil=profissional", label: "Portal do profissional" },
      { href: "/cadastro", label: "Criar conta" },
    ],
  },
  {
    title: "Legal",
    links: [{ href: "/privacidade", label: "Privacidade e LGPD" }],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#050505]">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:px-10">
        <div className="flex flex-col gap-6">
          <Emblem className="size-28 text-white" />
          <p className="max-w-xs font-heading text-sm uppercase leading-relaxed tracking-[0.14em] text-white/60">
            {gym.slogan}
          </p>
          <div className="flex gap-2">
            <a
              href={gym.links.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram ${gym.links.instagramHandle}`}
              className="grid size-11 place-items-center rounded-xl border border-white/15 transition hover:border-white hover:bg-white hover:text-black"
            >
              <InstagramIcon className="size-4" />
            </a>
            <a
              href={gym.links.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp da academia"
              className="grid size-11 place-items-center rounded-xl border border-white/15 transition hover:border-white hover:bg-white hover:text-black"
            >
              <MessageCircle className="size-4" />
            </a>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Localização no Google Maps"
              className="grid size-11 place-items-center rounded-xl border border-white/15 transition hover:border-white hover:bg-white hover:text-black"
            >
              <MapPin className="size-4" />
            </a>
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-3">
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="eyebrow mb-5">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/70 transition hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="sm:col-span-3">
            <p className="eyebrow mb-3">Endereço</p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-start gap-2 text-sm text-white/70 hover:text-white"
            >
              {gym.address.street}, {gym.address.complement} — {gym.address.city}/{gym.address.state}, {gym.address.zip}
              <ArrowUpRight className="mt-0.5 size-3.5 shrink-0" />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-white/40 sm:flex-row sm:justify-between sm:px-6 lg:px-10">
          <p>© {new Date().getFullYear()} {gym.name}. Todos os direitos reservados.</p>
          <p>{gym.links.instagramHandle} · Santos/SP</p>
        </div>
      </div>
    </footer>
  );
}

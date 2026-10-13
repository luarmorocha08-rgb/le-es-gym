import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Emblem, Wordmark } from "@/components/brand/emblem";
import { gym } from "@/content/gym";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(480px,560px)]">
      <aside className="grain relative hidden overflow-hidden border-r border-white/10 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_30%_20%,rgba(255,255,255,0.14),transparent_60%),linear-gradient(180deg,#0c0c0d,#000)]" />
        <div className="absolute -top-1/4 left-1/2 h-[150%] w-40 rotate-[18deg] bg-gradient-to-b from-white/15 to-transparent blur-2xl" />
        <Link href="/" className="relative" aria-label="Voltar ao início">
          <Wordmark />
        </Link>
        <div className="relative">
          <Emblem className="mb-10 size-40 text-white" />
          <p className="font-display text-[clamp(3rem,5vw,5.5rem)] uppercase leading-[0.9]">
            Se você quer ser um leão,
            <br />
            <span className="text-metal">deve treinar com os leões.</span>
          </p>
        </div>
        <p className="relative text-sm text-white/55">
          {gym.address.street} · {gym.address.city}/{gym.address.state}
        </p>
      </aside>

      <main id="conteudo" className="flex flex-col px-4 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-heading text-[0.7rem] uppercase tracking-[0.2em] text-white/60 hover:text-white"
          >
            <ArrowLeft className="size-4" /> Início
          </Link>
          <span className="lg:hidden">
            <Wordmark />
          </span>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">{children}</div>
      </main>
    </div>
  );
}

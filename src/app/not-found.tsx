import Link from "next/link";
import { RevoMark } from "@/components/brand/emblem";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="conteudo" className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <RevoMark className="mx-auto size-16 text-accent" />
        <p className="eyebrow mt-8">Erro 404</p>
        <h1 className="mt-3 font-display text-6xl uppercase leading-none sm:text-8xl">Território desconhecido.</h1>
        <p className="mt-5 text-white/60">A página que você procura não existe ou foi movida.</p>
        <Button asChild className="mt-10">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </main>
  );
}

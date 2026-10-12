"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="conteudo" className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="eyebrow">Algo deu errado</p>
        <h1 className="mt-3 font-display text-5xl uppercase leading-none sm:text-7xl">Respira. Tenta de novo.</h1>
        <p className="mt-5 text-white/60">Ocorreu um erro inesperado ao carregar esta página.</p>
        <Button className="mt-10" onClick={reset}>
          <RotateCcw /> Tentar novamente
        </Button>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { RevoMark } from "@/components/brand/emblem";
import { ReloadButton } from "@/components/layout/reload-button";

export const metadata: Metadata = { title: "Sem conexão", robots: { index: false } };
export const dynamic = "force-static";

/** Mostrada pelo service worker quando uma página não pode ser carregada. */
export default function OfflinePage() {
  return (
    <main id="conteudo" className="grid min-h-dvh place-items-center bg-black px-6 text-center">
      <div className="max-w-sm">
        <RevoMark className="mx-auto size-16 text-accent/80" />
        <h1 className="mt-6 font-display text-5xl uppercase leading-none">Sem conexão</h1>
        <p className="mt-4 text-white/65">
          Não foi possível carregar esta página. Confira o Wi-Fi ou os dados móveis — quando a conexão voltar, é só tentar de novo.
        </p>
        <p className="mt-2 text-sm text-white/55">
          Se você estava no meio de um treino, as séries registradas sem conexão são enviadas assim que a página volta a ficar online.
        </p>
        <ReloadButton />
      </div>
    </main>
  );
}

"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";
import { useEffect } from "react";

/** Aviso global de conexão + registro do service worker (somente produção). */
export function Connectivity() {
  const offline = useOffline();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-3 z-[60] mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-white/20 bg-black/90 px-4 py-2 text-sm shadow-lg backdrop-blur-xl"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      Sem conexão. O que você registrar será enviado quando a conexão voltar.
    </div>
  );
}

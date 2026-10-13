"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";

/** Esqueleto de carregamento dos portais; sem conexão, explica a espera. */
export function PortalLoading() {
  const offline = useOffline();
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando">
      {offline && (
        <p role="status" className="flex items-center gap-2 text-sm text-white/70">
          <WifiOff className="size-4" aria-hidden /> Aguardando a conexão para carregar esta página…
        </p>
      )}
      <div className="h-16 w-64 animate-pulse rounded-xl bg-white/[0.06] motion-reduce:animate-none" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/[0.04] motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}

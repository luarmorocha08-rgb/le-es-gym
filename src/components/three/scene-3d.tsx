"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type RefObject } from "react";
import { RevoMark } from "@/components/brand/emblem";
import { usePrefersReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const RevoCoreCanvas = dynamic(() => import("./revo-core"), {
  ssr: false,
  loading: () => null,
});

/** Economia de dados ou aparelho modesto → símbolo estático (evita ~1 MB de JS 3D). */
function prefersLightweight() {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return Boolean(nav.connection?.saveData) || (nav.deviceMemory !== undefined && nav.deviceMemory < 4);
}

function supportsWebGL() {
  if (prefersLightweight()) return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Fallback estático: símbolo com brilho em CSS (sem WebGL / movimento reduzido). */
export function CoreFallback({ className }: { className?: string }) {
  return (
    <div className={cn("relative grid place-items-center", className)} aria-hidden>
      <div className="absolute size-[70%] rounded-full bg-[radial-gradient(circle,rgba(62,230,255,0.2),rgba(138,125,255,0.08)_45%,transparent_70%)] blur-2xl" />
      <RevoMark className="relative w-[46%] text-accent drop-shadow-[0_0_40px_rgba(62,230,255,0.35)]" />
    </div>
  );
}

/**
 * Carrega a cena 3D somente no cliente, quando há suporte a WebGL, o usuário
 * não prefere movimento reduzido e o aparelho/conexão comporta. Pausa a renderização fora da viewport.
 */
export function Scene3D({
  className,
  progress,
  particles,
  size,
}: {
  className?: string;
  progress?: RefObject<number>;
  particles?: boolean;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detecção de capacidade só existe no cliente
    setWebgl(supportsWebGL());
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const use3D = webgl === true && !reduced;

  return (
    <div ref={ref} className={cn("relative", className)}>
      {use3D ? (
        <RevoCoreCanvas progress={progress} active={visible} particles={particles} size={size} />
      ) : (
        <CoreFallback className="h-full w-full" />
      )}
    </div>
  );
}

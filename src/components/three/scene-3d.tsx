"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type RefObject } from "react";
import { LionHead } from "@/components/brand/emblem";
import { usePrefersReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const LionMedallionCanvas = dynamic(() => import("./lion-medallion"), {
  ssr: false,
  loading: () => null,
});

/** Economia de dados ou aparelho modesto → emblema estático (evita ~1 MB de JS 3D). */
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

/** Fallback estático: emblema com iluminação em CSS (sem WebGL / movimento reduzido). */
export function MedallionFallback({ className }: { className?: string }) {
  return (
    <div className={cn("relative grid place-items-center", className)} aria-hidden>
      <div className="absolute size-[70%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16),transparent_65%)] blur-2xl" />
      <LionHead className="relative w-[46%] text-[#d9dbde] drop-shadow-[0_20px_50px_rgba(255,255,255,0.18)]" />
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
        <LionMedallionCanvas progress={progress} active={visible} particles={particles} size={size} />
      ) : (
        <MedallionFallback className="h-full w-full" />
      )}
    </div>
  );
}

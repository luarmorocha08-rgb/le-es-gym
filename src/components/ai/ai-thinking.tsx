"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { LionHead } from "@/components/brand/emblem";

const STEPS = ["Analisando seus objetivos…", "Consultando a biblioteca de exercícios…", "Estruturando sua rotina…", "Revisando volume e descanso…"];

/** Tela de processamento: leão com anéis de energia e mensagens em sequência. */
export function AiThinking({ steps = STEPS }: { steps?: string[] }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => Math.min(v + 1, steps.length - 1)), 2800);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center py-16 text-center" role="status" aria-live="polite">
      <div className="relative grid size-44 place-items-center">
        {!reduce &&
          [0, 1, 2].map((k) => (
            <motion.span
              key={k}
              className="absolute inset-0 rounded-full border border-white/30"
              animate={{ scale: [0.7, 1.6], opacity: [0.7, 0] }}
              transition={{ duration: 2.6, delay: k * 0.85, repeat: Infinity, ease: "easeOut" }}
            />
          ))}
        <motion.div
          className="grid size-28 place-items-center rounded-full border border-white/25 bg-[radial-gradient(circle_at_35%_30%,#34373c,#0b0c0e_70%)] shadow-[0_0_60px_rgba(255,255,255,0.18)]"
          animate={reduce ? undefined : { rotate: [0, 4, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <LionHead className="size-16 text-white" />
        </motion.div>
      </div>
      <div className="mt-10 h-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            className="font-display text-2xl uppercase tracking-wide sm:text-3xl"
          >
            {steps[i]}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="mt-3 text-xs text-white/55">Isso pode levar até um minuto.</p>
    </div>
  );
}

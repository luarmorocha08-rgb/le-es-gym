"use client";

import { motion, useReducedMotion } from "motion/react";
import { RevoMark } from "@/components/brand/emblem";

/** Animação de conclusão: emblema surge com anel de luz e texto em revelação. */
export function CompletionHero() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex flex-col items-center py-10 text-center">
      <div className="relative grid size-40 place-items-center">
        {!reduce &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border border-accent/50"
              initial={{ scale: 0.6, opacity: 0.8 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 2.4, delay: i * 0.6, repeat: Infinity, ease: "easeOut" }}
            />
          ))}
        <motion.div
          initial={reduce ? false : { scale: 0.3, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
          className="grid size-32 place-items-center rounded-full border border-accent/40 bg-[radial-gradient(circle_at_35%_30%,#16283a,#070b12_70%)] shadow-[0_0_80px_rgba(62,230,255,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]"
        >
          <RevoMark className="size-20 text-accent" />
        </motion.div>
      </div>
      <motion.h1
        initial={reduce ? false : { y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mt-10 font-display text-5xl uppercase leading-[0.95] sm:text-7xl"
      >
        Treino concluído.
      </motion.h1>
      <motion.p
        initial={reduce ? false : { y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mt-3 font-heading text-lg uppercase tracking-[0.18em] text-metal"
      >
        Mais um passo na sua evolução.
      </motion.p>
    </div>
  );
}

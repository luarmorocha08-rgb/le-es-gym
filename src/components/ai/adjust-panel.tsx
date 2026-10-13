"use client";

import { Wand2 } from "lucide-react";
import { useState } from "react";
import { PlanDiffView } from "@/components/trainer/plan-diff";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { suggestionToSnapshot } from "@/lib/ai/normalize";
import type { Suggestion } from "@/lib/ai/schemas";
import { diffPlans } from "@/lib/workout/diff";

/** Pedidos de ajuste (atalhos + texto) e comparação com a versão anterior. */
export function AdjustPanel({
  presets,
  onAdjust,
  pending,
  previous,
  current,
}: {
  presets: string[];
  onAdjust: (instruction: string) => void;
  pending: boolean;
  previous: Suggestion | null;
  current: Suggestion;
}) {
  const [text, setText] = useState("");
  const diff = previous ? diffPlans(suggestionToSnapshot(previous), suggestionToSnapshot(current)) : null;
  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-labelledby="ajustes">
      <h3 id="ajustes" className="eyebrow flex items-center gap-2">
        <Wand2 className="size-3.5" aria-hidden /> Pedir ajuste à IA
      </h3>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            disabled={pending}
            onClick={() => onAdjust(p)}
            className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs text-white/75 transition hover:border-white/50 disabled:opacity-40"
          >
            {p}
          </button>
        ))}
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length >= 3) onAdjust(text.trim());
        }}
      >
        <label className="flex-1">
          <span className="sr-only">Descreva o ajuste</span>
          <Textarea className="min-h-12" rows={1} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: trocar o leg press por algo com halteres" />
        </label>
        <Button type="submit" disabled={pending || text.trim().length < 3} className="h-12">
          Ajustar
        </Button>
      </form>
      {diff && (
        <details open className="rounded-xl border border-white/10 p-4">
          <summary className="cursor-pointer text-sm text-white/70">O que mudou em relação à versão anterior</summary>
          <div className="mt-3">
            <PlanDiffView diff={diff} fromLabel="versão anterior" toLabel="versão atual" />
          </div>
        </details>
      )}
    </section>
  );
}

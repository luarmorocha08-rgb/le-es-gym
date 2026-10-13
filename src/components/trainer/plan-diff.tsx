import { ArrowRight, Minus, Plus, Shuffle } from "lucide-react";
import type { PlanDiff } from "@/lib/workout/diff";

/** Comparação legível entre a versão publicada e a nova versão. */
export function PlanDiffView({ diff, fromLabel, toLabel }: { diff: PlanDiff; fromLabel: string; toLabel: string }) {
  if (!diff.hasChanges) return <p className="text-sm text-white/55">Nenhuma diferença em relação à {fromLabel}.</p>;
  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-white/45">
        {fromLabel} <ArrowRight className="inline size-3" /> {toLabel}
      </p>
      {diff.titleChanged && (
        <p>
          Título: <span className="text-white/50 line-through">{diff.titleChanged.from}</span> → {diff.titleChanged.to}
        </p>
      )}
      {diff.splitChanged && (
        <p>
          Divisão: <span className="text-white/50 line-through">{diff.splitChanged.from}</span> → {diff.splitChanged.to}
        </p>
      )}
      <ul className="space-y-3">
        {diff.days
          .filter((d) => d.status !== "igual")
          .map((d) => (
            <li key={d.label} className="rounded-xl border border-white/10 p-3">
              <p className="font-heading uppercase tracking-[0.06em]">
                Dia {d.label} <span className="text-xs normal-case tracking-normal text-white/45">· {d.status}</span>
              </p>
              <ul className="mt-2 space-y-1 text-white/75">
                {d.added.map((n) => (
                  <li key={`a${n}`} className="flex items-center gap-2">
                    <Plus className="size-3.5 text-white" aria-label="adicionado" /> {n}
                  </li>
                ))}
                {d.removed.map((n) => (
                  <li key={`r${n}`} className="flex items-center gap-2 text-white/50 line-through">
                    <Minus className="size-3.5" aria-label="removido" /> {n}
                  </li>
                ))}
                {d.changed.map((c, i) => (
                  <li key={`c${i}`} className="pl-5">
                    {c.name}: {c.field} <span className="text-white/45">{c.from}</span> → {c.to}
                  </li>
                ))}
                {d.reordered && (
                  <li className="flex items-center gap-2 text-white/55">
                    <Shuffle className="size-3.5" aria-hidden /> ordem dos exercícios alterada
                  </li>
                )}
              </ul>
            </li>
          ))}
      </ul>
    </div>
  );
}

"use client";

import { Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { useState, useTransition } from "react";

export type SubstituteOption = { exerciseId: string; name: string; reason: string };
export type SubstitutesAction = (
  exerciseId: string,
) => Promise<{ ok: true; data: { options: SubstituteOption[] } } | { ok: false; code: string; message: string }>;

/**
 * Alternativas sugeridas pela IA para um exercício do editor. Nada é trocado
 * sem o clique explícito em "Trocar"; as opções vêm só do catálogo da academia.
 */
export function SubstitutePanel({ exerciseId, load, onPick }: { exerciseId: string; load: SubstitutesAction; onPick: (exerciseId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<SubstituteOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function fetchOptions() {
    setOpen(true);
    setError(null);
    start(async () => {
      const res = await load(exerciseId);
      if (res.ok) setOptions(res.data.options);
      else setError(res.message);
    });
  }

  if (!open) {
    return (
      <button type="button" className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white" onClick={fetchOptions}>
        <Sparkles className="size-3.5" /> Substituir com IA
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3" role="region" aria-label="Alternativas sugeridas pela IA">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-white/55">
          <Sparkles className="size-3.5" /> Sugestão da IA · confira antes de trocar
        </p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Fechar alternativas" className="rounded-md p-1 text-white/50 hover:text-white">
          <X className="size-3.5" />
        </button>
      </div>
      {pending ? (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-white/60">
          <Loader2 className="size-4 animate-spin" /> Buscando alternativas…
        </p>
      ) : error ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-danger)]" role="alert">{error}</p>
          <button type="button" onClick={fetchOptions} className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
            <RefreshCw className="size-3.5" /> Tentar de novo
          </button>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-white/5">
          {options?.map((o) => (
            <li key={o.exerciseId} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{o.name}</p>
                <p className="text-xs text-white/50">{o.reason}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-md border border-white/15 px-2.5 py-1 text-xs hover:bg-white hover:text-black"
                onClick={() => {
                  onPick(o.exerciseId);
                  setOpen(false);
                  setOptions(null);
                }}
                aria-label={`Trocar por ${o.name}`}
              >
                Trocar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

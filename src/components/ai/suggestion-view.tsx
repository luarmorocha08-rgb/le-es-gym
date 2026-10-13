import { AlertTriangle, Info, Sparkles, TrendingUp } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { Suggestion } from "@/lib/ai/schemas";
import { muscleLabel, SPLIT_LABELS } from "@/lib/workout/constants";

const rest = (s: number) => (s === 0 ? "sem descanso" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}min${s % 60 ? ` ${s % 60}s` : ""}`);

/** Exibição da sugestão — sempre identificada como sugestão, nunca como prescrição. */
export function SuggestionView({ suggestion: s, audience }: { suggestion: Suggestion; audience: "aluno" | "profissional" }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap gap-2">
          <Badge className="border-white text-white">
            <Sparkles className="size-3" /> Sugestão de IA
          </Badge>
          <Badge>{SPLIT_LABELS[s.split_type]}</Badge>
          <Badge>
            {s.days.length} {s.days.length === 1 ? "dia" : "dias"}
          </Badge>
        </div>
        <h2 className="mt-3 font-display text-4xl uppercase leading-[0.95] sm:text-5xl">{s.title}</h2>
        <p className="mt-3 max-w-2xl text-white/70">{s.summary}</p>
        {s.weekly_schedule && <p className="mt-2 max-w-2xl text-sm text-white/55">{s.weekly_schedule}</p>}
      </div>

      {s.requires_professional_evaluation && (
        <Alert tone="error" title="Recomendamos avaliação antes de começar">
          Você informou algo que merece atenção (dor, lesão ou condição de saúde). Esta sugestão não substitui uma avaliação: converse
          com um profissional de saúde ou com um treinador da academia antes de seguir.
        </Alert>
      )}
      {s.safety_notes.length > 0 && (
        <Alert title="Cuidados">
          <ul className="list-disc space-y-1 pl-4">
            {s.safety_notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {s.days.map((d) => (
          <section key={d.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-label={`Dia ${d.label}`}>
            <h3 className="flex items-center gap-3 font-heading text-lg uppercase tracking-[0.04em]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white font-display text-black">{d.label.slice(0, 3)}</span>
              {d.name}
            </h3>
            <ol className="mt-4 divide-y divide-white/[0.06]">
              {d.exercises.map((e, i) => (
                <li key={e.slug} className="flex justify-between gap-3 py-2.5 text-sm">
                  <span>
                    <span className="mr-2 text-white/35">{i + 1}.</span>
                    {e.name}
                    <span className="block text-xs text-white/45">{e.primary_muscles.map(muscleLabel).join(", ")}</span>
                    {e.notes && <span className="block text-xs italic text-white/60">{e.notes}</span>}
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    {e.sets} × {e.reps}
                    <span className="block text-xs text-white/45">{rest(e.rest_seconds)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-white/10 p-5" aria-label="Progressão">
          <h3 className="eyebrow mb-2 flex items-center gap-2">
            <TrendingUp className="size-3.5" /> Progressão
          </h3>
          <p className="text-sm text-white/70">{s.progression}</p>
        </section>
        {s.general_tips.length > 0 && (
          <section className="rounded-2xl border border-white/10 p-5" aria-label="Orientações">
            <h3 className="eyebrow mb-2 flex items-center gap-2">
              <Info className="size-3.5" /> Orientações
            </h3>
            <ul className="list-disc space-y-1 pl-4 text-sm text-white/70">
              {s.general_tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {s.dropped_exercises.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-white/45">
          <AlertTriangle className="size-3.5" /> {s.dropped_exercises.length} exercício(s) fora da biblioteca da academia foram removidos automaticamente.
        </p>
      )}
      <p className="text-xs text-white/40">
        {audience === "aluno"
          ? "Sugestão gerada automaticamente. Não é prescrição profissional, não promete resultados e não substitui avaliação. Em caso de dor, interrompa e procure orientação."
          : "Sugestão gerada automaticamente com base nos dados autorizados do aluno. Revise, ajuste e só publique o que você aprovar."}
      </p>
    </div>
  );
}

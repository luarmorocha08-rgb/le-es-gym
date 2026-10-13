"use client";

import { Loader2, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { askAboutExercise } from "@/app/aluno/_actions/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Dúvida pontual sobre a execução de um exercício, respondida pela IA. */
export function ExerciseQuestion({ slug, hasConsent }: { slug: string; hasConsent: boolean }) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; safety_note: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="eyebrow flex items-center gap-2">
        <Sparkles className="size-3.5" aria-hidden /> Tirar dúvida com a IA
      </h2>
      {!hasConsent ? (
        <p className="mt-3 text-sm text-white/60">
          Para usar a IA, autorize primeiro em{" "}
          <Link href="/aluno/treino-ia" className="underline underline-offset-4 hover:text-white">
            IA de treino
          </Link>
          .
        </p>
      ) : (
        <form
          className="mt-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            setError(null);
            start(async () => {
              const res = await askAboutExercise(slug, question);
              if (res.ok) setAnswer(res.data);
              else setError(res.message);
            });
          }}
        >
          <label htmlFor={`${id}-q`} className="sr-only">
            Sua dúvida sobre o exercício
          </label>
          <Textarea
            id={`${id}-q`}
            value={question}
            maxLength={400}
            onChange={(ev) => setQuestion(ev.target.value)}
            placeholder="Ex.: como evitar sentir no ombro?"
            className="min-h-20 text-sm"
          />
          <Button type="submit" size="sm" className="mt-3 w-full" disabled={pending || question.trim().length < 5}>
            {pending && <Loader2 className="animate-spin" />} Perguntar
          </Button>
          {error && (
            <p className="mt-3 text-sm text-[var(--color-danger)]" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
      {answer && (
        <div className="mt-4 border-t border-white/10 pt-4" aria-live="polite">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-white/45">Resposta gerada por IA</p>
          <p className="mt-2 whitespace-pre-line text-sm text-white/80">{answer.answer}</p>
          {answer.safety_note && (
            <p className="mt-3 flex gap-2 text-xs text-white/60">
              <ShieldAlert className="size-4 shrink-0" aria-hidden /> {answer.safety_note}
            </p>
          )}
          <p className="mt-3 text-xs text-white/40">Orientação geral — não substitui a avaliação de um profissional.</p>
        </div>
      )}
    </section>
  );
}

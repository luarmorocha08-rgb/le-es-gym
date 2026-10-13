import { ArrowLeft, ExternalLink, History, Lightbulb } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseTile } from "@/components/student/exercise-tile";
import { Badge } from "@/components/ui/badge";
import { requireArea } from "@/lib/auth/dal";
import { exerciseHistory, getExercise } from "@/lib/student/queries";
import { LEVEL_LABELS, muscleLabel, type Level } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Exercício" };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

export default async function ExercisePage({ params }: PageProps<"/aluno/exercicios/[slug]">) {
  const viewer = await requireArea("aluno");
  const { slug } = await params;
  const exercise = await getExercise(viewer.id, slug);
  if (!exercise) notFound();
  const history = await exerciseHistory(viewer.id, exercise.id);
  const best = history.reduce<number | null>((m, h) => (h.load_kg !== null && (m === null || h.load_kg > m) ? h.load_kg : m), null);

  return (
    <article>
      <Link href="/aluno/exercicios" className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> Exercícios
      </Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-wrap gap-2">
            {exercise.primary_muscles.map((m) => (
              <Badge key={m} className="border-white/40 text-white">
                {muscleLabel(m)}
              </Badge>
            ))}
            {exercise.secondary_muscles.map((m) => (
              <Badge key={m}>{muscleLabel(m)}</Badge>
            ))}
          </div>
          <h1 className="mt-4 font-display text-5xl uppercase leading-[0.95] sm:text-6xl">{exercise.name}</h1>
          <p className="mt-3 text-white/55">
            {exercise.equipment} · {exercise.mechanics ?? "—"} · {LEVEL_LABELS[exercise.level as Level] ?? exercise.level}
          </p>

          <h2 className="eyebrow mt-10">Execução</h2>
          <ol className="mt-4 space-y-3">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="flex gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white font-display text-black">{i + 1}</span>
                <p className="pt-1 text-white/80">{step}</p>
              </li>
            ))}
          </ol>

          {exercise.tips.length > 0 && (
            <>
              <h2 className="eyebrow mt-10 flex items-center gap-2">
                <Lightbulb className="size-3.5" aria-hidden /> Dicas
              </h2>
              <ul className="mt-4 space-y-2 text-white/70">
                {exercise.tips.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-white/50" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-10 text-xs text-white/40">
            Em caso de dor ou desconforto, interrompa o exercício e procure um profissional da academia.
          </p>
        </div>

        <aside className="space-y-4">
          <ExerciseTile muscles={exercise.primary_muscles} className="aspect-[4/3] w-full" />
          {exercise.video_url && (
            <a
              href={exercise.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-sm hover:border-white/40"
            >
              Ver vídeo demonstrativo <ExternalLink className="size-4" />
            </a>
          )}
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-labelledby="historico">
            <h2 id="historico" className="eyebrow flex items-center gap-2">
              <History className="size-3.5" aria-hidden /> Seu histórico
            </h2>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-white/55">Você ainda não registrou séries deste exercício.</p>
            ) : (
              <>
                <p className="mt-3 font-display text-4xl">{best ?? "—"} kg</p>
                <p className="text-xs text-white/45">maior carga registrada</p>
                <ul className="mt-4 divide-y divide-white/[0.06] text-sm">
                  {history.slice(0, 8).map((h, i) => (
                    <li key={i} className="flex justify-between py-2 tabular-nums">
                      <span className="text-white/55">{dateFmt.format(new Date(h.completed_at))}</span>
                      <span>
                        {h.reps} × {h.load_kg ?? "—"} kg
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}

import { Clock, Dumbbell, Flame, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompletionHero } from "@/components/student/completion-hero";
import { WorkoutRunner } from "@/components/student/workout-runner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/auth/dal";
import { getSession, getSessionSummary } from "@/lib/student/queries";

export const metadata: Metadata = { title: "Modo treino" };

const kg = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export default async function WorkoutPage({ params }: PageProps<"/aluno/treino/[id]">) {
  const viewer = await requireArea("aluno");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const session = await getSession(viewer.id, id);
  if (!session) notFound();

  if (session.status === "em_andamento") {
    return <WorkoutRunner session={session} />;
  }

  const summary = await getSessionSummary(viewer.id, id);
  const minutes = session.finished_at
    ? Math.max(1, Math.round((new Date(session.finished_at).getTime() - new Date(session.started_at).getTime()) / 60000))
    : null;
  const totalSets = summary.reduce((n, r) => n + r.sets, 0);
  const totalVolume = summary.reduce((n, r) => n + r.volume, 0);
  const records = summary.filter((r) => r.record);

  if (session.status === "abandonada") {
    return (
      <Alert title="Treino encerrado sem conclusão">
        <p>As séries registradas ({totalSets}) continuam no seu histórico.</p>
        <Link href="/aluno/dashboard" className="underline">
          Voltar ao início
        </Link>
      </Alert>
    );
  }

  const stats = [
    { icon: Clock, label: "Duração", value: minutes ? `${minutes} min` : "—" },
    { icon: Dumbbell, label: "Séries", value: String(totalSets) },
    { icon: Flame, label: "Volume", value: `${kg.format(totalVolume)} kg` },
    { icon: Trophy, label: "Recordes", value: String(records.length) },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <CompletionHero />
      <p className="text-center text-sm text-white/50">
        {session.plan_title} · Treino {session.day_label}
      </p>
      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <s.icon className="mx-auto size-5 text-white/60" aria-hidden />
            <dd className="mt-2 font-display text-3xl tabular-nums">{s.value}</dd>
            <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-white/45">{s.label}</dt>
          </div>
        ))}
      </dl>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-label="Resumo por exercício">
        <ul className="divide-y divide-white/[0.06]">
          {summary.map((r) => (
            <li key={r.exercise_id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-white/45">
                  {r.sets} {r.sets === 1 ? "série" : "séries"} · {r.reps} reps
                </p>
              </div>
              <p className="text-right tabular-nums">
                {r.best !== null ? `${kg.format(r.best)} kg` : "peso corporal"}
                {r.record && (
                  <span className="mt-0.5 flex items-center justify-end gap-1 text-xs text-white">
                    <Trophy className="size-3" /> novo recorde
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg">
          <Link href="/aluno/dashboard">Voltar ao início</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/aluno/evolucao">Ver minha evolução</Link>
        </Button>
      </div>
    </div>
  );
}

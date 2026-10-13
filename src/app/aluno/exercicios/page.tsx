import { Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ExerciseTile } from "@/components/student/exercise-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requireArea } from "@/lib/auth/dal";
import { exerciseFacets, listExercises } from "@/lib/student/queries";
import { LEVEL_LABELS, muscleLabel, type Level } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Exercícios" };

export default async function ExercisesPage({ searchParams }: PageProps<"/aluno/exercicios">) {
  const viewer = await requireArea("aluno");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const muscle = typeof sp.musculo === "string" ? sp.musculo : "";
  const equipment = typeof sp.equipamento === "string" ? sp.equipamento : "";

  const [exercises, facets] = await Promise.all([
    listExercises(viewer.id, { q, muscle, equipment }),
    exerciseFacets(viewer.id),
  ]);

  return (
    <div>
      <PageHeader eyebrow="Biblioteca" title="Exercícios">
        Instruções de execução, músculos trabalhados e o seu histórico de cargas.
      </PageHeader>

      <form role="search" className="mb-8 grid gap-3 sm:grid-cols-[1fr_200px_200px_auto]">
        <label className="relative">
          <span className="sr-only">Buscar exercício</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/55" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Buscar por nome ou músculo" className="pl-11" />
        </label>
        <label>
          <span className="sr-only">Grupo muscular</span>
          <Select name="musculo" defaultValue={muscle}>
            <option value="">Todos os músculos</option>
            {facets?.muscles.map((m) => (
              <option key={m} value={m}>
                {muscleLabel(m)}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span className="sr-only">Equipamento</span>
          <Select name="equipamento" defaultValue={equipment}>
            <option value="">Todos os equipamentos</option>
            {facets?.equipment.map((e) => (
              <option key={e} value={e}>
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" className="h-12">
          Filtrar
        </Button>
      </form>

      <p className="mb-4 text-sm text-white/50" aria-live="polite">
        {exercises.length} {exercises.length === 1 ? "exercício" : "exercícios"}
      </p>

      {exercises.length === 0 ? (
        <EmptyState icon={SearchX} title="Nada encontrado" action={<Button asChild variant="outline" size="sm"><Link href="/aluno/exercicios">Limpar filtros</Link></Button>}>
          Tente outro nome ou remova os filtros.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((e) => (
            <li key={e.id}>
              <Link
                href={`/aluno/exercicios/${e.slug}`}
                className="group flex gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/30 hover:bg-white/[0.05]"
              >
                <ExerciseTile muscles={e.primary_muscles} className="size-20 shrink-0" />
                <div className="min-w-0 py-1">
                  <p className="font-heading text-base uppercase leading-tight tracking-[0.04em]">{e.name}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {e.equipment} · {LEVEL_LABELS[e.level as Level] ?? e.level}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.primary_muscles.map((m) => (
                      <Badge key={m} className="px-2 py-0.5 text-[0.55rem]">
                        {muscleLabel(m)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { Dumbbell, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { listExercisesAdmin } from "@/lib/admin/queries";
import { requireArea } from "@/lib/auth/dal";
import { LEVEL_LABELS, muscleLabel, type Level } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Exercícios" };

export default async function AdminExercisesPage({ searchParams }: PageProps<"/admin/exercicios">) {
  const viewer = await requireArea("admin");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const status = sp.status === "ativos" || sp.status === "inativos" ? sp.status : "";
  const rows = await listExercisesAdmin(viewer.id, { search: q, status });

  return (
    <div>
      <PageHeader
        eyebrow="Administração"
        title="Exercícios"
        actions={
          <Button asChild>
            <Link href="/admin/exercicios/novo">
              <Plus /> Novo exercício
            </Link>
          </Button>
        }
      >
        A biblioteca usada por alunos, profissionais e pela IA. Exercícios em uso não são apagados — desative para retirá-los da biblioteca.
      </PageHeader>

      <form className="mb-6 flex flex-col gap-3 sm:flex-row" role="search">
        <label className="relative flex-1">
          <span className="sr-only">Buscar exercício</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/55" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Buscar exercício" className="pl-11" />
        </label>
        <label className="sm:w-48">
          <span className="sr-only">Situação</span>
          <Select name="status" defaultValue={status}>
            <option value="">Todos</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </Select>
        </label>
        <Button type="submit" variant="outline" className="h-12">
          Filtrar
        </Button>
      </form>

      <p className="mb-3 text-sm text-white/50">{rows.length} exercícios</p>
      {rows.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Nenhum exercício encontrado" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((e) => (
            <li key={e.id}>
              <Link
                href={`/admin/exercicios/${e.id}`}
                className="block h-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-heading uppercase leading-tight tracking-[0.04em]">{e.name}</p>
                  {!e.is_active && <Badge>Inativo</Badge>}
                </div>
                <p className="mt-1 text-xs text-white/50">
                  {e.primary_muscles.map(muscleLabel).join(", ")} · {e.equipment} · {LEVEL_LABELS[e.level as Level]}
                </p>
                <p className="mt-2 text-xs text-white/55">
                  {e.usage === 0 ? "Não usado em fichas" : `Em ${e.usage} ${e.usage === 1 ? "ficha" : "fichas"}`}
                  {e.video_url && " · com vídeo"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

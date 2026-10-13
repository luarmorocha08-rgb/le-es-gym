import { ChevronRight, Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requireArea } from "@/lib/auth/dal";
import { listStudents } from "@/lib/trainer/queries";
import { GOAL_LABELS, GOALS, type Goal } from "@/lib/workout/constants";
import { withinLastDays } from "@/lib/workout/progress";

export const metadata: Metadata = { title: "Meus alunos" };

const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export default async function StudentsPage({ searchParams }: PageProps<"/profissional/alunos">) {
  const viewer = await requireArea("profissional");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const goal = typeof sp.objetivo === "string" ? sp.objetivo : "";
  const situacao = typeof sp.situacao === "string" ? sp.situacao : "";

  const all = await listStudents(viewer.id);
  const recentIds = new Set(withinLastDays(all.filter((s) => s.last_session), (s) => s.last_session!, 7).map((s) => s.id));
  const students = all.filter(
    (s) =>
      (!q || normalize(s.full_name).includes(normalize(q))) &&
      (!goal || s.goal === goal) &&
      (!situacao || (situacao === "inativos" ? !recentIds.has(s.id) : situacao === "solicitacoes" ? s.open_requests > 0 : recentIds.has(s.id))),
  );

  return (
    <div>
      <PageHeader eyebrow="Profissional" title="Meus alunos">
        Alunos vinculados a você. O vínculo é criado ao aceitar uma solicitação ou pela administração.
      </PageHeader>

      <form role="search" className="mb-6 grid gap-3 sm:grid-cols-[1fr_200px_200px_auto]">
        <label className="relative">
          <span className="sr-only">Buscar aluno</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Buscar por nome" className="pl-11" />
        </label>
        <label>
          <span className="sr-only">Objetivo</span>
          <Select name="objetivo" defaultValue={goal}>
            <option value="">Todos os objetivos</option>
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {GOAL_LABELS[g]}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span className="sr-only">Situação</span>
          <Select name="situacao" defaultValue={situacao}>
            <option value="">Todas as situações</option>
            <option value="ativos">Treinou nos últimos 7 dias</option>
            <option value="inativos">Sem treinar há 7+ dias</option>
            <option value="solicitacoes">Com solicitação aberta</option>
          </Select>
        </label>
        <Button type="submit" className="h-12">
          Filtrar
        </Button>
      </form>

      {all.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum aluno vinculado" action={<Button asChild variant="outline"><Link href="/profissional/solicitacoes">Ver solicitações</Link></Button>}>
          Aceite uma solicitação de treino ou peça à administração para vincular alunos a você.
        </EmptyState>
      ) : students.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/50">Nenhum aluno encontrado com esses filtros.</p>
      ) : (
        <ul className="space-y-2">
          {students.map((s) => {
            const target = s.days_per_week ? s.days_per_week * 4 : null;
            return (
              <li key={s.id}>
                <Link href={`/profissional/alunos/${s.id}`} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/30">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white font-display text-xl text-black" aria-hidden>
                    {s.full_name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {s.full_name}
                      {s.open_requests > 0 && <Badge className="border-white/60 text-white">{s.open_requests} solicitação(ões)</Badge>}
                      {!recentIds.has(s.id) && <Badge>Sem treinar 7+ dias</Badge>}
                    </p>
                    <p className="mt-0.5 text-xs text-white/50">
                      {s.goal ? GOAL_LABELS[s.goal as Goal] : "Objetivo não informado"} · {s.current_plan_title ?? "sem ficha atual"}
                    </p>
                  </div>
                  <div className="hidden text-right text-xs tabular-nums text-white/60 sm:block">
                    <p>
                      {s.sessions_28d}
                      {target ? `/${target}` : ""} treinos em 4 sem.
                    </p>
                    <p className="text-white/40">{s.last_session ? `último ${dayFmt.format(new Date(s.last_session))}` : "sem treinos"}</p>
                  </div>
                  <ChevronRight className="size-4 text-white/30 group-hover:text-white" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

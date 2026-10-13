import { BookCopy, ChevronRight, ClipboardList, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireArea } from "@/lib/auth/dal";
import { listTrainerPlans, type TrainerPlanRow } from "@/lib/trainer/queries";
import { PLAN_STATUS_LABELS } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Fichas" };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

function Row({ p }: { p: TrainerPlanRow }) {
  return (
    <li>
      <Link href={`/profissional/fichas/${p.id}`} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/30">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{p.title}</p>
          <p className="text-xs text-white/50">
            {p.is_template ? "Modelo reutilizável" : p.student_name ?? "—"} · {p.day_count} {p.day_count === 1 ? "dia" : "dias"} · atualizado em {dateFmt.format(new Date(p.updated_at))}
            {p.current_version > 0 && ` · v${p.current_version}`}
          </p>
        </div>
        {!p.is_template && <Badge className={p.status === "rascunho" ? "border-white/60 text-white" : ""}>{PLAN_STATUS_LABELS[p.status]}</Badge>}
        <ChevronRight className="size-4 text-white/30 group-hover:text-white" />
      </Link>
    </li>
  );
}

export default async function TrainerPlansPage() {
  const viewer = await requireArea("profissional");
  const plans = await listTrainerPlans(viewer.id);
  const drafts = plans.filter((p) => !p.is_template && p.status === "rascunho");
  const published = plans.filter((p) => !p.is_template && p.status === "publicado");
  const archived = plans.filter((p) => !p.is_template && p.status === "arquivado");
  const templates = plans.filter((p) => p.is_template);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Profissional"
        title="Fichas"
        actions={
          <>
            <Button asChild>
              <Link href="/profissional/criar-treino">
                <Plus /> Nova ficha
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profissional/criar-treino?tipo=modelo">
                <BookCopy /> Novo modelo
              </Link>
            </Button>
          </>
        }
      >
        Rascunhos só aparecem para o aluno depois de publicados por você.
      </PageHeader>

      {plans.length === 0 && (
        <EmptyState icon={ClipboardList} title="Nenhuma ficha ainda" action={<Button asChild><Link href="/profissional/criar-treino">Montar a primeira ficha</Link></Button>}>
          Monte fichas para seus alunos vinculados ou crie modelos para reutilizar.
        </EmptyState>
      )}
      {[
        { title: "Rascunhos", list: drafts },
        { title: "Publicadas", list: published },
        { title: "Modelos", list: templates },
      ]
        .filter((g) => g.list.length > 0)
        .map((g) => (
          <section key={g.title} aria-label={g.title}>
            <h2 className="eyebrow mb-3">
              {g.title} ({g.list.length})
            </h2>
            <ul className="space-y-2">
              {g.list.map((p) => (
                <Row key={p.id} p={p} />
              ))}
            </ul>
          </section>
        ))}
      {archived.length > 0 && (
        <details>
          <summary className="cursor-pointer font-heading text-sm uppercase tracking-[0.16em] text-white/55 hover:text-white">Arquivadas ({archived.length})</summary>
          <ul className="mt-3 space-y-2 opacity-80">
            {archived.map((p) => (
              <Row key={p.id} p={p} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

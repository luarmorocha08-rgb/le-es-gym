import { BrainCircuit, ChevronRight, Dumbbell, Plus, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireArea } from "@/lib/auth/dal";
import { listPlans, type PlanSummary } from "@/lib/student/queries";
import { PLAN_SOURCE_LABELS, PLAN_STATUS_LABELS, SPLIT_LABELS, type SplitType } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Meus treinos" };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

function PlanCard({ plan }: { plan: PlanSummary }) {
  const Icon = plan.source === "profissional" ? UserCheck : plan.source === "ia" ? BrainCircuit : Dumbbell;
  return (
    <Link
      href={`/aluno/meus-treinos/${plan.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/30 hover:bg-white/[0.05]"
    >
      <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${plan.is_current ? "bg-white text-black" : "bg-white/[0.06]"}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-heading text-lg uppercase tracking-[0.04em]">{plan.title}</p>
          {plan.is_current && <Badge className="border-white/60 text-white">Atual</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-white/50">
          {PLAN_SOURCE_LABELS[plan.source]}
          {plan.source === "profissional" && plan.author_name ? ` · ${plan.author_name}` : ""} · {SPLIT_LABELS[plan.split_type as SplitType]} ·{" "}
          {plan.day_count} {plan.day_count === 1 ? "dia" : "dias"} · {plan.exercise_count} {plan.exercise_count === 1 ? "exercício" : "exercícios"}
        </p>
        <p className="mt-0.5 text-xs text-white/35">
          {PLAN_STATUS_LABELS[plan.status] ?? plan.status} · atualizado em {dateFmt.format(new Date(plan.updated_at))}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white" />
    </Link>
  );
}

export default async function MyPlansPage() {
  const viewer = await requireArea("aluno");
  const plans = await listPlans(viewer.id);
  const active = plans.filter((p) => p.status !== "arquivado");
  const archived = plans.filter((p) => p.status === "arquivado");

  return (
    <div>
      <PageHeader
        eyebrow="Meu treino"
        title="Meus treinos"
        actions={
          <>
            <Button asChild>
              <Link href="/aluno/criar-treino">
                <Plus /> Montar treino
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/aluno/solicitar-profissional">
                <UserCheck /> Pedir ao treinador
              </Link>
            </Button>
          </>
        }
      >
        Suas fichas, as prescrições dos profissionais e as sugestões salvas.
      </PageHeader>

      {active.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhum treino ainda"
          action={
            <Button asChild>
              <Link href="/aluno/criar-treino">
                <Plus /> Montar meu primeiro treino
              </Link>
            </Button>
          }
        >
          Monte sua ficha com a biblioteca de exercícios ou peça um treino personalizado a um profissional da academia.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {active.map((p) => (
            <li key={p.id}>
              <PlanCard plan={p} />
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer font-heading text-sm uppercase tracking-[0.16em] text-white/55 hover:text-white">
            Arquivados ({archived.length})
          </summary>
          <ul className="mt-4 space-y-3 opacity-80">
            {archived.map((p) => (
              <li key={p.id}>
                <PlanCard plan={p} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

import { ChevronRight, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireArea } from "@/lib/auth/dal";
import { listTrainerRequests, type TrainerRequestRow } from "@/lib/trainer/queries";
import { cn } from "@/lib/utils";
import { GOAL_LABELS, REQUEST_STATUS_LABELS, type Goal } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Solicitações" };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
const TABS = [
  { id: "novas", label: "Novas", statuses: ["aguardando_profissional"] },
  { id: "ajustes", label: "Ajustes", statuses: ["ajuste_solicitado"] },
  { id: "andamento", label: "Em andamento", statuses: ["em_analise", "em_elaboracao"] },
  { id: "entregues", label: "Entregues", statuses: ["entregue"] },
  { id: "encerradas", label: "Encerradas", statuses: ["concluido", "cancelado"] },
] as const;

function Row({ r }: { r: TrainerRequestRow }) {
  return (
    <li>
      <Link href={`/profissional/solicitacoes/${r.id}`} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/30">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{r.student_name}</p>
          <p className="text-xs text-white/50">
            {GOAL_LABELS[r.goal as Goal]} · {r.days_per_week} dias · {r.session_minutes} min · recebida em {dateFmt.format(new Date(r.created_at))}
            {r.messages > 0 && ` · ${r.messages} mensagem(ns)`}
          </p>
        </div>
        <Badge>{REQUEST_STATUS_LABELS[r.status]}</Badge>
        <ChevronRight className="size-4 text-white/55 group-hover:text-white" />
      </Link>
    </li>
  );
}

export default async function TrainerRequestsPage({ searchParams }: PageProps<"/profissional/solicitacoes">) {
  const viewer = await requireArea("profissional");
  const sp = await searchParams;
  const requests = await listTrainerRequests(viewer.id);
  const counts = Object.fromEntries(TABS.map((t) => [t.id, requests.filter((r) => (t.statuses as readonly string[]).includes(r.status)).length]));
  const firstWithItems = TABS.find((t) => counts[t.id] > 0)?.id ?? "novas";
  const tab = TABS.find((t) => t.id === sp.aba) ?? TABS.find((t) => t.id === firstWithItems)!;
  const list = requests.filter((r) => (tab.statuses as readonly string[]).includes(r.status));

  return (
    <div>
      <PageHeader eyebrow="Profissional" title="Solicitações">
        Pedidos de treino dos alunos. Aceitar cria o vínculo; publicar a ficha entrega a solicitação.
      </PageHeader>
      <nav aria-label="Filtrar solicitações" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/profissional/solicitacoes?aba=${t.id}`}
            aria-current={t.id === tab.id ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 font-heading text-xs uppercase tracking-[0.14em]",
              t.id === tab.id ? "border-white bg-white text-black" : "border-white/15 text-white/65 hover:border-white/40",
            )}
          >
            {t.label} <span className="opacity-60">{counts[t.id]}</span>
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <EmptyState icon={Inbox} title="Nada por aqui">
          Nenhuma solicitação nesta categoria.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

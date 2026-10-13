import { ArrowLeft, ClipboardList, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrainerMessageForm, TransitionButton } from "@/components/trainer/request-controls";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/auth/dal";
import { getTrainerRequest } from "@/lib/trainer/queries";
import { cn } from "@/lib/utils";
import { GOAL_LABELS, LEVEL_LABELS, PLAN_STATUS_LABELS, REQUEST_STATUS_LABELS, type Goal, type Level } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Solicitação" };

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function TrainerRequestPage({ params }: PageProps<"/profissional/solicitacoes/[id]">) {
  const viewer = await requireArea("profissional");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getTrainerRequest(viewer.id, id);
  if (!data) notFound();
  const { request: r, events, messages } = data;
  const closed = r.status === "concluido" || r.status === "cancelado";
  const canBuild = ["aguardando_profissional", "em_analise", "em_elaboracao", "ajuste_solicitado"].includes(r.status);
  const lastAdjust = [...events].reverse().find((e) => e.to_status === "ajuste_solicitado");

  return (
    <div className="space-y-6">
      <Link href="/profissional/solicitacoes" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> Solicitações
      </Link>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className={r.status === "aguardando_profissional" || r.status === "ajuste_solicitado" ? "border-white text-white" : ""}>
            {REQUEST_STATUS_LABELS[r.status]}
          </Badge>
          <h1 className="mt-3 font-display text-5xl uppercase leading-[0.95]">{r.student_name}</h1>
          <p className="mt-2 text-white/60">
            {GOAL_LABELS[r.goal as Goal]} · {r.days_per_week} dias/semana · {r.session_minutes} min
            {r.experience_level && ` · ${LEVEL_LABELS[r.experience_level as Level]}`}
          </p>
          {r.details && <p className="mt-3 max-w-2xl whitespace-pre-line text-sm text-white/75">“{r.details}”</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {r.status === "aguardando_profissional" && <TransitionButton requestId={r.id} to="em_analise" label="Aceitar solicitação" />}
          {canBuild && (
            <Button asChild variant={r.status === "aguardando_profissional" ? "outline" : "primary"}>
              <Link href={`/profissional/criar-treino?solicitacao=${r.id}`}>
                <Plus /> Montar ficha
              </Link>
            </Button>
          )}
          {r.status === "entregue" && <TransitionButton requestId={r.id} to="concluido" label="Marcar como concluída" variant="outline" />}
          {r.linked && (
            <Button asChild variant="ghost">
              <Link href={`/profissional/alunos/${r.student_id}`}>Ver perfil do aluno</Link>
            </Button>
          )}
        </div>
      </div>

      {r.status === "aguardando_profissional" && (
        <Alert>Ao aceitar, o aluno passa a ser vinculado a você: você verá treinos, cargas e informações de saúde que ele declarou.</Alert>
      )}
      {r.status === "ajuste_solicitado" && lastAdjust?.note && (
        <Alert title="Ajuste solicitado pelo aluno">“{lastAdjust.note}” — crie uma nova versão da ficha entregue ou monte outra.</Alert>
      )}

      {(r.drafts.length > 0 || r.plan_id) && (
        <section aria-labelledby="fichas" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 id="fichas" className="eyebrow mb-3 flex items-center gap-2">
            <ClipboardList className="size-3.5" aria-hidden /> Fichas desta solicitação
          </h2>
          <ul className="divide-y divide-white/[0.06]">
            {r.drafts.map((d) => (
              <li key={d.id}>
                <Link href={`/profissional/fichas/${d.id}`} className="flex justify-between py-2.5 text-sm hover:opacity-80">
                  {d.title}
                  <Badge>{PLAN_STATUS_LABELS[d.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section aria-labelledby="mensagens" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 id="mensagens" className="eyebrow mb-4">
            Mensagens
          </h2>
          {messages.length === 0 ? (
            <p className="mb-4 text-sm text-white/50">Nenhuma mensagem ainda.</p>
          ) : (
            <ul className="mb-4 space-y-3">
              {messages.map((m) => (
                <li key={m.id} className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", m.mine ? "ml-auto rounded-br-md bg-white text-black" : "rounded-bl-md border border-white/10 bg-white/[0.04]")}>
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className={cn("mt-1 text-[0.6rem]", m.mine ? "text-black/45" : "text-white/40")}>{fmt.format(new Date(m.created_at))}</p>
                </li>
              ))}
            </ul>
          )}
          {closed ? <p className="text-xs text-white/40">Solicitação encerrada.</p> : <TrainerMessageForm requestId={r.id} />}
        </section>
        <section aria-labelledby="historico" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 id="historico" className="eyebrow mb-4">
            Histórico
          </h2>
          <ol className="space-y-3 text-sm">
            {events.map((e) => (
              <li key={e.id}>
                <p>{REQUEST_STATUS_LABELS[e.to_status]}</p>
                {e.note && <p className="text-xs text-white/55">“{e.note}”</p>}
                <p className="text-[0.65rem] text-white/35">
                  {fmt.format(new Date(e.created_at))} · {e.mine ? "você" : "aluno"}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

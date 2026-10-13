import { ArrowLeft, Check, Dumbbell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageForm, RequestActions } from "@/components/student/request-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/auth/dal";
import { getRequest } from "@/lib/student/queries";
import { cn } from "@/lib/utils";
import { GOAL_LABELS, REQUEST_STATUS_LABELS, type Goal } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Solicitação" };

const FLOW = ["aguardando_profissional", "em_analise", "em_elaboracao", "entregue", "concluido"];
const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function RequestPage({ params }: PageProps<"/aluno/solicitar-profissional/[id]">) {
  const viewer = await requireArea("aluno");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getRequest(viewer.id, id);
  if (!data) notFound();
  const { request, events, messages } = data;
  const reached = new Set(events.map((e) => e.to_status));
  const closed = request.status === "cancelado" || request.status === "concluido";

  return (
    <div className="space-y-8">
      <Link href="/aluno/solicitar-profissional" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> Meu Treinador
      </Link>
      <div>
        <Badge className={request.status === "entregue" ? "border-white bg-white text-black" : ""}>{REQUEST_STATUS_LABELS[request.status]}</Badge>
        <h1 className="mt-3 font-display text-5xl uppercase leading-[0.95]">{request.trainer_name ?? "Profissional"}</h1>
        <p className="mt-2 text-white/60">
          {GOAL_LABELS[request.goal as Goal]} · {request.days_per_week} dias/semana · {request.session_minutes} min por treino
        </p>
        {request.details && <p className="mt-3 max-w-2xl whitespace-pre-line text-sm text-white/70">“{request.details}”</p>}
      </div>

      {request.status !== "cancelado" && (
        <ol className="grid grid-cols-5 gap-1" aria-label="Etapas da solicitação">
          {FLOW.map((s) => {
            const done = reached.has(s as never) || FLOW.indexOf(request.status) >= FLOW.indexOf(s);
            const current = request.status === s || (request.status === "ajuste_solicitado" && s === "em_elaboracao");
            return (
              <li key={s} className="flex flex-col gap-2" aria-current={current ? "step" : undefined}>
                <span className={cn("h-1.5 rounded-full", done ? "bg-white" : "bg-white/10")} />
                <span className={cn("text-[0.6rem] uppercase leading-tight tracking-[0.08em] sm:text-[0.65rem]", current ? "text-white" : "text-white/40")}>
                  {REQUEST_STATUS_LABELS[s]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {request.plan_id && (
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 text-black sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Dumbbell className="size-6" />
            <div>
              <p className="font-heading text-xs uppercase tracking-[0.18em] text-black/55">Treino entregue</p>
              <p className="font-display text-2xl uppercase">{request.plan_title}</p>
            </div>
          </div>
          <Button asChild className="bg-black text-white hover:bg-black/85">
            <Link href={`/aluno/meus-treinos/${request.plan_id}`}>Ver treino</Link>
          </Button>
        </div>
      )}

      <RequestActions requestId={request.id} status={request.status} />

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
          {closed ? <p className="text-xs text-white/40">Solicitação encerrada.</p> : <MessageForm requestId={request.id} />}
        </section>
        <section aria-labelledby="historico" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 id="historico" className="eyebrow mb-4">
            Histórico
          </h2>
          <ol className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-white/50" />
                <div>
                  <p>{REQUEST_STATUS_LABELS[e.to_status]}</p>
                  {e.note && <p className="text-xs text-white/55">“{e.note}”</p>}
                  <p className="text-[0.65rem] text-white/35">
                    {fmt.format(new Date(e.created_at))} · {e.mine ? "você" : "profissional"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

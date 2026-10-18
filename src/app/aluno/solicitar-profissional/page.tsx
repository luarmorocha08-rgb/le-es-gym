import { ChevronRight, UserCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewRequestForm } from "@/components/student/request-forms";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireArea } from "@/lib/auth/dal";
import { getProfile, listRequests, listTrainers } from "@/lib/student/queries";
import { GOAL_LABELS, REQUEST_STATUS_LABELS, type Goal } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Meu Treinador" };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

export default async function MyTrainerPage() {
  const viewer = await requireArea("aluno");
  const [trainers, requests, profile] = await Promise.all([listTrainers(viewer.id), listRequests(viewer.id), getProfile(viewer.id)]);
  const open = requests.filter((r) => !["concluido", "cancelado"].includes(r.status));
  const closed = requests.filter((r) => ["concluido", "cancelado"].includes(r.status));

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Acompanhamento" title="Meu Treinador">
        Peça um treino personalizado a um profissional da academia e acompanhe cada etapa.
      </PageHeader>

      {requests.length > 0 && (
        <section aria-labelledby="minhas-solicitacoes">
          <h2 id="minhas-solicitacoes" className="eyebrow mb-3">
            Minhas solicitações
          </h2>
          <ul className="space-y-2">
            {[...open, ...closed].map((r) => (
              <li key={r.id}>
                <Link
                  href={`/aluno/solicitar-profissional/${r.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/30"
                >
                  <UserCheck className="size-5 shrink-0 text-white/50" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.trainer_name ?? "Profissional"}</p>
                    <p className="text-xs text-white/55">
                      {GOAL_LABELS[r.goal as Goal]} · enviada em {dateFmt.format(new Date(r.created_at))}
                      {r.trainer_messages > 0 && ` · ${r.trainer_messages} mensagem(ns) do profissional`}
                    </p>
                  </div>
                  <Badge className={r.status === "entregue" ? "border-accent bg-accent text-black" : ""}>{REQUEST_STATUS_LABELS[r.status]}</Badge>
                  <ChevronRight className="size-4 text-white/55" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="nova-solicitacao" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <h2 id="nova-solicitacao" className="mb-5 font-heading text-xl uppercase tracking-[0.06em]">
          Nova solicitação
        </h2>
        {trainers.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum profissional disponível">
            Os profissionais aparecem aqui assim que a academia aprova e publica seus perfis.
          </EmptyState>
        ) : (
          <NewRequestForm
            trainers={trainers}
            defaults={{ goal: profile?.goal ?? null, daysPerWeek: profile?.days_per_week ?? null, sessionMinutes: profile?.session_minutes ?? null }}
          />
        )}
      </section>
    </div>
  );
}

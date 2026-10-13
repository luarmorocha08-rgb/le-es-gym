import { Activity } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireArea } from "@/lib/auth/dal";
import { getMonitoring } from "@/lib/trainer/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Acompanhamento" };

const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
const kg = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** Aderência = treinos concluídos em 4 semanas ÷ (dias/semana declarados × 4). */
function adherence(sessions: number, daysPerWeek: number | null) {
  if (!daysPerWeek) return null;
  return Math.min(100, Math.round((sessions / (daysPerWeek * 4)) * 100));
}

export default async function MonitoringPage() {
  const viewer = await requireArea("profissional");
  const rows = await getMonitoring(viewer.id);

  return (
    <div>
      <PageHeader eyebrow="Profissional" title="Acompanhamento">
        Frequência, aderência ao planejamento e feedback dos alunos nas últimas 4 semanas. Ordenado por quem está há mais tempo sem treinar.
      </PageHeader>
      {rows.length === 0 ? (
        <EmptyState icon={Activity} title="Nenhum aluno vinculado">
          Os alunos aparecem aqui após o vínculo.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10" data-lenis-prevent>
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Acompanhamento dos alunos vinculados</caption>
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.12em] text-white/55">
              <tr>
                <th className="px-4 py-3 font-normal">Aluno</th>
                <th className="px-4 py-3 font-normal">Treinos (4 sem.)</th>
                <th className="px-4 py-3 font-normal">Aderência</th>
                <th className="px-4 py-3 font-normal">Última atividade</th>
                <th className="px-4 py-3 font-normal">Esforço médio</th>
                <th className="px-4 py-3 font-normal">Volume (4 sem.)</th>
                <th className="px-4 py-3 font-normal">Último feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {rows.map((r) => {
                const adh = adherence(r.sessions_28d, r.days_per_week);
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3">
                      <Link href={`/profissional/alunos/${r.id}`} className="font-medium hover:underline">
                        {r.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {r.sessions_28d}
                      {r.days_per_week ? <span className="text-white/55"> / {r.days_per_week * 4}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      {adh === null ? (
                        <span className="text-xs text-white/55">meta não informada</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuenow={adh} aria-valuemin={0} aria-valuemax={100} aria-label={`Aderência ${adh}%`}>
                            <div className={cn("h-full rounded-full bg-white", adh < 50 && "bg-white/50")} style={{ width: `${adh}%` }} />
                          </div>
                          <span className="tabular-nums">{adh}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/70">{r.last_session ? dayFmt.format(new Date(r.last_session)) : "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{r.avg_effort ? `${r.avg_effort}/10` : "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{kg.format(Number(r.volume_28d))} kg</td>
                    <td className="max-w-64 px-4 py-3 text-xs text-white/65">
                      {r.last_feedback ? (
                        <>
                          “{r.last_feedback}”
                          {r.last_feedback_at && <span className="block text-white/55">{dayFmt.format(new Date(r.last_feedback_at))}</span>}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

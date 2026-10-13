import { Link2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CreateLinkForm, EndLinkButton } from "@/components/admin/controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { listLinks } from "@/lib/admin/queries";
import { requireArea } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Vínculos" };

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function AdminLinksPage({ searchParams }: PageProps<"/admin/vinculos">) {
  const viewer = await requireArea("admin");
  const sp = await searchParams;
  const trainerId = typeof sp.profissional === "string" && /^[0-9a-f-]{36}$/i.test(sp.profissional) ? sp.profissional : null;
  const { links, trainers, students } = await listLinks(viewer.id, trainerId);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Administração" title="Vínculos">
        Um vínculo ativo permite ao profissional ver treinos, cargas e as informações de saúde que o aluno autorizou. Vínculos também
        surgem quando o profissional aceita uma solicitação do aluno.
      </PageHeader>

      <section aria-labelledby="novo" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 id="novo" className="eyebrow mb-4">
          Novo vínculo
        </h2>
        {trainers.length === 0 ? (
          <p className="text-sm text-white/55">Nenhum profissional aprovado ainda.</p>
        ) : (
          <CreateLinkForm trainers={trainers} students={students} defaultTrainer={trainerId} />
        )}
      </section>

      <section aria-labelledby="ativos">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="ativos" className="eyebrow">
            Vínculos ativos ({links.length})
          </h2>
          <form className="flex gap-2">
            <label>
              <span className="sr-only">Filtrar por profissional</span>
              <Select name="profissional" defaultValue={trainerId ?? ""} className="h-10 sm:w-64">
                <option value="">Todos os profissionais</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" variant="outline" size="sm" className="h-10">
              Filtrar
            </Button>
          </form>
        </div>
        {links.length === 0 ? (
          <EmptyState icon={Link2} title="Nenhum vínculo ativo" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.12em] text-white/55">
                <tr>
                  <th className="px-4 py-3 font-normal">Profissional</th>
                  <th className="px-4 py-3 font-normal">Aluno</th>
                  <th className="px-4 py-3 font-normal">Origem</th>
                  <th className="px-4 py-3 font-normal">Desde</th>
                  <th className="px-4 py-3 font-normal">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id} className="border-t border-white/[0.06]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/usuarios/${l.trainer_id}`} className="hover:underline">
                        {l.trainer_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/usuarios/${l.student_id}`} className="hover:underline">
                        {l.student_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{l.origin}</Badge>
                    </td>
                    <td className="px-4 py-3 text-white/55">{fmt.format(new Date(l.created_at))}</td>
                    <td className="px-4 py-3 text-right">
                      <EndLinkButton trainerId={l.trainer_id} studentId={l.student_id} trainerName={l.trainer_name} studentName={l.student_name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

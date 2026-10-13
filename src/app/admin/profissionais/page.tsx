import { BadgeCheck, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ReviewProfessionalForm } from "@/components/admin/controls";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listProfessionals } from "@/lib/admin/queries";
import { requireArea } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Profissionais" };

const TABS = [
  { status: "pendente", label: "Aguardando" },
  { status: "aprovado", label: "Aprovados" },
  { status: "suspenso", label: "Suspensos" },
  { status: "rejeitado", label: "Rejeitados" },
] as const;

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function AdminProfessionalsPage({ searchParams }: PageProps<"/admin/profissionais">) {
  const viewer = await requireArea("admin");
  const sp = await searchParams;
  const status = TABS.some((t) => t.status === sp.status) ? (sp.status as string) : "pendente";
  const { rows, counts } = await listProfessionals(viewer.id, status);
  const reviewed = rows.find((r) => r.user_id === sp.revisado);
  const RESULT: Record<string, string> = { aprovado: "aprovado", rejeitado: "rejeitado", suspenso: "suspenso", pendente: "reaberto para análise" };

  return (
    <div>
      <PageHeader eyebrow="Administração" title="Profissionais">
        Confira o registro no CREF antes de aprovar. Só profissionais aprovados acessam o portal, aparecem na equipe e recebem alunos.
      </PageHeader>

      <nav aria-label="Status do cadastro" className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/admin/profissionais?status=${t.status}`}
            aria-current={t.status === status ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm transition",
              t.status === status ? "border-white bg-white text-black" : "border-white/15 text-white/70 hover:border-white/40",
            )}
          >
            {t.label} ({counts[t.status] ?? 0})
          </Link>
        ))}
      </nav>

      {reviewed && (
        <Alert tone="success" className="mb-6">
          Cadastro de {reviewed.full_name} {RESULT[reviewed.status]}. O profissional foi notificado.
        </Alert>
      )}
      {rows.length === 0 ? (
        <EmptyState icon={BadgeCheck} title={status === "pendente" ? "Nenhum cadastro aguardando" : "Nada por aqui"}>
          {status === "pendente" ? "Novos pedidos de cadastro profissional aparecem aqui." : "Nenhum profissional com este status."}
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {rows.map((p) => (
            <li key={p.user_id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/usuarios/${p.user_id}`} className="font-heading text-xl uppercase tracking-[0.04em] hover:underline">
                      {p.full_name}
                    </Link>
                    {p.is_public && p.status === "aprovado" && <Badge>Perfil público</Badge>}
                    {p.status === "aprovado" && <Badge>{p.students} {p.students === 1 ? "aluno" : "alunos"}</Badge>}
                  </div>
                  <p className="text-sm text-white/60">{p.email}</p>
                  <p className="text-sm">
                    CREF: <strong className="font-medium">{p.cref ?? "não informado"}</strong>
                    {p.cref && (
                      <a
                        href="https://www.confef.org.br/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 inline-flex items-center gap-1 text-xs text-white/55 hover:text-white"
                      >
                        Consultar no CONFEF <ExternalLink className="size-3" />
                      </a>
                    )}
                  </p>
                  {p.specialties.length > 0 && <p className="text-sm text-white/60">Especialidades: {p.specialties.join(", ")}</p>}
                  {p.bio && <p className="max-w-2xl whitespace-pre-line text-sm text-white/70">{p.bio}</p>}
                  <p className="text-xs text-white/55">
                    Pedido em {fmt.format(new Date(p.created_at))}
                    {p.reviewed_at && ` · revisado em ${fmt.format(new Date(p.reviewed_at))}${p.reviewer_name ? ` por ${p.reviewer_name}` : ""}`}
                  </p>
                  {p.review_note && <p className="text-xs italic text-white/55">“{p.review_note}”</p>}
                  {p.status === "suspenso" && p.students > 0 && (
                    <p className="text-xs text-white/55">Os vínculos continuam registrados, mas o profissional não acessa dados dos alunos enquanto suspenso.</p>
                  )}
                </div>
                <div className="lg:w-80 lg:shrink-0">
                  {p.user_id === viewer.id ? (
                    <p className="text-xs text-white/55">Seu próprio cadastro é revisado por outro administrador.</p>
                  ) : (
                    <ReviewProfessionalForm userId={p.user_id} status={p.status} name={p.full_name} />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

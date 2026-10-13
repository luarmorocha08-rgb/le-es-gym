import { ArrowLeft, Link2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditList } from "@/components/admin/audit-list";
import { AdminRoleButton, EndLinkButton } from "@/components/admin/controls";
import { StatCard } from "@/components/layout/portal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUserForAdmin } from "@/lib/admin/queries";
import { requireArea } from "@/lib/auth/dal";
import { GOAL_LABELS, LEVEL_LABELS, type Goal, type Level } from "@/lib/workout/constants";

export const metadata: Metadata = { title: "Usuário" };

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
const ROLE_LABELS: Record<string, string> = { aluno: "Aluno", profissional: "Profissional", admin: "Administrador" };

function Consent({ label, at }: { label: string; at: string | null }) {
  return (
    <div className="flex justify-between gap-3 py-2">
      <dt className="text-white/60">{label}</dt>
      <dd>{at ? `Sim, desde ${fmt.format(new Date(at))}` : "Não"}</dd>
    </div>
  );
}

export default async function AdminUserPage({ params }: PageProps<"/admin/usuarios/[id]">) {
  const viewer = await requireArea("admin");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getUserForAdmin(viewer.id, id);
  if (!data) notFound();
  const { user: u, profile: p, links, stats, audit } = data;
  const isAdmin = u.roles.includes("admin");

  return (
    <div className="space-y-8">
      <Link href="/admin/usuarios" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> Usuários
      </Link>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            {u.roles.map((r) => (
              <Badge key={r} className={r === "admin" ? "border-white text-white" : ""}>
                {ROLE_LABELS[r] ?? r}
              </Badge>
            ))}
            {u.professional_status && u.professional_status !== "aprovado" && <Badge>Profissional {u.professional_status}</Badge>}
          </div>
          <h1 className="mt-3 font-display text-5xl uppercase leading-[0.95]">{u.full_name}</h1>
          <p className="mt-2 text-white/60">
            {u.email} {u.email_verified ? "· e-mail confirmado" : "· e-mail não confirmado"}
          </p>
          <p className="text-sm text-white/55">Cadastro em {fmt.format(new Date(u.created_at))}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {u.professional_status && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/profissionais?status=${u.professional_status}`}>Cadastro profissional</Link>
            </Button>
          )}
          <AdminRoleButton userId={u.id} name={u.full_name} isAdmin={isAdmin} isSelf={u.id === viewer.id} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Treinos concluídos" value={stats.sessions} hint={`${u.sessions_30d} nos últimos 30 dias`} />
        <StatCard label="Fichas" value={stats.plans} />
        <StatCard label="Solicitações" value={stats.requests} />
        <StatCard label="Usos da IA" value={stats.ai_uses} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="dados" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 id="dados" className="eyebrow mb-3">
            Dados e consentimentos
          </h2>
          <dl className="divide-y divide-white/[0.06] text-sm">
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-white/60">Telefone</dt>
              <dd>{p?.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-white/60">Objetivo · nível</dt>
              <dd>
                {p?.goal ? GOAL_LABELS[p.goal as Goal] : "—"} · {p?.experience_level ? LEVEL_LABELS[p.experience_level as Level] : "—"}
              </dd>
            </div>
            <Consent label="Termos e privacidade" at={p?.terms_accepted_at ?? null} />
            <Consent label="Dados de saúde (LGPD art. 11)" at={p?.health_data_consent_at ?? null} />
            <Consent label="Uso de IA" at={p?.ai_consent_at ?? null} />
          </dl>
          <p className="mt-3 text-xs text-white/55">Informações de saúde são visíveis apenas ao aluno e aos profissionais vinculados.</p>
        </section>

        <section aria-labelledby="vinculos" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="vinculos" className="eyebrow flex items-center gap-2">
              <Link2 className="size-3.5" aria-hidden /> Vínculos ativos
            </h2>
            <Link href="/admin/vinculos" className="text-sm text-white/60 hover:text-white">
              Gerenciar
            </Link>
          </div>
          {links.length === 0 ? (
            <p className="text-sm text-white/50">Nenhum vínculo ativo.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06] text-sm">
              {links.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    {l.trainer_id === u.id ? `Aluno: ${l.student_name}` : `Profissional: ${l.trainer_name}`}
                    <span className="block text-xs text-white/55">desde {fmt.format(new Date(l.created_at))}</span>
                  </span>
                  <EndLinkButton trainerId={l.trainer_id} studentId={l.student_id} trainerName={l.trainer_name} studentName={l.student_name} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="historico" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 id="historico" className="eyebrow mb-3">
          Registros de auditoria
        </h2>
        <AuditList rows={audit} empty="Nenhum registro para este usuário." />
      </section>
    </div>
  );
}

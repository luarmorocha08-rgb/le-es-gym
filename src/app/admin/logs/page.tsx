import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ACTION_LABELS, AuditList, ENTITY_LABELS } from "@/components/admin/audit-list";
import { BarChart } from "@/components/charts/charts";
import { StatCard } from "@/components/layout/portal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { AUDIT_PAGE_SIZE, getAiUsage, listAudit } from "@/lib/admin/queries";
import { requireArea } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";
import { weeklyFrequency } from "@/lib/workout/progress";

export const metadata: Metadata = { title: "Logs" };

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const nf = new Intl.NumberFormat("pt-BR");

const KIND_LABELS: Record<string, string> = {
  gerar_treino: "Gerar treino",
  ajustar_treino: "Ajustar treino",
  substituir_exercicio: "Substituir exercício",
  explicar_exercicio: "Dúvida de exercício",
};
const STATUS_LABELS: Record<string, string> = { sucesso: "Sucesso", erro: "Erro", invalido: "Inválida", bloqueado: "Recusada" };

export default async function AdminLogsPage({ searchParams }: PageProps<"/admin/logs">) {
  const viewer = await requireArea("admin");
  const sp = await searchParams;
  const tab = sp.aba === "ia" ? "ia" : "auditoria";
  const tabs = (
    <nav aria-label="Tipo de registro" className="mb-6 flex gap-2">
      {[
        { key: "auditoria", label: "Auditoria" },
        { key: "ia", label: "Uso da IA" },
      ].map((t) => (
        <Link
          key={t.key}
          href={`/admin/logs?aba=${t.key}`}
          aria-current={t.key === tab ? "page" : undefined}
          className={cn("rounded-full border px-4 py-2 text-sm", t.key === tab ? "border-white bg-white text-black" : "border-white/15 text-white/70 hover:border-white/40")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );

  if (tab === "ia") {
    const ai = await getAiUsage(viewer.id);
    const total = ai.byStatus.reduce((s, r) => s + r.n, 0);
    const ok = ai.byStatus.find((r) => r.status === "sucesso")?.n ?? 0;
    const tokensIn = ai.byStatus.reduce((s, r) => s + r.input_tokens, 0);
    const tokensOut = ai.byStatus.reduce((s, r) => s + r.output_tokens, 0);
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Administração" title="Logs">
          Uso da IA nos últimos 30 dias. O conteúdo enviado fica registrado de forma minimizada (sem nome, e-mail ou telefone).
        </PageHeader>
        {tabs}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Usos (30 dias)" value={total} />
          <StatCard label="Com sucesso" value={total ? `${Math.round((ok / total) * 100)}%` : "—"} hint={`${total - ok} sem sucesso`} />
          <StatCard label="Tokens de entrada" value={nf.format(tokensIn)} />
          <StatCard label="Tokens de saída" value={nf.format(tokensOut)} hint="Base para estimar o custo no console do provedor" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="eyebrow mb-3">Usos da IA por semana · 12 semanas</h2>
            <BarChart
              title="Usos da IA por semana"
              unit="usos"
              unitOne="uso"
              integer
              points={weeklyFrequency(ai.dates, 12).map((b) => {
                const d = shortDate.format(new Date(`${b.week}T00:00:00Z`));
                return { label: d, detail: `Semana de ${d}`, value: b.count };
              })}
            />
          </section>
          <section aria-labelledby="por-tipo" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 id="por-tipo" className="eyebrow mb-3">
              Por funcionalidade
            </h2>
            {ai.byKind.length === 0 ? (
              <p className="text-sm text-white/50">Nenhum uso no período.</p>
            ) : (
              <ul className="divide-y divide-white/[0.06] text-sm">
                {ai.byKind.map((k) => (
                  <li key={k.kind} className="flex justify-between py-2 tabular-nums">
                    <span>{KIND_LABELS[k.kind] ?? k.kind}</span>
                    <span className="text-white/60">
                      {k.n} · {k.avg_latency ? `${(k.avg_latency / 1000).toFixed(1)} s em média` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <section aria-labelledby="recentes" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 id="recentes" className="eyebrow mb-3 flex items-center gap-2">
            <Sparkles className="size-3.5" aria-hidden /> Chamadas recentes
          </h2>
          {ai.recent.length === 0 ? (
            <p className="text-sm text-white/50">Nenhuma chamada registrada.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06] text-sm">
              {ai.recent.map((r) => (
                <li key={r.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge className={r.status === "sucesso" ? "" : "border-white text-white"}>{STATUS_LABELS[r.status] ?? r.status}</Badge>
                    {KIND_LABELS[r.kind] ?? r.kind}
                    {r.error_message && r.status !== "sucesso" && <span className="text-xs text-white/50">({r.error_message})</span>}
                  </span>
                  <span className="text-xs text-white/45">
                    {r.user_name ?? "usuário removido"} · {r.latency_ms ? `${(r.latency_ms / 1000).toFixed(1)} s` : "—"} · {fmt.format(new Date(r.created_at))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  const action = typeof sp.acao === "string" ? sp.acao.slice(0, 60) : "";
  const page = Math.max(1, Number(sp.pagina) || 1);
  const { rows, total, actions } = await listAudit(viewer.id, { action, page });
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const href = (p: number) => `/admin/logs?${new URLSearchParams({ ...(action && { acao: action }), pagina: String(p) })}`;

  return (
    <div>
      <PageHeader eyebrow="Administração" title="Logs">
        Registro imutável das ações sensíveis: aprovações, papéis, vínculos, publicações de fichas e alterações na biblioteca, horários e conteúdo.
      </PageHeader>
      {tabs}
      <form className="mb-4 flex gap-2">
        <label>
          <span className="sr-only">Filtrar por ação</span>
          <Select name="acao" defaultValue={action} className="h-10 sm:w-72">
            <option value="">Todas as ações</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] ?? a}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="outline" size="sm" className="h-10">
          Filtrar
        </Button>
      </form>
      <p className="mb-3 text-sm text-white/50">
        {total} {total === 1 ? "registro" : "registros"}
      </p>
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-2">
        <AuditList rows={rows} empty="Nenhum registro encontrado." />
      </section>
      {pages > 1 && (
        <nav aria-label="Paginação" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href(page - 1)} className="hover:underline">← Anterior</Link> : <span />}
          <span className="text-white/50">
            Página {page} de {pages}
          </span>
          {page < pages ? <Link href={href(page + 1)} className="hover:underline">Próxima →</Link> : <span />}
        </nav>
      )}
      <p className="mt-6 text-xs text-white/40">Tipos de registro: {Object.values(ENTITY_LABELS).join(", ")}.</p>
    </div>
  );
}

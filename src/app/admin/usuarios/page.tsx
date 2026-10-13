import { Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { listUsers, USERS_PAGE_SIZE } from "@/lib/admin/queries";
import { requireArea } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Usuários" };

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
const ROLE_LABELS: Record<string, string> = { aluno: "Aluno", profissional: "Profissional", admin: "Admin" };
const PRO_STATUS: Record<string, string> = { pendente: "Profissional pendente", rejeitado: "Profissional rejeitado", suspenso: "Profissional suspenso" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const viewer = await requireArea("admin");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const role = typeof sp.papel === "string" && ["aluno", "profissional", "admin", "pendente"].includes(sp.papel) ? sp.papel : "";
  const page = Math.max(1, Number(sp.pagina) || 1);
  const { rows, total } = await listUsers(viewer.id, { search: q, role, page });
  const pages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const href = (p: number) => `/admin/usuarios?${new URLSearchParams({ ...(q && { q }), ...(role && { papel: role }), pagina: String(p) })}`;

  return (
    <div>
      <PageHeader eyebrow="Administração" title="Usuários">
        Contas cadastradas, papéis e atividade. Dados de saúde dos alunos não são exibidos aqui.
      </PageHeader>

      <form className="mb-6 flex flex-col gap-3 sm:flex-row" role="search">
        <label className="relative flex-1">
          <span className="sr-only">Buscar por nome ou e-mail</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail" className="pl-11" />
        </label>
        <label className="sm:w-56">
          <span className="sr-only">Filtrar por papel</span>
          <Select name="papel" defaultValue={role}>
            <option value="">Todos os papéis</option>
            <option value="aluno">Alunos</option>
            <option value="profissional">Profissionais</option>
            <option value="pendente">Profissionais pendentes</option>
            <option value="admin">Administradores</option>
          </Select>
        </label>
        <Button type="submit" variant="outline" className="h-12">
          Filtrar
        </Button>
      </form>

      <p className="mb-3 text-sm text-white/50">
        {total} {total === 1 ? "usuário" : "usuários"}
      </p>
      {rows.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum usuário encontrado" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.12em] text-white/45">
              <tr>
                <th className="px-4 py-3 font-normal">Nome</th>
                <th className="px-4 py-3 font-normal">Papéis</th>
                <th className="px-4 py-3 text-right font-normal">Treinos 30d</th>
                <th className="px-4 py-3 text-right font-normal">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-white/[0.06]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/usuarios/${u.id}`} className="font-medium hover:underline">
                      {u.full_name}
                    </Link>
                    <span className="block text-xs text-white/45">
                      {u.email}
                      {!u.email_verified && " · e-mail não confirmado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles.map((r) => (
                        <Badge key={r} className={r === "admin" ? "border-white text-white" : ""}>
                          {ROLE_LABELS[r] ?? r}
                        </Badge>
                      ))}
                      {u.professional_status && PRO_STATUS[u.professional_status] && <Badge>{PRO_STATUS[u.professional_status]}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.sessions_30d}</td>
                  <td className="px-4 py-3 text-right text-white/55">{fmt.format(new Date(u.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Paginação" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href(page - 1)} className="hover:underline">← Anterior</Link> : <span />}
          <span className="text-white/50">
            Página {page} de {pages}
          </span>
          {page < pages ? <Link href={href(page + 1)} className="hover:underline">Próxima →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

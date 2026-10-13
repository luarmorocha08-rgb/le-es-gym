import { AdminNav } from "@/components/layout/admin-nav";
import { PortalShell } from "@/components/layout/portal-shell";
import { requireArea } from "@/lib/auth/dal";
import { withUser } from "@/lib/db";

export default async function Layout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireArea("admin");
  const pending = await withUser(viewer.id, (db) =>
    db.one<{ n: number }>("select count(*)::int as n from public.professional_profiles where status = 'pendente'"),
  );
  return (
    <PortalShell area="admin" viewer={viewer} nav={<AdminNav pending={pending?.n ?? 0} />}>
      {children}
    </PortalShell>
  );
}

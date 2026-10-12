import { PortalShell } from "@/components/layout/portal-shell";
import { requireArea } from "@/lib/auth/dal";

export default async function Layout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireArea("admin");
  return (
    <PortalShell area="admin" viewer={viewer}>
      {children}
    </PortalShell>
  );
}

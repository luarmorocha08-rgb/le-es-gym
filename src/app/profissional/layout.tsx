import { PortalShell } from "@/components/layout/portal-shell";
import { requireArea } from "@/lib/auth/dal";

export default async function Layout({ children }: LayoutProps<"/profissional">) {
  const viewer = await requireArea("profissional");
  return (
    <PortalShell area="profissional" viewer={viewer}>
      {children}
    </PortalShell>
  );
}

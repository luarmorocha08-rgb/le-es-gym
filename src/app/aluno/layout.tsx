import { PortalShell } from "@/components/layout/portal-shell";
import { StudentBottomNav, StudentTopNav } from "@/components/layout/student-nav";
import { requireArea } from "@/lib/auth/dal";

export default async function Layout({ children }: LayoutProps<"/aluno">) {
  const viewer = await requireArea("aluno");
  return (
    <PortalShell area="aluno" viewer={viewer} nav={<StudentTopNav />} bottomNav={<StudentBottomNav />}>
      {children}
    </PortalShell>
  );
}

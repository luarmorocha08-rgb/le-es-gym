import { PortalShell } from "@/components/layout/portal-shell";
import { TrainerBottomNav, TrainerTopNav } from "@/components/layout/trainer-nav";
import { requireArea } from "@/lib/auth/dal";
import { withUser } from "@/lib/db";

export default async function Layout({ children }: LayoutProps<"/profissional">) {
  const viewer = await requireArea("profissional");
  const pending = await withUser(viewer.id, (db) =>
    db.one<{ n: number }>(
      "select count(*)::int as n from public.workout_requests where trainer_id = $1 and status in ('aguardando_profissional', 'ajuste_solicitado')",
      [viewer.id],
    ),
  );
  const n = pending?.n ?? 0;
  return (
    <PortalShell area="profissional" viewer={viewer} nav={<TrainerTopNav pending={n} />} bottomNav={<TrainerBottomNav pending={n} />}>
      {children}
    </PortalShell>
  );
}

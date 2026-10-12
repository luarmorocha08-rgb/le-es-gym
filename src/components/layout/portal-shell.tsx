import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/(auth)/actions";
import { Wordmark } from "@/components/brand/emblem";
import { Button } from "@/components/ui/button";
import type { Viewer } from "@/lib/auth/dal";

const areaLabel = { aluno: "Portal do aluno", profissional: "Portal do profissional", admin: "Administração" };

export function PortalShell({
  area,
  viewer,
  children,
}: {
  area: keyof typeof areaLabel;
  viewer: Viewer;
  children: ReactNode;
}) {
  const areas = [
    { key: "aluno", href: "/aluno/dashboard", show: true },
    { key: "profissional", href: "/profissional/dashboard", show: viewer.isActiveTrainer },
    { key: "admin", href: "/admin/dashboard", show: viewer.isAdmin },
  ].filter((a) => a.show);

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,#1a1c1f,#000_60%)]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Página inicial">
              <Wordmark />
            </Link>
            <span className="hidden h-5 w-px bg-white/15 sm:block" />
            <span className="hidden font-heading text-[0.68rem] uppercase tracking-[0.22em] text-white/55 sm:block">
              {areaLabel[area]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {areas.length > 1 && (
              <nav aria-label="Trocar de área" className="hidden gap-1 md:flex">
                {areas.map((a) => (
                  <Link
                    key={a.key}
                    href={a.href}
                    aria-current={a.key === area ? "page" : undefined}
                    className="rounded-lg px-3 py-1.5 font-heading text-[0.65rem] uppercase tracking-[0.18em] text-white/55 hover:text-white aria-[current=page]:bg-white/10 aria-[current=page]:text-white"
                  >
                    {areaLabel[a.key as keyof typeof areaLabel]}
                  </Link>
                ))}
              </nav>
            )}
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Sair da conta">
                <LogOut /> <span className="hidden sm:inline">Sair</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="metal-border glass relative rounded-2xl p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-4 font-display text-5xl leading-none tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-xs text-white/45">{hint}</p>}
    </div>
  );
}

export function greeting(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(date),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

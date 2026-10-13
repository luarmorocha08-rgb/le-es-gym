"use client";

import { Activity, ClipboardList, Inbox, LayoutDashboard, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/profissional/dashboard", label: "Painel", icon: LayoutDashboard, match: ["/profissional/dashboard"] },
  { href: "/profissional/alunos", label: "Alunos", icon: Users, match: ["/profissional/alunos"] },
  { href: "/profissional/solicitacoes", label: "Solicitações", icon: Inbox, match: ["/profissional/solicitacoes"] },
  { href: "/profissional/fichas", label: "Fichas", icon: ClipboardList, match: ["/profissional/fichas", "/profissional/criar-treino"] },
  { href: "/profissional/acompanhamento", label: "Acompanhar", icon: Activity, match: ["/profissional/acompanhamento"] },
];
const extra = [{ href: "/profissional/perfil", label: "Meu perfil", icon: UserCog, match: ["/profissional/perfil"] }];

const active = (pathname: string, match: string[]) => match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

export function TrainerTopNav({ pending }: { pending: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Portal do profissional" className="hidden border-b border-white/[0.07] md:block">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
        {[...items, ...extra].map((item) => {
          const on = active(pathname, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-3 font-heading text-[0.7rem] uppercase tracking-[0.18em] transition",
                on ? "border-white text-white" : "border-transparent text-white/50 hover:text-white",
              )}
            >
              <item.icon className="size-3.5" aria-hidden />
              {item.label}
              {item.href === "/profissional/solicitacoes" && pending > 0 && (
                <span className="rounded-full bg-white px-1.5 text-[0.6rem] font-bold text-black" aria-label={`${pending} pendentes`}>
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TrainerBottomNav({ pending }: { pending: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const on = active(pathname, item.match);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[0.6rem] font-medium uppercase tracking-[0.06em]", on ? "text-white" : "text-white/55")}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full", on && "bg-white text-black")}>
                  <item.icon className="size-[1.1rem]" aria-hidden />
                </span>
                {item.label}
                {item.href === "/profissional/solicitacoes" && pending > 0 && (
                  <span className="absolute right-3 top-1.5 grid size-4 place-items-center rounded-full bg-white text-[0.55rem] font-bold text-black">{pending}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

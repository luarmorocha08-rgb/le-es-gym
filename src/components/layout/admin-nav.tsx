"use client";

import { BadgeCheck, CalendarClock, Dumbbell, LayoutDashboard, Link2, Megaphone, ScrollText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/profissionais", label: "Profissionais", icon: BadgeCheck },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/vinculos", label: "Vínculos", icon: Link2 },
  { href: "/admin/exercicios", label: "Exercícios", icon: Dumbbell },
  { href: "/admin/horarios", label: "Horários", icon: CalendarClock },
  { href: "/admin/conteudo", label: "Conteúdo", icon: Megaphone },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
];

/** Navegação do painel (rolagem horizontal no celular). */
export function AdminNav({ pending }: { pending: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administração" className="border-b border-white/[0.07]">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
        {items.map((item) => {
          const on = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 font-heading text-[0.7rem] uppercase tracking-[0.18em] transition",
                on ? "border-white text-white" : "border-transparent text-white/50 hover:text-white",
              )}
            >
              <item.icon className="size-3.5" aria-hidden />
              {item.label}
              {item.href === "/admin/profissionais" && pending > 0 && (
                <span className="rounded-full bg-white px-1.5 text-[0.6rem] font-bold text-black" aria-label={`${pending} aguardando aprovação`}>
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

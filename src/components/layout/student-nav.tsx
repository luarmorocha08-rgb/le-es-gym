"use client";

import { BrainCircuit, Dumbbell, Home, Library, TrendingUp, User, UserCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const primary = [
  { href: "/aluno/dashboard", label: "Início", icon: Home, match: ["/aluno/dashboard"] },
  { href: "/aluno/meus-treinos", label: "Meu Treino", icon: Dumbbell, match: ["/aluno/meus-treinos", "/aluno/criar-treino"] },
  { href: "/aluno/treino-ia", label: "IA", icon: BrainCircuit, match: ["/aluno/treino-ia"] },
  { href: "/aluno/evolucao", label: "Evolução", icon: TrendingUp, match: ["/aluno/evolucao"] },
  { href: "/aluno/perfil", label: "Perfil", icon: User, match: ["/aluno/perfil"] },
];

const secondary = [
  { href: "/aluno/exercicios", label: "Exercícios", icon: Library, match: ["/aluno/exercicios"] },
  { href: "/aluno/solicitar-profissional", label: "Meu Treinador", icon: UserCheck, match: ["/aluno/solicitar-profissional"] },
];

function isActive(pathname: string, match: string[]) {
  return match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

/** Navegação do desktop (barra superior secundária). */
export function StudentTopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Portal do aluno" className="hidden border-b border-white/[0.07] md:block">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
        {[...primary, ...secondary].map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-3 font-heading text-[0.7rem] uppercase tracking-[0.18em] transition",
                active ? "border-white text-white" : "border-transparent text-white/50 hover:text-white",
              )}
            >
              <item.icon className="size-3.5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Navegação inferior estilo app (mobile). Oculta no modo treino. */
export function StudentBottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/aluno/treino/")) return null;
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-5">
        {primary.map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.62rem] font-medium uppercase tracking-[0.08em] transition",
                  active ? "text-white" : "text-white/55",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition", active && "bg-white text-black")}>
                  <item.icon className="size-[1.1rem]" aria-hidden />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

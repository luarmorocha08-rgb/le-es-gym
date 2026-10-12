"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/emblem";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/#academia", label: "Academia" },
  { href: "/#plataforma", label: "Plataforma" },
  { href: "/#experiencia", label: "Experiência" },
  { href: "/equipe", label: "Equipe" },
  { href: "/contato", label: "Contato" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500",
        scrolled || open
          ? "border-b border-white/10 bg-black/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:h-[72px] lg:px-10">
        <Link href="/" aria-label="LEÕES GYM C5 — início" className="shrink-0" onClick={() => setOpen(false)}>
          <Wordmark />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3.5 py-2 font-heading text-[0.72rem] uppercase tracking-[0.2em] text-white/65 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/cadastro">Começar agora</Link>
          </Button>
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-xl border border-white/15 lg:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        id="menu-mobile"
        hidden={!open}
        className="border-t border-white/10 bg-black/95 px-4 pb-8 pt-4 backdrop-blur-xl lg:hidden"
      >
        <nav aria-label="Menu mobile" className="flex flex-col">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="border-b border-white/[0.07] py-4 font-display text-3xl uppercase tracking-wide text-white/90"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button asChild variant="outline">
            <Link href="/login" onClick={() => setOpen(false)}>
              Entrar
            </Link>
          </Button>
          <Button asChild>
            <Link href="/cadastro" onClick={() => setOpen(false)}>
              Criar conta
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

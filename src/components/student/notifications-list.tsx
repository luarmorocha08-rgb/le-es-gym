"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { markNotificationsRead } from "@/app/aluno/_actions/requests";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type N = { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };
const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export function NotificationsList({ items, compact = false }: { items: N[]; compact?: boolean }) {
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.read_at);
  return (
    <section aria-labelledby="notificacoes" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="notificacoes" className="eyebrow flex items-center gap-2">
          <Bell className="size-3.5" aria-hidden /> Notificações
          {unread.length > 0 && <span className="rounded-full bg-white px-1.5 text-[0.6rem] font-bold text-black">{unread.length}</span>}
        </h2>
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => void (await markNotificationsRead()))}>
            <CheckCheck /> Marcar como lidas
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-white/50">Nada por aqui. Avisos de treinos e solicitações aparecem neste espaço.</p>
      ) : (
        <ul className={cn("mt-3 divide-y divide-white/[0.06]", compact && "max-h-72 overflow-y-auto")}>
          {items.map((n) => {
            const content = (
              <>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-white/15" : "bg-white")} aria-hidden />
                <span className="min-w-0">
                  <span className={cn("block text-sm", !n.read_at && "font-semibold")}>{n.title}</span>
                  {n.body && <span className="block text-xs text-white/55">{n.body}</span>}
                  <span className="block text-[0.65rem] text-white/35">{fmt.format(new Date(n.created_at))}</span>
                </span>
              </>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} className="flex gap-3 py-3 hover:opacity-80" onClick={() => !n.read_at && start(async () => void (await markNotificationsRead([n.id])))}>
                    {content}
                  </Link>
                ) : (
                  <div className="flex gap-3 py-3">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

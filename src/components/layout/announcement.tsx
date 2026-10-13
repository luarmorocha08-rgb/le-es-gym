"use client";

import { ArrowRight, Megaphone, X } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { PublicAnnouncement } from "@/lib/data/public";

const STORAGE_KEY = "aviso-dispensado";
const EVENT = "aviso-dispensado";

function readDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** Aviso da academia (painel → Conteúdo). Pode ser dispensado; volta se o texto mudar. */
export function AnnouncementBar({ announcement }: { announcement: PublicAnnouncement }) {
  const key = `aviso:${announcement.text}`;
  // no servidor fica oculto (evita piscar para quem já dispensou)
  const visible = useSyncExternalStore(subscribe, () => readDismissed() !== key, () => false);
  if (!visible) return null;

  const external = announcement.linkUrl.startsWith("https://");
  const link =
    announcement.linkUrl && (
      <span className="inline-flex items-center gap-1 font-heading text-[0.68rem] uppercase tracking-[0.18em] text-white underline-offset-4 group-hover:underline">
        {announcement.linkLabel || "Saiba mais"} <ArrowRight className="size-3.5" />
      </span>
    );

  return (
    <aside
      aria-label="Aviso da academia"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-white/15 bg-black/80 py-3 pl-4 pr-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
    >
      <Megaphone className="size-4 shrink-0 text-white/70" aria-hidden />
      {announcement.linkUrl ? (
        external ? (
          <a href={announcement.linkUrl} target="_blank" rel="noopener noreferrer" className="group flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-white/85">{announcement.text}</span>
            {link}
          </a>
        ) : (
          <Link href={announcement.linkUrl} className="group flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-white/85">{announcement.text}</span>
            {link}
          </Link>
        )
      ) : (
        <p className="flex-1 text-sm text-white/85">{announcement.text}</p>
      )}
      <button
        type="button"
        aria-label="Dispensar aviso"
        className="rounded-lg p-2 text-white/50 hover:text-white"
        onClick={() => {
          try {
            localStorage.setItem(STORAGE_KEY, key);
          } catch {}
          window.dispatchEvent(new Event(EVENT));
        }}
      >
        <X className="size-4" />
      </button>
    </aside>
  );
}

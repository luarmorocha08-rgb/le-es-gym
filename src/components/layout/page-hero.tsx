import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="grain relative overflow-hidden border-b border-white/10 pb-16 pt-36 sm:pb-24 sm:pt-44">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_70%_at_70%_0%,rgba(255,255,255,0.12),transparent_60%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <p className="eyebrow mb-6">{eyebrow}</p>
        <h1 className="font-display text-[clamp(3rem,10vw,9rem)] uppercase leading-[0.88]">{title}</h1>
        {children && <div className="mt-8 max-w-2xl text-lg text-white/65">{children}</div>}
      </div>
    </section>
  );
}

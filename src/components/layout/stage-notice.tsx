import { Construction } from "lucide-react";

/** Aviso transparente sobre módulos ainda não liberados (sem botões falsos). */
export function StageNotice({ stage, items }: { stage: string; items: string[] }) {
  return (
    <section aria-label="Próximos módulos" className="rounded-2xl border border-dashed border-white/15 p-6">
      <p className="eyebrow flex items-center gap-2">
        <Construction className="size-3.5" aria-hidden /> Em desenvolvimento · {stage}
      </p>
      <ul className="mt-4 grid gap-2 text-sm text-white/60 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-white/40" aria-hidden />
            {i}
          </li>
        ))}
      </ul>
    </section>
  );
}

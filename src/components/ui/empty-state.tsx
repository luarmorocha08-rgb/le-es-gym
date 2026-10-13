import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <Icon className="size-6 text-white/60" aria-hidden />
      </span>
      <p className="mt-5 font-heading text-lg uppercase tracking-[0.1em]">{title}</p>
      {children && <div className="mt-2 max-w-sm text-sm text-white/55">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

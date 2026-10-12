import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const icons = { info: Info, error: AlertTriangle, success: CheckCircle2 };

export function Alert({
  tone = "info",
  title,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { tone?: keyof typeof icons; title?: string }) {
  const Icon = icons[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl border p-4 text-sm leading-relaxed",
        tone === "error" && "border-[var(--color-danger)]/35 bg-[var(--color-danger)]/[0.07] text-[#ffd6d6]",
        tone === "success" && "border-emerald-200/25 bg-emerald-200/[0.06] text-[var(--color-success)]",
        tone === "info" && "border-white/15 bg-white/[0.04] text-white/80",
        className,
      )}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold text-white">{title}</p>}
        {children}
      </div>
    </div>
  );
}

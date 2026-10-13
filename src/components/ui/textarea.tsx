import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-white/12 bg-white/[0.03] px-4 py-3 text-[0.95rem] text-white placeholder:text-white/35",
        "outline-none transition hover:border-white/25 focus:border-white/60 focus:bg-white/[0.06]",
        "aria-[invalid=true]:border-[var(--color-danger)]/70",
        className,
      )}
      {...props}
    />
  );
}

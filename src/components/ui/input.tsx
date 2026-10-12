import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border border-white/12 bg-white/[0.03] px-4 text-[0.95rem] text-white placeholder:text-white/35",
        "transition-[border-color,background-color,box-shadow] duration-200 outline-none",
        "hover:border-white/25 focus:border-white/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(255,255,255,0.06)]",
        "aria-[invalid=true]:border-[var(--color-danger)]/70 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

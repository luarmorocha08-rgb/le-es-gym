import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 font-heading text-[0.65rem] uppercase tracking-[0.2em] text-white/80",
        className,
      )}
      {...props}
    />
  );
}

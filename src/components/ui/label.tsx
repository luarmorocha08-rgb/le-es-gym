import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("font-heading text-[0.72rem] uppercase tracking-[0.18em] text-white/70", className)}
      {...props}
    />
  );
}

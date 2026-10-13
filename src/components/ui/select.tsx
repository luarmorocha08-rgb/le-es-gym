import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-12 w-full appearance-none rounded-xl border border-white/12 bg-[#0d0e10] pl-4 pr-10 text-[0.95rem] text-white",
          "outline-none transition hover:border-white/25 focus:border-white/60",
          "aria-[invalid=true]:border-[var(--color-danger)]/70",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-white/50" aria-hidden />
    </div>
  );
}

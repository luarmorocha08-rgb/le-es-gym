import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("metal-border glass relative rounded-2xl p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]", className)}
      {...props}
    />
  );
}

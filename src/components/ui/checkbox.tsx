import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      className={cn("mt-0.5 size-5 shrink-0 cursor-pointer rounded-md accent-white", className)}
      {...props}
    />
  );
}

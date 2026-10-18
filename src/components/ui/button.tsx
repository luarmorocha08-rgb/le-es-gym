import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "group/btn relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-heading uppercase tracking-[0.14em] transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-black hover:bg-[#8ff1ff] shadow-[0_0_0_1px_rgba(62,230,255,0.5),0_10px_40px_-10px_rgba(62,230,255,0.6)]",
        outline:
          "border border-white/25 bg-white/[0.02] text-white hover:border-accent hover:bg-accent/[0.08] hover:text-white",
        ghost: "text-white/80 hover:bg-white/[0.06] hover:text-white",
        metal:
          "text-black bg-[linear-gradient(110deg,#3ee6ff,#e9fcff_35%,#8a7dff_65%,#3ee6ff)] bg-[length:200%_100%] hover:bg-[position:100%_0] shadow-[0_8px_30px_-8px_rgba(62,230,255,0.5)]",
        danger: "border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10",
      },
      size: {
        sm: "h-9 rounded-lg px-4 text-[0.7rem]",
        md: "h-11 rounded-xl px-6 text-xs",
        lg: "h-14 rounded-2xl px-8 text-sm",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

import { Dumbbell } from "lucide-react";
import { muscleLabel } from "@/lib/workout/constants";
import { cn } from "@/lib/utils";

/**
 * Representação visual do exercício enquanto não houver mídia própria
 * cadastrada pela academia: grupo muscular em destaque, sem imagens genéricas.
 */
export function ExerciseTile({ muscles, className }: { muscles: string[]; className?: string }) {
  const main = muscles[0] ?? "";
  return (
    <div
      aria-hidden
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_30%_20%,#2a2d32,#0b0c0e_70%)]",
        className,
      )}
    >
      <Dumbbell className="absolute -right-3 -top-3 size-16 rotate-12 text-white/[0.06]" />
      <span className="px-2 text-center font-display text-lg uppercase leading-none text-white/80">{muscleLabel(main)}</span>
    </div>
  );
}

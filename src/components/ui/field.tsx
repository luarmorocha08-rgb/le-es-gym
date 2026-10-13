import type { ReactNode } from "react";
import { Label } from "./label";

/** Rótulo + controle + dica/erro com ligações de acessibilidade. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-2">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs text-white/55">{hint}</p>}
      {error && (
        <p id={`${id}-erro`} className="mt-1.5 text-xs text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

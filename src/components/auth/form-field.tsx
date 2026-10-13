import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormField({
  label,
  name,
  error,
  hint,
  ...props
}: ComponentProps<typeof Input> & { label: string; name: string; error?: string; hint?: string }) {
  const id = props.id ?? name;
  const describedBy = [error && `${id}-erro`, hint && `${id}-dica`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      {hint && !error && (
        <p id={`${id}-dica`} className="text-xs text-white/55">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-erro`} className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

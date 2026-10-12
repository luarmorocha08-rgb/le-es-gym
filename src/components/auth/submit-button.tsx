"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function SubmitButton({ children, pending, disabled }: { children: ReactNode; pending: boolean; disabled?: boolean }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending || disabled} aria-busy={pending}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {pending ? "Aguarde…" : children}
    </Button>
  );
}

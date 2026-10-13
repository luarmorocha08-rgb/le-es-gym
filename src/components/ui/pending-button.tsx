"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

/** Botão de submit que mostra o estado de envio do <form> pai. */
export function PendingButton({ children, pending: forced, ...props }: ComponentProps<typeof Button> & { pending?: boolean }) {
  const status = useFormStatus();
  const pending = forced ?? status.pending;
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

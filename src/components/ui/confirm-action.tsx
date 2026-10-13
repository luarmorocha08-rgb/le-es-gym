"use client";

import { useRef, useTransition, type ReactNode } from "react";
import { Button } from "./button";

/**
 * Botão que pede confirmação num <dialog> nativo antes de executar uma action.
 */
export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel = "Confirmar",
  onConfirm,
  variant = "outline",
  size = "sm",
  icon,
}: {
  label: string;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<unknown>;
  variant?: "outline" | "danger" | "ghost";
  size?: "sm" | "md";
  icon?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => ref.current?.showModal()}>
        {icon}
        {label}
      </Button>
      <dialog
        ref={ref}
        className="m-auto w-[min(92vw,420px)] rounded-2xl border border-white/15 bg-[#0c0d0f] p-6 text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <h2 className="font-heading text-xl uppercase tracking-[0.06em]">{title}</h2>
        <div className="mt-3 text-sm text-white/65">{description}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => ref.current?.close()}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await onConfirm();
                ref.current?.close();
              })
            }
          >
            {pending ? "Aguarde…" : confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}

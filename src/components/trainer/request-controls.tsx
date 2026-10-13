"use client";

import { Send } from "lucide-react";
import { sendTrainerMessage, transitionTrainerRequest, type TrainerFormState } from "@/app/profissional/_actions/requests";
import { Alert } from "@/components/ui/alert";
import { PendingButton } from "@/components/ui/pending-button";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/lib/hooks/use-form-action";

export function TransitionButton({ requestId, to, label, variant = "primary" }: { requestId: string; to: "em_analise" | "em_elaboracao" | "concluido"; label: string; variant?: "primary" | "outline" }) {
  const [state, onSubmit, pending] = useFormAction<TrainerFormState>(transitionTrainerRequest, {});
  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="to" value={to} />
      <PendingButton pending={pending} variant={variant}>
        {label}
      </PendingButton>
      {state.message && <p className="mt-2 text-xs text-[var(--color-danger)]">{state.message}</p>}
    </form>
  );
}

export function TrainerMessageForm({ requestId }: { requestId: string }) {
  const [state, onSubmit, pending] = useFormAction<TrainerFormState>(sendTrainerMessage, {}, { resetOnSuccess: true });
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Mensagem</span>
          <Textarea name="body" className="min-h-12" rows={2} maxLength={2000} placeholder="Escreva uma mensagem ou peça informações adicionais…" required />
        </label>
        <PendingButton pending={pending} className="h-12" aria-label="Enviar mensagem">
          <Send />
        </PendingButton>
      </div>
      {state.message && <Alert tone="error">{state.message}</Alert>}
    </form>
  );
}

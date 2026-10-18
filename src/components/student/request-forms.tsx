"use client";

import { useFormAction } from "@/lib/hooks/use-form-action";
import { Send } from "lucide-react";
import { useState } from "react";
import { createRequest, sendMessage, transitionRequest, type RequestFormState } from "@/app/aluno/_actions/requests";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PendingButton } from "@/components/ui/pending-button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TrainerCard } from "@/lib/student/queries";
import { cn } from "@/lib/utils";
import { GOAL_LABELS, GOALS } from "@/lib/workout/constants";

export function NewRequestForm({
  trainers,
  defaults,
}: {
  trainers: TrainerCard[];
  defaults: { goal: string | null; daysPerWeek: number | null; sessionMinutes: number | null };
}) {
  const [state, onSubmit, pending] = useFormAction<RequestFormState>(createRequest, {});
  const available = trainers.filter((t) => t.accepts_requests);
  const [trainer, setTrainer] = useState(available.find((t) => t.linked)?.user_id ?? available[0]?.user_id ?? "");

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <fieldset>
        <legend className="font-heading text-[0.72rem] uppercase tracking-[0.18em] text-white/70">Profissional</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {trainers.map((t) => {
            const disabled = !t.accepts_requests;
            return (
              <label
                key={t.user_id}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl border p-4 transition",
                  trainer === t.user_id ? "border-accent bg-accent/[0.07]" : "border-white/10 hover:border-white/30",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <input type="radio" name="trainerId" value={t.user_id} checked={trainer === t.user_id} onChange={() => setTrainer(t.user_id)} disabled={disabled} className="mt-1 size-4 accent-white" />
                <span className="min-w-0">
                  <span className="block font-heading uppercase tracking-[0.04em]">
                    {t.full_name}
                    {t.linked && <span className="ml-2 text-xs normal-case tracking-normal text-white/55">· seu treinador</span>}
                  </span>
                  {t.cref && <span className="block text-xs text-white/55">CREF {t.cref}</span>}
                  {t.specialties.length > 0 && <span className="mt-1 block text-xs text-white/60">{t.specialties.join(" · ")}</span>}
                  {t.bio && <span className="mt-2 line-clamp-3 block text-xs text-white/55">{t.bio}</span>}
                  {disabled && <span className="mt-1 block text-xs">Não está recebendo solicitações no momento.</span>}
                </span>
              </label>
            );
          })}
        </div>
        {state.fieldErrors?.trainerId && <p className="mt-2 text-xs text-[var(--color-danger)]">{state.fieldErrors.trainerId}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="r-goal" label="Objetivo principal" error={state.fieldErrors?.goal}>
          <Select id="r-goal" name="goal" defaultValue={defaults.goal ?? ""} required>
            <option value="" disabled>
              Escolha
            </option>
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {GOAL_LABELS[g]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="r-days" label="Dias por semana" error={state.fieldErrors?.daysPerWeek}>
          <Select id="r-days" name="daysPerWeek" defaultValue={String(defaults.daysPerWeek ?? 3)}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "dia" : "dias"}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="r-min" label="Tempo por treino" error={state.fieldErrors?.sessionMinutes}>
          <Select id="r-min" name="sessionMinutes" defaultValue={String(defaults.sessionMinutes ?? 60)}>
            {[30, 45, 60, 75, 90, 120].map((n) => (
              <option key={n} value={n}>
                {n} min
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="r-details" label="Observações para o profissional" error={state.fieldErrors?.details} hint="Rotina, preferências, exercícios que gosta ou quer evitar…">
        <Textarea id="r-details" name="details" maxLength={2000} />
      </Field>
      <Alert>
        Ao aceitar o pedido, o profissional passa a acompanhar você: ele vê seus treinos, cargas e as informações de saúde
        que você declarou no perfil. Medidas corporais só são vistas se você compartilhá-las.
      </Alert>
      <PendingButton pending={pending} size="lg" disabled={!trainer}>
        <Send /> Enviar solicitação
      </PendingButton>
    </form>
  );
}

export function MessageForm({ requestId }: { requestId: string }) {
  const [state, onSubmit, pending] = useFormAction<RequestFormState>(sendMessage, {}, { resetOnSuccess: true });
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="flex-1">
        <span className="sr-only">Mensagem</span>
        <Textarea name="body" className="min-h-12" rows={1} maxLength={2000} placeholder="Escreva uma mensagem…" required />
      </label>
      <PendingButton pending={pending} className="h-12" aria-label="Enviar mensagem">
        <Send />
      </PendingButton>
      {state.message && <p className="text-xs text-[var(--color-danger)]">{state.message}</p>}
    </form>
  );
}

export function RequestActions({ requestId, status }: { requestId: string; status: string }) {
  const [state, onSubmit, pending] = useFormAction<RequestFormState>(transitionRequest, {});
  const [adjusting, setAdjusting] = useState(false);
  const canCancel = status === "aguardando_profissional" || status === "em_analise";
  const delivered = status === "entregue";
  if (!canCancel && !delivered) return null;

  return (
    <div className="space-y-3">
      {state.message && <Alert tone="error">{state.message}</Alert>}
      {delivered && !adjusting && (
        <div className="flex flex-wrap gap-2">
          <form onSubmit={onSubmit}>
            <input type="hidden" name="requestId" value={requestId} />
            <input type="hidden" name="to" value="concluido" />
            <PendingButton pending={pending}>Treino recebido — concluir</PendingButton>
          </form>
          <Button variant="outline" onClick={() => setAdjusting(true)}>
            Solicitar ajuste
          </Button>
        </div>
      )}
      {delivered && adjusting && (
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="to" value="ajuste_solicitado" />
          <Field id="adj-note" label="O que precisa ser ajustado?" error={state.fieldErrors?.note}>
            <Textarea id="adj-note" name="note" maxLength={1000} required />
          </Field>
          <div className="flex gap-2">
            <PendingButton pending={pending}>Enviar pedido de ajuste</PendingButton>
            <Button variant="ghost" type="button" onClick={() => setAdjusting(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
      {canCancel && (
        <form onSubmit={onSubmit}>
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="to" value="cancelado" />
          <PendingButton pending={pending} variant="danger" size="sm">
            Cancelar solicitação
          </PendingButton>
        </form>
      )}
    </div>
  );
}

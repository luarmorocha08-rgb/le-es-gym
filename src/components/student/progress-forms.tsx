"use client";

import { useFormAction } from "@/lib/hooks/use-form-action";
import { Check, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { addGoal, addProgressRecord, deleteGoal, deleteProgressRecord, toggleGoal, type ProgressFormState } from "@/app/aluno/_actions/progress";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PendingButton } from "@/components/ui/pending-button";
import { cn } from "@/lib/utils";
import { MEASUREMENTS } from "@/lib/workout/constants";

export function GoalForm() {
  const [state, onSubmit, pending] = useFormAction<ProgressFormState>(addGoal, {}, { resetOnSuccess: true });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_110px_90px_160px_auto] sm:items-end">
      <Field id="goal-title" label="Nova meta" error={state.fieldErrors?.title}>
        <Input id="goal-title" name="title" placeholder="Ex.: Supino com 80 kg" maxLength={120} required />
      </Field>
      <Field id="goal-target" label="Alvo" error={state.fieldErrors?.targetValue}>
        <Input id="goal-target" name="targetValue" inputMode="decimal" placeholder="80" />
      </Field>
      <Field id="goal-unit" label="Unidade">
        <Input id="goal-unit" name="unit" placeholder="kg" maxLength={16} />
      </Field>
      <Field id="goal-due" label="Prazo" error={state.fieldErrors?.dueOn}>
        <Input id="goal-due" name="dueOn" type="date" />
      </Field>
      <PendingButton pending={pending} className="h-12">
        <Plus /> Adicionar
      </PendingButton>
      {state.message && <p className="text-sm text-[var(--color-danger)] sm:col-span-5">{state.message}</p>}
    </form>
  );
}

export function GoalItem({ goal }: { goal: { id: string; title: string; target_value: number | null; unit: string | null; due_on: string | null; achieved_at: string | null } }) {
  const [pending, start] = useTransition();
  const done = Boolean(goal.achieved_at);
  return (
    <li className="flex items-center gap-3 py-3">
      <button
        type="button"
        onClick={() => start(async () => void (await toggleGoal(goal.id)))}
        disabled={pending}
        aria-pressed={done}
        aria-label={done ? `Reabrir meta ${goal.title}` : `Marcar meta ${goal.title} como concluída`}
        className={cn("grid size-8 shrink-0 place-items-center rounded-full border transition", done ? "border-accent bg-accent text-black" : "border-white/30 hover:border-white")}
      >
        {done && <Check className="size-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", done && "text-white/55 line-through")}>{goal.title}</p>
        <p className="text-xs text-white/55">
          {goal.target_value !== null && `Alvo: ${goal.target_value} ${goal.unit ?? ""}`}
          {goal.due_on && ` · até ${new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${goal.due_on}T00:00:00Z`))}`}
        </p>
      </div>
      <button type="button" onClick={() => start(async () => void (await deleteGoal(goal.id)))} className="p-2 text-white/55 hover:text-[var(--color-danger)]" aria-label={`Excluir meta ${goal.title}`}>
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

export function ProgressForm() {
  const [state, onSubmit, pending] = useFormAction<ProgressFormState>(addProgressRecord, {}, { resetOnSuccess: true });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state.message && <Alert tone="error">{state.message}</Alert>}
      {state.ok && <Alert tone="success">Registro salvo.</Alert>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field id="p-date" label="Data" error={state.fieldErrors?.recordedOn}>
          <Input id="p-date" name="recordedOn" type="date" defaultValue={today} max={today} required />
        </Field>
        <Field id="p-weight" label="Peso (kg)" error={state.fieldErrors?.weightKg}>
          <Input id="p-weight" name="weightKg" inputMode="decimal" />
        </Field>
        <Field id="p-fat" label="% gordura" error={state.fieldErrors?.bodyFatPct}>
          <Input id="p-fat" name="bodyFatPct" inputMode="decimal" />
        </Field>
        {MEASUREMENTS.map((m) => (
          <Field key={m.key} id={`p-${m.key}`} label={m.label} error={state.fieldErrors?.[m.key]}>
            <Input id={`p-${m.key}`} name={m.key} inputMode="decimal" />
          </Field>
        ))}
      </div>
      <Field id="p-notes" label="Observações">
        <Input id="p-notes" name="notes" maxLength={500} />
      </Field>
      <label className="flex gap-3 text-sm text-white/70">
        <Checkbox name="share" />
        Compartilhar este registro com meu treinador vinculado
      </label>
      <PendingButton pending={pending}>
        <Plus /> Salvar registro
      </PendingButton>
    </form>
  );
}

export function DeleteProgress({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => void (await deleteProgressRecord(id)))} className="p-2 text-white/55 hover:text-[var(--color-danger)]" aria-label="Excluir registro">
      <Trash2 className="size-4" />
    </button>
  );
}

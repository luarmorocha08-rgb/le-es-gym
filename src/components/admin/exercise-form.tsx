"use client";

import { useState } from "react";
import { saveExercise } from "@/app/admin/_actions/admin";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PendingButton } from "@/components/ui/pending-button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminExercise } from "@/lib/admin/queries";
import { useFormAction } from "@/lib/hooks/use-form-action";
import { slugify, type FormState } from "@/lib/validation/admin";
import { LEVEL_LABELS, LEVELS, MUSCLE_LABELS } from "@/lib/workout/constants";

function MuscleGroup({ name, legend, selected, error }: { name: string; legend: string; selected: string[]; error?: string }) {
  return (
    <fieldset>
      <legend className="font-heading text-[0.72rem] uppercase tracking-[0.18em] text-white/70">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(MUSCLE_LABELS).map(([value, label]) => (
          <label
            key={value}
            className="flex cursor-pointer items-center rounded-xl border border-white/15 px-3 py-1.5 text-sm has-[:checked]:border-white has-[:checked]:bg-white has-[:checked]:text-black has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-white/60"
          >
            <input type="checkbox" name={name} value={value} defaultChecked={selected.includes(value)} className="sr-only" />
            {label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs text-[var(--color-danger)]">{error}</p>}
    </fieldset>
  );
}

export function ExerciseForm({ exercise, equipment }: { exercise: AdminExercise | null; equipment: string[] }) {
  const [state, onSubmit, pending] = useFormAction<FormState>(saveExercise.bind(null, exercise?.id ?? null), {});
  const [name, setName] = useState(exercise?.name ?? "");
  const [slug, setSlug] = useState(exercise?.slug ?? "");
  const e = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ex-name" label="Nome" error={e.name}>
          <Input id="ex-name" name="name" value={name} maxLength={120} required onChange={(ev) => setName(ev.target.value)} />
        </Field>
        <Field id="ex-slug" label="Identificador (URL)" error={e.slug} hint={exercise ? "Alterar quebra links salvos por usuários." : "Gerado a partir do nome se vazio."}>
          <Input id="ex-slug" name="slug" value={slug} placeholder={slugify(name)} onChange={(ev) => setSlug(ev.target.value)} />
        </Field>
      </div>

      <MuscleGroup name="primaryMuscles" legend="Músculos principais" selected={exercise?.primary_muscles ?? []} error={e.primaryMuscles} />
      <MuscleGroup name="secondaryMuscles" legend="Músculos secundários (opcional)" selected={exercise?.secondary_muscles ?? []} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="ex-eq" label="Equipamento" error={e.equipment}>
          <Input id="ex-eq" name="equipment" list="ex-eq-list" defaultValue={exercise?.equipment ?? ""} maxLength={60} required />
          <datalist id="ex-eq-list">
            {equipment.map((q) => (
              <option key={q} value={q} />
            ))}
          </datalist>
        </Field>
        <Field id="ex-mech" label="Mecânica">
          <Select id="ex-mech" name="mechanics" defaultValue={exercise?.mechanics ?? ""}>
            <option value="">Não informada</option>
            <option value="composto">Composto</option>
            <option value="isolado">Isolado</option>
          </Select>
        </Field>
        <Field id="ex-level" label="Nível">
          <Select id="ex-level" name="level" defaultValue={exercise?.level ?? "iniciante"}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field id="ex-instr" label="Execução — um passo por linha" error={e.instructions}>
        <Textarea id="ex-instr" name="instructions" defaultValue={exercise?.instructions.join("\n") ?? ""} className="min-h-32" required />
      </Field>
      <Field id="ex-tips" label="Dicas — uma por linha (opcional)" error={e.tips}>
        <Textarea id="ex-tips" name="tips" defaultValue={exercise?.tips.join("\n") ?? ""} className="min-h-20" />
      </Field>
      <Field id="ex-video" label="Vídeo demonstrativo (opcional)" error={e.videoUrl} hint="Link https:// de um vídeo da própria academia (ex.: Instagram ou YouTube).">
        <Input id="ex-video" name="videoUrl" type="url" defaultValue={exercise?.video_url ?? ""} placeholder="https://" />
      </Field>

      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <PendingButton pending={pending} size="lg">
        {exercise ? "Salvar alterações" : "Cadastrar exercício"}
      </PendingButton>
    </form>
  );
}

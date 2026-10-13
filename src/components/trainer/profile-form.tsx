"use client";

import { updateProfessionalProfile, type TrainerFormState } from "@/app/profissional/_actions/requests";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PendingButton } from "@/components/ui/pending-button";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/lib/hooks/use-form-action";

type Profile = { cref: string | null; bio: string | null; specialties: string[]; is_public: boolean; accepts_requests: boolean };

export function ProfessionalProfileForm({ profile }: { profile: Profile }) {
  const [state, onSubmit, pending] = useFormAction<TrainerFormState>(updateProfessionalProfile, {});
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pp-cref" label="CREF" error={e.cref}>
          <Input id="pp-cref" name="cref" defaultValue={profile.cref ?? ""} maxLength={30} />
        </Field>
        <Field id="pp-spec" label="Especialidades" hint="Separe por vírgulas (até 8)" error={e.specialties}>
          <Input id="pp-spec" name="specialties" defaultValue={profile.specialties.join(", ")} />
        </Field>
      </div>
      <Field id="pp-bio" label="Apresentação" hint="Aparece em /equipe e para os alunos escolherem o treinador." error={e.bio}>
        <Textarea id="pp-bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={1200} />
      </Field>
      <label className="flex gap-3 text-sm text-white/75">
        <Checkbox name="isPublic" defaultChecked={profile.is_public} />
        Exibir meu perfil na página pública da equipe e na lista do “Meu Treinador”
      </label>
      <label className="flex gap-3 text-sm text-white/75">
        <Checkbox name="acceptsRequests" defaultChecked={profile.accepts_requests} />
        Estou recebendo novas solicitações de treino
      </label>
      <PendingButton pending={pending}>Salvar perfil profissional</PendingButton>
    </form>
  );
}

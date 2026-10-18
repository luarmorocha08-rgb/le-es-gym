"use client";

import { useFormAction } from "@/lib/hooks/use-form-action";
import { Download, ShieldOff, Trash2 } from "lucide-react";
import { useTransition } from "react";
import {
  changePassword,
  deleteAccount,
  revokeHealthConsent,
  setAiConsent,
  updateHealth,
  updateProfile,
  type ProfileFormState,
} from "@/app/aluno/_actions/profile";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PendingButton } from "@/components/ui/pending-button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { StudentProfile } from "@/lib/student/queries";
import { GOAL_LABELS, GOALS, LEVEL_LABELS, LEVELS } from "@/lib/workout/constants";

function Feedback({ state }: { state: ProfileFormState }) {
  if (!state.message) return null;
  return <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>;
}

export function ProfileForm({ profile }: { profile: StudentProfile }) {
  const [state, onSubmit, pending] = useFormAction<ProfileFormState>(updateProfile, {});
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pf-name" label="Nome completo" error={e.fullName}>
          <Input id="pf-name" name="fullName" defaultValue={profile.full_name} autoComplete="name" required />
        </Field>
        <Field id="pf-phone" label="Telefone (opcional)" error={e.phone}>
          <Input id="pf-phone" name="phone" defaultValue={profile.phone ?? ""} autoComplete="tel" inputMode="tel" />
        </Field>
        <Field id="pf-birth" label="Data de nascimento (opcional)" error={e.birthDate}>
          <Input id="pf-birth" name="birthDate" type="date" defaultValue={profile.birth_date ?? ""} />
        </Field>
        <Field id="pf-goal" label="Objetivo" error={e.goal}>
          <Select id="pf-goal" name="goal" defaultValue={profile.goal ?? ""}>
            <option value="">Não informar</option>
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {GOAL_LABELS[g]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="pf-level" label="Experiência" error={e.level}>
          <Select id="pf-level" name="level" defaultValue={profile.experience_level ?? ""}>
            <option value="">Não informar</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="pf-days" label="Dias/semana" error={e.daysPerWeek}>
            <Select id="pf-days" name="daysPerWeek" defaultValue={profile.days_per_week ? String(profile.days_per_week) : ""}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="pf-min" label="Min/treino" error={e.sessionMinutes}>
            <Select id="pf-min" name="sessionMinutes" defaultValue={profile.session_minutes ? String(profile.session_minutes) : ""}>
              <option value="">—</option>
              {[30, 45, 60, 75, 90, 120].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
      <PendingButton pending={pending}>Salvar perfil</PendingButton>
    </form>
  );
}

export function HealthForm({ profile }: { profile: StudentProfile }) {
  const [state, onSubmit, pending] = useFormAction<ProfileFormState>(updateHealth, {});
  const [revoking, start] = useTransition();
  const h = profile.health;
  const consented = Boolean(profile.health_data_consent_at);
  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <Feedback state={state} />
        <Field id="h-lim" label="Limitações físicas, lesões ou condições informadas" hint="Isto não substitui avaliação médica. Em caso de dor, procure um profissional de saúde.">
          <Textarea id="h-lim" name="limitations" defaultValue={h?.limitations ?? ""} maxLength={2000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="h-avoid" label="Exercícios que deseja evitar">
            <Textarea id="h-avoid" name="exercisesToAvoid" defaultValue={h?.exercises_to_avoid ?? ""} maxLength={1000} className="min-h-20" />
          </Field>
          <Field id="h-pref" label="Preferências de treino">
            <Textarea id="h-pref" name="preferences" defaultValue={h?.preferences ?? ""} maxLength={1000} className="min-h-20" />
          </Field>
          <Field id="h-eq" label="Equipamentos disponíveis" hint="Separe por vírgulas (ex.: halteres, polia)">
            <Input id="h-eq" name="equipment" defaultValue={h?.available_equipment.join(", ") ?? ""} />
          </Field>
          <Field id="h-mus" label="Grupos musculares prioritários" hint="Separe por vírgulas">
            <Input id="h-mus" name="priorityMuscles" defaultValue={h?.priority_muscles.join(", ") ?? ""} />
          </Field>
        </div>
        <label className="flex gap-3 rounded-xl border border-white/10 p-4 text-sm text-white/75">
          <Checkbox name="consent" defaultChecked={consented} aria-invalid={state.fieldErrors?.consent ? true : undefined} />
          <span>
            Autorizo a REVO TRAIN a tratar estas informações de saúde (dado sensível, LGPD art. 11) para orientar meus
            treinos. Elas ficam visíveis apenas para mim e para profissionais vinculados a mim. Posso revogar quando quiser.
            {state.fieldErrors?.consent && <span className="mt-1 block text-xs text-[var(--color-danger)]">{state.fieldErrors.consent}</span>}
          </span>
        </label>
        <PendingButton pending={pending}>Salvar informações de saúde</PendingButton>
      </form>
      {consented && (
        <ConfirmAction
          label="Revogar consentimento e apagar dados de saúde"
          icon={<ShieldOff />}
          variant="danger"
          title="Revogar consentimento?"
          description="As informações de saúde declaradas serão apagadas. Medidas corporais já registradas continuam até você excluí-las em Evolução, e novos registros ficam bloqueados."
          confirmLabel={revoking ? "Aguarde…" : "Revogar"}
          onConfirm={() => new Promise<void>((resolve) => start(async () => { await revokeHealthConsent(); resolve(); }))}
        />
      )}
    </div>
  );
}

export function AiConsent({ enabled }: { enabled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-white/75">
      <Checkbox checked={enabled} disabled={pending} onChange={(e) => start(() => setAiConsent(e.target.checked))} />
      <span>
        Autorizo o envio dos meus dados de treino (objetivo, experiência, disponibilidade, equipamentos e restrições
        declaradas — sem nome, e-mail ou telefone) a um provedor de inteligência artificial para gerar sugestões de treino.
      </span>
    </label>
  );
}

export function PasswordForm() {
  const [state, onSubmit, pending] = useFormAction<ProfileFormState>(changePassword, {});
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="pw-cur" label="Senha atual" error={e.current}>
          <Input id="pw-cur" name="current" type="password" autoComplete="current-password" required />
        </Field>
        <Field id="pw-new" label="Nova senha" error={e.password}>
          <Input id="pw-new" name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field id="pw-conf" label="Confirmar" error={e.confirm}>
          <Input id="pw-conf" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
      </div>
      <PendingButton pending={pending} variant="outline">Alterar senha</PendingButton>
    </form>
  );
}

export function DataRights() {
  const [state, onSubmit, pending] = useFormAction<ProfileFormState>(deleteAccount, {});
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-white/65">Baixe uma cópia de todos os seus dados (perfil, treinos, sessões, medidas, solicitações e notificações) em formato JSON.</p>
        <Button asChild variant="outline" className="mt-3">
          <a href="/aluno/perfil/exportar" download>
            <Download /> Exportar meus dados
          </a>
        </Button>
      </div>
      <details className="rounded-xl border border-[var(--color-danger)]/30 p-4">
        <summary className="cursor-pointer text-sm text-[var(--color-danger)]">Excluir minha conta</summary>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-white/65">
            Esta ação é permanente: sua conta, treinos, histórico, medidas e mensagens serão apagados. Recomendamos exportar seus dados antes.
          </p>
          <Feedback state={state} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="del-pw" label="Sua senha" error={state.fieldErrors?.password}>
              <Input id="del-pw" name="password" type="password" autoComplete="current-password" required />
            </Field>
            <Field id="del-confirm" label='Digite "EXCLUIR"' error={state.fieldErrors?.confirmation}>
              <Input id="del-confirm" name="confirmation" autoComplete="off" required />
            </Field>
          </div>
          <PendingButton pending={pending} variant="danger">
            <Trash2 /> Excluir conta permanentemente
          </PendingButton>
        </form>
      </details>
    </div>
  );
}

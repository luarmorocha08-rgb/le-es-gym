"use client";

import { Check, Link2Off, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import {
  addHours,
  createLink,
  deleteHour,
  endLink,
  reviewProfessional,
  saveAnnouncement,
  setAdminRole,
  setExerciseActive,
} from "@/app/admin/_actions/admin";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PendingButton } from "@/components/ui/pending-button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/lib/hooks/use-form-action";
import type { Announcement, FormState } from "@/lib/validation/admin";

type Result = { ok: boolean; message?: string };

/** Ação com confirmação em <dialog> e retorno de erro visível. */
function ConfirmButton({
  label,
  title,
  description,
  confirmLabel,
  run,
  icon,
  variant = "outline",
}: {
  label: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  run: () => Promise<Result>;
  icon?: ReactNode;
  variant?: "outline" | "danger" | "ghost";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button type="button" variant={variant} size="sm" onClick={() => ref.current?.showModal()}>
        {icon}
        {label}
      </Button>
      <dialog ref={ref} className="m-auto w-[min(92vw,440px)] rounded-2xl border border-white/15 bg-[#0c0d0f] p-6 text-white backdrop:bg-black/70">
        <h2 className="font-heading text-xl uppercase tracking-[0.06em]">{title}</h2>
        <div className="mt-3 text-sm text-white/65">{description}</div>
        {error && <Alert tone="error" className="mt-4">{error}</Alert>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => ref.current?.close()}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            variant={variant === "danger" ? "danger" : "primary"}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await run();
                if (r.ok) {
                  setError(null);
                  ref.current?.close();
                  router.refresh();
                } else setError(r.message ?? "Não foi possível concluir.");
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

// ---------------------------------------------------------------------------
// Profissionais
// ---------------------------------------------------------------------------
const REVIEW_ACTIONS: Record<string, { status: string; label: string; variant: "primary" | "outline" | "danger"; needsNote?: boolean }[]> = {
  pendente: [
    { status: "aprovado", label: "Aprovar", variant: "primary" },
    { status: "rejeitado", label: "Rejeitar", variant: "danger", needsNote: true },
  ],
  aprovado: [{ status: "suspenso", label: "Suspender", variant: "danger", needsNote: true }],
  suspenso: [
    { status: "aprovado", label: "Reativar", variant: "primary" },
    { status: "rejeitado", label: "Encerrar cadastro", variant: "outline", needsNote: true },
  ],
  rejeitado: [{ status: "pendente", label: "Reabrir análise", variant: "outline" }],
};

export function ReviewProfessionalForm({ userId, status, name }: { userId: string; status: string; name: string }) {
  const [state, onSubmit, pending] = useFormAction<FormState>(reviewProfessional, {});
  const [choice, setChoice] = useState<string | null>(null);
  const actions = REVIEW_ACTIONS[status] ?? [];
  const selected = actions.find((a) => a.status === choice);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={choice ?? ""} />
      {selected ? (
        <>
          <Field
            id={`note-${userId}`}
            label={selected.needsNote ? "Motivo (enviado ao profissional)" : "Observação (opcional)"}
            error={state.fieldErrors?.note}
          >
            <Textarea id={`note-${userId}`} name="note" maxLength={500} className="min-h-16" required={selected.needsNote} />
          </Field>
          {state.message && !state.fieldErrors && <Alert tone="error">{state.message}</Alert>}
          <div className="flex flex-wrap gap-2">
            <PendingButton pending={pending} size="sm" variant={selected.variant === "danger" ? "danger" : "primary"}>
              Confirmar: {selected.label.toLowerCase()} {name.split(" ")[0]}
            </PendingButton>
            <Button type="button" size="sm" variant="ghost" onClick={() => setChoice(null)}>
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button key={a.status} type="button" size="sm" variant={a.variant} onClick={() => setChoice(a.status)}>
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Papéis e vínculos
// ---------------------------------------------------------------------------
export function AdminRoleButton({ userId, name, isAdmin, isSelf }: { userId: string; name: string; isAdmin: boolean; isSelf: boolean }) {
  if (isSelf) return <p className="text-xs text-white/55">Você não pode remover o próprio acesso.</p>;
  return isAdmin ? (
    <ConfirmButton
      label="Remover administrador"
      icon={<ShieldOff />}
      variant="danger"
      title={`Remover acesso de ${name}?`}
      description="A pessoa perde imediatamente o acesso ao painel administrativo. A alteração fica registrada nos logs."
      confirmLabel="Remover acesso"
      run={() => setAdminRole(userId, false)}
    />
  ) : (
    <ConfirmButton
      label="Tornar administrador"
      icon={<ShieldCheck />}
      title={`Conceder administração a ${name}?`}
      description="Administradores aprovam profissionais, gerenciam vínculos, a biblioteca, horários, conteúdo e veem os logs. Conceda somente a pessoas da equipe da academia."
      confirmLabel="Conceder acesso"
      run={() => setAdminRole(userId, true)}
    />
  );
}

export function EndLinkButton({ trainerId, studentId, trainerName, studentName }: { trainerId: string; studentId: string; trainerName: string; studentName: string }) {
  return (
    <ConfirmButton
      label="Encerrar"
      icon={<Link2Off />}
      variant="ghost"
      title="Encerrar vínculo?"
      description={`${trainerName} deixa de ver os treinos e dados de ${studentName}. Fichas já publicadas continuam com o aluno. Os dois serão notificados.`}
      confirmLabel="Encerrar vínculo"
      run={() => endLink(trainerId, studentId)}
    />
  );
}

export function CreateLinkForm({ trainers, students, defaultTrainer }: { trainers: { id: string; full_name: string }[]; students: { id: string; full_name: string }[]; defaultTrainer?: string | null }) {
  const [state, onSubmit, pending] = useFormAction<FormState>(createLink, {}, { resetOnSuccess: true });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field id="link-trainer" label="Profissional">
        <Select id="link-trainer" name="trainerId" defaultValue={defaultTrainer ?? ""} required>
          <option value="" disabled>
            Escolha
          </option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="link-student" label="Aluno">
        <Select id="link-student" name="studentId" defaultValue="" required>
          <option value="" disabled>
            Escolha
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </Select>
      </Field>
      <PendingButton pending={pending} className="h-12">
        Vincular
      </PendingButton>
      {state.message && (
        <Alert tone={state.ok ? "success" : "error"} className="sm:col-span-3">
          {state.message}
        </Alert>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Exercícios
// ---------------------------------------------------------------------------
export function ExerciseActiveButton({ id, active, name, usage }: { id: string; active: boolean; name: string; usage: number }) {
  return active ? (
    <ConfirmButton
      label="Desativar"
      variant="danger"
      title={`Desativar ${name}?`}
      description={
        <>
          O exercício sai da biblioteca e não pode ser adicionado a novas fichas.
          {usage > 0 && ` Ele aparece em ${usage} ${usage === 1 ? "ficha" : "fichas"}, que continuam funcionando normalmente.`}
        </>
      }
      confirmLabel="Desativar"
      run={() => setExerciseActive(id, false)}
    />
  ) : (
    <ConfirmButton
      label="Reativar"
      icon={<Check />}
      title={`Reativar ${name}?`}
      description="O exercício volta a aparecer na biblioteca para alunos e profissionais."
      confirmLabel="Reativar"
      run={() => setExerciseActive(id, true)}
    />
  );
}

// ---------------------------------------------------------------------------
// Horários
// ---------------------------------------------------------------------------
const DAYS = [
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
  { v: 0, l: "Dom" },
];

export function AddHoursForm() {
  const [state, onSubmit, pending] = useFormAction<FormState>(addHours, {}, { resetOnSuccess: true });
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset>
        <legend className="font-heading text-[0.72rem] uppercase tracking-[0.18em] text-white/70">Dias</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <label key={d.v} className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm has-[:checked]:border-white has-[:checked]:bg-white has-[:checked]:text-black">
              <input type="checkbox" name="weekdays" value={d.v} className="sr-only" />
              {d.l}
            </label>
          ))}
        </div>
        {state.fieldErrors?.weekdays && <p className="mt-1.5 text-xs text-[var(--color-danger)]">{state.fieldErrors.weekdays}</p>}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-[140px_140px_1fr_auto] sm:items-end">
        <Field id="h-open" label="Abre" error={state.fieldErrors?.opensAt}>
          <Input id="h-open" name="opensAt" type="time" required />
        </Field>
        <Field id="h-close" label="Fecha" error={state.fieldErrors?.closesAt}>
          <Input id="h-close" name="closesAt" type="time" required />
        </Field>
        <Field id="h-note" label="Observação (opcional)">
          <Input id="h-note" name="note" maxLength={120} placeholder="Ex.: feriados sob consulta" />
        </Field>
        <PendingButton pending={pending} className="h-12">
          Adicionar
        </PendingButton>
      </div>
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
    </form>
  );
}

export function DeleteHourButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Remover ${label}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteHour(id);
          router.refresh();
        })
      }
    >
      <Trash2 />
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Conteúdo
// ---------------------------------------------------------------------------
export function AnnouncementForm({ initial }: { initial: Partial<Announcement> | null }) {
  const [state, onSubmit, pending] = useFormAction<FormState>(saveAnnouncement, {});
  const [text, setText] = useState(initial?.text ?? "");
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="flex items-start gap-3">
        <Checkbox name="active" defaultChecked={initial?.active ?? false} />
        <span>
          <span className="block text-sm">Exibir o aviso no site</span>
          <span className="text-xs text-white/50">Aparece em todas as páginas públicas; o visitante pode dispensá-lo.</span>
        </span>
      </label>
      <Field id="a-text" label="Texto do aviso" error={state.fieldErrors?.text} hint={`${text.length}/160`}>
        <Textarea id="a-text" name="text" maxLength={160} value={text} onChange={(e) => setText(e.target.value)} className="min-h-16" placeholder="Ex.: Feriado de 15/11: funcionamos das 8h às 14h." />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Field id="a-label" label="Texto do link (opcional)">
          <Input id="a-label" name="linkLabel" maxLength={40} defaultValue={initial?.linkLabel ?? ""} placeholder="Saiba mais" />
        </Field>
        <Field id="a-url" label="Link (opcional)" error={state.fieldErrors?.linkUrl} hint="Uma página do site (/contato) ou link https://">
          <Input id="a-url" name="linkUrl" defaultValue={initial?.linkUrl ?? ""} placeholder="/contato" />
        </Field>
      </div>
      <Field id="a-ends" label="Exibir até (opcional)" error={state.fieldErrors?.endsAt} hint="Depois desta data o aviso some sozinho.">
        <Input id="a-ends" name="endsAt" type="date" defaultValue={initial?.endsAt ?? ""} className="sm:w-56" />
      </Field>
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <PendingButton pending={pending}>Salvar aviso</PendingButton>
    </form>
  );
}

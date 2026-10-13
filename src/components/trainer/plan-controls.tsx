"use client";

import { BookCopy, CopyPlus, GitBranchPlus, Pencil, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { copyToStudent, createNewVersion, deleteDraft, publishPlan, saveAsTemplate, type PublishState } from "@/app/profissional/_actions/plans";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field } from "@/components/ui/field";
import { PendingButton } from "@/components/ui/pending-button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/lib/hooks/use-form-action";

/** Publicação explícita com nota de alteração e confirmação. */
export function PublishForm({ planId, studentName, isUpdate }: { planId: string; studentName: string; isUpdate: boolean }) {
  const [state, onSubmit, pending] = useFormAction<PublishState>(publishPlan, {});
  const dialog = useRef<HTMLDialogElement>(null);
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <>
      <Button size="lg" onClick={() => dialog.current?.showModal()}>
        <Send /> {isUpdate ? "Publicar nova versão" : "Publicar para o aluno"}
      </Button>
      <dialog ref={dialog} className="m-auto w-[min(92vw,460px)] rounded-2xl border border-white/15 bg-[#0c0d0f] p-6 text-white backdrop:bg-black/70">
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="planId" value={planId} />
          <h2 className="font-heading text-xl uppercase tracking-[0.06em]">Publicar para {studentName}?</h2>
          <p className="text-sm text-white/65">
            A ficha fica visível no portal do aluno como prescrição sua, vira o treino atual dele e ele é notificado.
            {isUpdate && " A versão publicada anterior será arquivada."} Depois de publicada, a ficha não pode ser editada — mudanças viram uma nova versão.
          </p>
          <Field id="pub-note" label="Nota da versão (opcional)" hint="Ex.: aumento de volume para membros inferiores">
            <Textarea id="pub-note" name="note" maxLength={500} className="min-h-20" />
          </Field>
          {state.message && <Alert tone="error">{state.message}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => dialog.current?.close()}>
              Cancelar
            </Button>
            <PendingButton pending={pending}>Confirmar publicação</PendingButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

type Student = { id: string; full_name: string };

export function CopyToStudentForm({ planId, students, label = "Usar para um aluno" }: { planId: string; students: Student[]; label?: string }) {
  const [state, onSubmit, pending] = useFormAction<PublishState>(copyToStudent, {});
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={students.length === 0} title={students.length === 0 ? "Nenhum aluno vinculado" : undefined}>
        <CopyPlus /> {label}
      </Button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
      <input type="hidden" name="planId" value={planId} />
      <Field id={`copy-${planId}`} label="Aluno" className="sm:w-64">
        <Select id={`copy-${planId}`} name="studentId" defaultValue="" required>
          <option value="" disabled>
            Escolha o aluno
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </Select>
      </Field>
      <PendingButton pending={pending} className="h-12">
        Criar rascunho
      </PendingButton>
      {state.message && <p className="text-xs text-[var(--color-danger)]">{state.message}</p>}
    </form>
  );
}

export function TrainerPlanActions({
  planId,
  status,
  isTemplate,
  isMine,
  canEdit,
}: {
  planId: string;
  status: string;
  isTemplate: boolean;
  isMine: boolean;
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string } | void>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r && !r.ok) setError(r.message ?? "Não foi possível concluir.");
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/profissional/fichas/${planId}/editar`}>
              <Pencil /> Editar
            </Link>
          </Button>
        )}
        {!isTemplate && status === "publicado" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(async () => (await createNewVersion(planId)) ?? undefined)}>
            <GitBranchPlus /> Nova versão
          </Button>
        )}
        {!isTemplate && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(async () => (await saveAsTemplate(planId)) ?? undefined)}>
            <BookCopy /> Salvar como modelo
          </Button>
        )}
        {isMine && (status === "rascunho" || isTemplate) && (
          <ConfirmAction
            label={isTemplate ? "Excluir modelo" : "Excluir rascunho"}
            icon={<Trash2 />}
            variant="danger"
            title="Excluir?"
            description="Esta ação não pode ser desfeita."
            confirmLabel="Excluir"
            onConfirm={() => deleteDraft(planId)}
          />
        )}
      </div>
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

/** Sugestão enviada pelo aluno para revisão → rascunho do profissional, vinculado à solicitação. */
export function ReviewSuggestionForm({ planId, studentId, requestId }: { planId: string; studentId: string; requestId: string }) {
  const [state, onSubmit, pending] = useFormAction<PublishState>(copyToStudent, {});
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:items-end">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="requestId" value={requestId} />
      <PendingButton pending={pending}>
        <Pencil /> Revisar e criar ficha
      </PendingButton>
      {state.message && <p className="text-xs text-[var(--color-danger)]">{state.message}</p>}
    </form>
  );
}

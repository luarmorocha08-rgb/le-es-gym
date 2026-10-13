"use client";

import { Lock, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { addNote, deleteNote, type TrainerFormState } from "@/app/profissional/_actions/requests";
import { PendingButton } from "@/components/ui/pending-button";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/lib/hooks/use-form-action";

const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export function TrainerNotes({ studentId, notes }: { studentId: string; notes: { id: string; body: string; created_at: string }[] }) {
  const [state, onSubmit, pending] = useFormAction<TrainerFormState>(addNote, {}, { resetOnSuccess: true });
  const [removing, start] = useTransition();
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-xs text-white/45">
        <Lock className="size-3.5" /> Visíveis somente para você. O aluno não tem acesso.
      </p>
      <form onSubmit={onSubmit} className="space-y-2">
        <input type="hidden" name="studentId" value={studentId} />
        <label htmlFor="note-body" className="sr-only">
          Nova observação
        </label>
        <Textarea id="note-body" name="body" maxLength={4000} placeholder="Ex.: reavaliar carga do agachamento na próxima semana" required />
        {(state.fieldErrors?.body || state.message) && <p className="text-xs text-[var(--color-danger)]">{state.fieldErrors?.body ?? state.message}</p>}
        <PendingButton size="sm" pending={pending}>
          Salvar observação
        </PendingButton>
      </form>
      {notes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="flex gap-3 rounded-xl border border-white/10 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-line text-white/80">{n.body}</p>
                <p className="mt-1 text-[0.65rem] text-white/40">{fmt.format(new Date(n.created_at))}</p>
              </div>
              <button type="button" disabled={removing} onClick={() => start(() => deleteNote(n.id, studentId))} className="self-start p-1 text-white/40 hover:text-[var(--color-danger)]" aria-label="Excluir observação">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

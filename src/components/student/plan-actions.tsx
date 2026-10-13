"use client";

import { Archive, Copy, Pencil, RotateCcw, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { archivePlan, deletePlan, duplicatePlan, restorePlan, setCurrentPlan } from "@/app/aluno/_actions/plans";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";

type Props = {
  planId: string;
  canEdit: boolean;
  isCurrent: boolean;
  status: string;
  source: string;
};

export function PlanActions({ planId, canEdit, isCurrent, status, source }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string } | void>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r && !r.ok) setError(r.message ?? "Não foi possível concluir.");
    });

  const archived = status === "arquivado";
  const ownPlan = source !== "profissional";

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {!archived && !isCurrent && (
          <Button size="sm" disabled={pending} onClick={() => run(() => setCurrentPlan(planId))}>
            <Star /> Usar como atual
          </Button>
        )}
        {canEdit && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/aluno/meus-treinos/${planId}/editar`}>
              <Pencil /> Editar
            </Link>
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(async () => (await duplicatePlan(planId)) ?? undefined)}>
          <Copy /> Duplicar
        </Button>
        {archived ? (
          ownPlan && (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => restorePlan(planId))}>
              <RotateCcw /> Restaurar
            </Button>
          )
        ) : (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => archivePlan(planId))}>
            <Archive /> Arquivar
          </Button>
        )}
        {ownPlan && (
          <ConfirmAction
            label="Excluir"
            icon={<Trash2 />}
            variant="danger"
            title="Excluir treino?"
            description="O histórico de treinos já realizados é mantido, mas a ficha será removida."
            confirmLabel="Excluir"
            onConfirm={() => deletePlan(planId)}
          />
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

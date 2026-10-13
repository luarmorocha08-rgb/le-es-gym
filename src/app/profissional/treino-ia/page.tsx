import { BrainCircuit, ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LionHead } from "@/components/brand/emblem";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireArea } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Treino com IA" };

export default async function TrainerAiPage() {
  await requireArea("profissional");
  return (
    <div>
      <PageHeader eyebrow="Assistente" title="Sugestão com IA" />
      <div className="flex flex-col items-center rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_50%_0%,#1b1d21,#050505_70%)] px-6 py-14 text-center">
        <LionHead className="size-16 text-white/80" />
        <p className="mt-6 font-display text-4xl uppercase">Em preparação</p>
        <p className="mt-3 max-w-md text-white/60">
          A geração de sugestões com IA para seus alunos chega na próxima etapa. As sugestões sempre entram como rascunho
          para sua revisão — nunca são publicadas automaticamente.
        </p>
        <Button asChild className="mt-8">
          <Link href="/profissional/criar-treino">
            <ClipboardList /> Montar ficha manualmente
          </Link>
        </Button>
        <p className="mt-8 flex items-center gap-2 text-xs text-white/40">
          <BrainCircuit className="size-3.5" /> Sem chave de IA configurada, nada é simulado.
        </p>
      </div>
    </div>
  );
}

import { BrainCircuit, ClipboardList, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LionHead } from "@/components/brand/emblem";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireArea } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Treino com IA" };

/** O gerador com IA é a Etapa 6; até lá, esta tela é transparente e oferece caminhos reais. */
export default async function AiPage() {
  await requireArea("aluno");
  return (
    <div>
      <PageHeader eyebrow="Assistente" title="Treino com IA" />
      <div className="flex flex-col items-center rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_50%_0%,#1b1d21,#050505_70%)] px-6 py-14 text-center">
        <LionHead className="size-16 text-white/80" />
        <p className="mt-6 font-display text-4xl uppercase">Em preparação</p>
        <p className="mt-3 max-w-md text-white/60">
          O assistente que transforma seus objetivos em uma ficha editável está sendo construído. Ele não vai simular
          respostas: só será liberado quando estiver conectado e validado.
        </p>
        <Alert className="mt-8 max-w-md text-left" title="Enquanto isso">
          Monte seu treino com a biblioteca de exercícios ou peça um treino a um profissional da academia.
        </Alert>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/aluno/criar-treino">
              <ClipboardList /> Montar treino
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/aluno/solicitar-profissional">
              <UserCheck /> Meu Treinador
            </Link>
          </Button>
        </div>
        <p className="mt-8 flex items-center gap-2 text-xs text-white/40">
          <BrainCircuit className="size-3.5" /> Você pode deixar o consentimento de IA pronto em Perfil.
        </p>
      </div>
    </div>
  );
}

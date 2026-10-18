import { ClipboardList, Settings2, UserCheck } from "lucide-react";
import Link from "next/link";
import { RevoMark } from "@/components/brand/emblem";
import { Button } from "@/components/ui/button";

/** Sem chave do provedor: aviso claro, sem simular respostas. */
export function AiNotConfigured({ area }: { area: "aluno" | "profissional" }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_50%_0%,#1b1d21,#050505_70%)] px-6 py-14 text-center">
      <RevoMark className="size-16 text-accent/70" />
      <p className="mt-6 flex items-center gap-2 font-display text-4xl uppercase">
        <Settings2 className="size-7" aria-hidden /> Configuração pendente
      </p>
      <p className="mt-3 max-w-md text-white/60">
        O assistente de IA está pronto, mas a academia ainda não conectou a chave do provedor de inteligência artificial.
        Nenhuma sugestão é gerada ou simulada até lá.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href={area === "aluno" ? "/aluno/criar-treino" : "/profissional/criar-treino"}>
            <ClipboardList /> Montar treino manualmente
          </Link>
        </Button>
        {area === "aluno" && (
          <Button asChild variant="outline">
            <Link href="/aluno/solicitar-profissional">
              <UserCheck /> Pedir a um profissional
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Acesso restrito", robots: { index: false } };

const reasons: Record<string, { title: string; text: string }> = {
  "profissional-pendente": {
    title: "Cadastro profissional em análise",
    text: "Recebemos seu cadastro. A administração da academia vai verificar seus dados e liberar o portal do profissional. Enquanto isso, você pode usar o portal do aluno normalmente.",
  },
  "profissional-suspenso": {
    title: "Acesso profissional suspenso",
    text: "Seu acesso ao portal do profissional está suspenso. Fale com a administração da academia.",
  },
  profissional: {
    title: "Área exclusiva para profissionais",
    text: "Esta área é restrita a profissionais aprovados pela academia.",
  },
  admin: {
    title: "Área administrativa",
    text: "Esta área é restrita a administradores autorizados da academia.",
  },
};

export default async function AccessDeniedPage({ searchParams }: PageProps<"/acesso-negado">) {
  const { motivo } = await searchParams;
  const reason = (typeof motivo === "string" && reasons[motivo]) || {
    title: "Acesso restrito",
    text: "Você não tem permissão para acessar esta página.",
  };
  const viewer = await getViewer();

  return (
    <section className="mx-auto flex min-h-[80svh] max-w-xl flex-col items-center justify-center px-4 pt-24 text-center">
      <span className="grid size-16 place-items-center rounded-2xl border border-white/15 bg-white/[0.04]">
        <ShieldAlert className="size-7" aria-hidden />
      </span>
      <h1 className="mt-8 font-display text-5xl uppercase leading-none sm:text-6xl">{reason.title}</h1>
      <p className="mt-5 text-white/65">{reason.text}</p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href={viewer ? viewer.home : "/login"}>{viewer ? "Ir para minha área" : "Entrar"}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Página inicial</Link>
        </Button>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/auth/setup-notice";
import { SignupForm } from "@/components/auth/signup-form";
import { getViewer } from "@/lib/auth/dal";
import { isAuthConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignupPage({ searchParams }: PageProps<"/cadastro">) {
  const params = await searchParams;
  const configured = isAuthConfigured();
  const viewer = configured ? await getViewer() : null;
  if (viewer) redirect(viewer.home);

  return (
    <div>
      <p className="eyebrow mb-4">Criar conta</p>
      <h1 className="font-display text-6xl uppercase leading-[0.9]">Entre para o bando.</h1>
      <p className="mt-4 text-white/60">Monte seus treinos, acompanhe sua evolução e fale com nossos profissionais.</p>
      <div className="mt-10 space-y-5">
        {!configured && <SetupNotice />}
        <SignupForm defaultProfessional={params.perfil === "profissional"} disabled={!configured} />
      </div>
      <p className="mt-8 text-center text-sm text-white/60">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-white underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "@/components/auth/password-forms";
import { SetupNotice } from "@/components/auth/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ResetRequestPage() {
  const configured = isSupabaseConfigured();
  return (
    <div>
      <p className="eyebrow mb-4">Recuperar acesso</p>
      <h1 className="font-display text-6xl uppercase leading-[0.9]">Esqueceu a senha?</h1>
      <p className="mt-4 text-white/60">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
      <div className="mt-10 space-y-5">
        {!configured && <SetupNotice />}
        <ResetRequestForm disabled={!configured} />
      </div>
      <p className="mt-8 text-center text-sm text-white/60">
        <Link href="/login" className="text-white underline underline-offset-4">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}

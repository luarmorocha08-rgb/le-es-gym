import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { SetupNotice } from "@/components/auth/setup-notice";
import { Alert } from "@/components/ui/alert";
import { getViewer } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/routes";
import { isAuthConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Entrar" };

const errors: Record<string, string> = {
  "link-invalido": "O link é inválido ou expirou. Faça login ou solicite um novo link.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const perfil = params.perfil === "profissional" ? "profissional" : "aluno";
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  const erro = typeof params.erro === "string" ? (errors[params.erro] ?? errors["link-invalido"]) : undefined;
  const passwordChanged = params.senha === "alterada";
  const configured = isAuthConfigured();

  const viewer = configured ? await getViewer() : null;
  if (viewer) redirect(next ?? viewer.home);

  return (
    <div>
      <p className="eyebrow mb-4">{perfil === "profissional" ? "Portal do profissional" : "Portal do aluno"}</p>
      <h1 className="font-display text-6xl uppercase leading-[0.9]">Bem-vindo de volta.</h1>
      <p className="mt-4 text-white/60">
        {perfil === "profissional"
          ? "Acesse seus alunos, solicitações e fichas."
          : "Acesse seus treinos, sua evolução e o assistente de IA."}
      </p>
      <div className="mt-10 space-y-5">
        {!configured && <SetupNotice />}
        {erro && <Alert tone="error">{erro}</Alert>}
        {passwordChanged && <Alert tone="success">Senha alterada. Entre com a nova senha.</Alert>}
        <LoginForm next={next} disabled={!configured} />
      </div>
      <p className="mt-8 text-center text-sm text-white/60">
        Ainda não tem conta?{" "}
        <Link
          href={perfil === "profissional" ? "/cadastro?perfil=profissional" : "/cadastro"}
          className="font-medium text-white underline underline-offset-4"
        >
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}

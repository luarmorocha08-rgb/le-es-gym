import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/auth/password-forms";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Nova senha" };

/** Destino do link de redefinição: o Better Auth valida o link e envia ?token=. */
export default async function NewPasswordPage({ searchParams }: PageProps<"/redefinir-senha">) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;
  return (
    <div>
      <p className="eyebrow mb-4">Recuperar acesso</p>
      <h1 className="font-display text-6xl uppercase leading-[0.9]">Crie uma nova senha.</h1>
      <div className="mt-10">
        {valid ? (
          <NewPasswordForm token={token} />
        ) : (
          <Alert tone="error" title="Link inválido ou expirado">
            <p>
              Solicite um novo link em{" "}
              <Link href="/recuperar-senha" className="underline underline-offset-4">
                recuperar senha
              </Link>
              .
            </p>
          </Alert>
        )}
      </div>
    </div>
  );
}

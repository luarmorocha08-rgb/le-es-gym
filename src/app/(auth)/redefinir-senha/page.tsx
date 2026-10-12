import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/auth/password-forms";
import { Alert } from "@/components/ui/alert";
import { getViewer } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Nova senha" };

export default async function NewPasswordPage() {
  const viewer = await getViewer();
  return (
    <div>
      <p className="eyebrow mb-4">Recuperar acesso</p>
      <h1 className="font-display text-6xl uppercase leading-[0.9]">Crie uma nova senha.</h1>
      <div className="mt-10">
        {viewer ? (
          <NewPasswordForm />
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

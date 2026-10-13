import { Alert } from "@/components/ui/alert";

/** Exibido quando banco/segredo de autenticação não estão configurados. */
export function SetupNotice() {
  return (
    <Alert tone="info" title="Configuração pendente">
      <p>
        O banco de dados ainda não foi conectado neste ambiente. Defina{" "}
        <code className="rounded bg-white/10 px-1">DATABASE_URL</code> e{" "}
        <code className="rounded bg-white/10 px-1">BETTER_AUTH_SECRET</code> no arquivo{" "}
        <code className="rounded bg-white/10 px-1">.env.local</code> (veja o README).
      </p>
    </Alert>
  );
}

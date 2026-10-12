import { Alert } from "@/components/ui/alert";

/** Exibido quando as variáveis do Supabase não estão configuradas. */
export function SetupNotice() {
  return (
    <Alert tone="info" title="Configuração pendente">
      <p>
        A autenticação usa o Supabase, que ainda não foi conectado neste ambiente. Defina{" "}
        <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
        <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> no arquivo{" "}
        <code className="rounded bg-white/10 px-1">.env.local</code> (veja o README).
      </p>
    </Alert>
  );
}

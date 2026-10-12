/**
 * Leitura centralizada de variáveis de ambiente públicas.
 * Variáveis secretas (service role, chaves de IA) são lidas apenas em
 * módulos server-only.
 */
export function getSupabasePublicEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function isSupabaseConfigured() {
  return getSupabasePublicEnv() !== null;
}

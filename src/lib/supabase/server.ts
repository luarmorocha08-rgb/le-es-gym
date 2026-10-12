import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/env";

/**
 * Cliente Supabase com a sessão do usuário (cookies). Respeita RLS.
 * Retorna null quando o Supabase ainda não foi configurado.
 */
export async function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Chamado a partir de um Server Component: o proxy renova a sessão.
        }
      },
    },
  });
}

/** Cliente anônimo (sem cookies) para dados públicos, como horários e equipe. */
export function createPublicClient() {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  return createPlainClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

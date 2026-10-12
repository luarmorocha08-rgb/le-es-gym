import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { homeForRoles, type AppRole } from "./routes";

export type ProfessionalStatus = "pendente" | "aprovado" | "rejeitado" | "suspenso";

export type Viewer = {
  id: string;
  email: string | null;
  fullName: string;
  roles: AppRole[];
  professionalStatus: ProfessionalStatus | null;
  isActiveTrainer: boolean;
  isAdmin: boolean;
  home: string;
};

/**
 * Data Access Layer: lê a sessão (JWT verificado via getClaims) e os papéis
 * do banco. Papéis nunca vêm de metadados editáveis pelo usuário.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // Sessão é sempre por requisição: nunca pré-renderizar páginas que dependem dela.
  await connection();
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return loadViewer(supabase, claims.sub, typeof claims.email === "string" ? claims.email : null);
});

type ServerClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

/** Monta o Viewer a partir do banco usando um cliente já autenticado. */
export async function loadViewer(supabase: ServerClient, id: string, email: string | null): Promise<Viewer> {
  const [profileRes, rolesRes, proRes] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", id),
    supabase.from("professional_profiles").select("status").eq("user_id", id).maybeSingle(),
  ]);

  const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
  const professionalStatus = (proRes.data?.status as ProfessionalStatus | undefined) ?? null;
  const isActiveTrainer = roles.includes("profissional") && professionalStatus === "aprovado";

  return {
    id,
    email,
    fullName: profileRes.data?.full_name ?? "Leão",
    roles,
    professionalStatus,
    isActiveTrainer,
    isAdmin: roles.includes("admin"),
    home: homeForRoles(roles, isActiveTrainer),
  };
}

export type Area = "aluno" | "profissional" | "admin";

/** Garante sessão e permissão para a área; redireciona caso contrário. */
export async function requireArea(area: Area): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=/${area}/dashboard`);

  if (area === "admin" && !viewer.isAdmin) redirect("/acesso-negado?motivo=admin");
  if (area === "profissional" && !viewer.isActiveTrainer) {
    const motivo =
      viewer.professionalStatus === "pendente"
        ? "profissional-pendente"
        : viewer.professionalStatus === "suspenso"
          ? "profissional-suspenso"
          : "profissional";
    redirect(`/acesso-negado?motivo=${motivo}`);
  }
  return viewer;
}

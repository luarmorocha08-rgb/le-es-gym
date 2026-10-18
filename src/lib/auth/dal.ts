import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getAuth } from "@/lib/auth/auth";
import { withUser, type Db } from "@/lib/db";
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
 * Data Access Layer: valida a sessão no banco (Better Auth) e lê os papéis
 * com as permissões do próprio usuário. Papéis nunca vêm do cliente.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // Sessão é sempre por requisição: nunca pré-renderizar páginas que dependem dela.
  await connection();
  const auth = getAuth();
  if (!auth) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return withUser(session.user.id, (db) => loadViewer(db, session.user.id, session.user.email));
});

/** Monta o Viewer usando uma transação já autenticada como o usuário. */
export async function loadViewer(db: Db, id: string, email: string | null): Promise<Viewer> {
  const row = await db.one<{ full_name: string | null; roles: AppRole[] | null; pro_status: ProfessionalStatus | null }>(
    `select p.full_name,
            (select array_agg(role::text) from public.user_roles where user_id = $1) as roles,
            (select status from public.professional_profiles where user_id = $1) as pro_status
       from public.profiles p where p.id = $1`,
    [id],
  );
  const roles = row?.roles ?? [];
  const professionalStatus = row?.pro_status ?? null;
  const isActiveTrainer = roles.includes("profissional") && professionalStatus === "aprovado";
  return {
    id,
    email,
    fullName: row?.full_name ?? "Atleta",
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

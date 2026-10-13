import Link from "next/link";
import type { AuditRow } from "@/lib/admin/queries";

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export const ACTION_LABELS: Record<string, string> = {
  revisar_profissional: "Revisou cadastro profissional",
  conceder_papel: "Concedeu papel",
  remover_papel: "Removeu papel",
  vincular_aluno: "Vinculou aluno",
  desvincular_aluno: "Encerrou vínculo",
  publicar_ficha: "Publicou ficha",
  insert: "Criou",
  update: "Alterou",
  delete: "Removeu",
};

export const ENTITY_LABELS: Record<string, string> = {
  professional_profiles: "cadastro profissional",
  user_roles: "papéis",
  trainer_student_links: "vínculo",
  workout_plans: "ficha",
  exercises: "exercício",
  opening_hours: "horário",
  site_content: "conteúdo do site",
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const STATUS: Record<string, string> = { aprovado: "aprovado", rejeitado: "rejeitado", suspenso: "suspenso", pendente: "reaberto" };

function describe(r: AuditRow) {
  const m = r.metadata ?? {};
  const action = ACTION_LABELS[r.action] ?? r.action;
  const entity = ENTITY_LABELS[r.entity] ?? r.entity;
  const label = typeof m.label === "string" ? m.label : null;
  const parts = [r.action in { insert: 1, update: 1, delete: 1 } ? `${action} ${entity}` : action];
  if (r.target_name) parts.push(`· ${r.target_name}`);
  else if (r.entity === "opening_hours" && label) parts.push(`· ${WEEKDAYS[Number(label)] ?? label}${typeof m.hours === "string" ? ` ${m.hours}` : ""}`);
  else if (label) parts.push(`· ${label}`);
  if (typeof m.status === "string") parts.push(`→ ${STATUS[m.status] ?? m.status}`);
  if (typeof m.role === "string") parts.push(`(${m.role})`);
  if (m.is_active === false) parts.push("(inativo)");
  return parts.join(" ");
}

export function AuditList({ rows, empty }: { rows: AuditRow[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-white/50">{empty}</p>;
  return (
    <ul className="divide-y divide-white/[0.06] text-sm">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <span>
            {describe(r)}
            {typeof r.metadata?.note === "string" && <span className="block text-xs italic text-white/50">“{r.metadata.note}”</span>}
          </span>
          <span className="shrink-0 text-xs text-white/45">
            {r.actor_id ? (
              <Link href={`/admin/usuarios/${r.actor_id}`} className="hover:text-white">
                {r.actor_name ?? "usuário removido"}
              </Link>
            ) : (
              "sistema"
            )}{" "}
            · {fmt.format(new Date(r.created_at))}
          </span>
        </li>
      ))}
    </ul>
  );
}

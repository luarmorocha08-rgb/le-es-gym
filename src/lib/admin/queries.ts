import "server-only";
import { withUser, type Db } from "@/lib/db";

/*
 * Leituras do painel administrativo. Todas rodam como o administrador
 * (withUser → RLS + funções que conferem is_admin()). Dados de saúde dos
 * alunos nunca são lidos aqui.
 */

export function getAdminDashboard(adminId: string) {
  return withUser(adminId, async (db) => {
    const counts = await db.one<{
      users: number; students: number; trainers: number; pending: number; links: number; exercises: number;
      sessions_7d: number; active_students_30d: number; ai_24h: number; ai_errors_24h: number;
    }>(
      `select
         (select count(*)::int from public.profiles) as users,
         (select count(*)::int from public.user_roles where role = 'aluno') as students,
         (select count(*)::int from public.professional_profiles where status = 'aprovado') as trainers,
         (select count(*)::int from public.professional_profiles where status = 'pendente') as pending,
         (select count(*)::int from public.trainer_student_links where status = 'ativo') as links,
         (select count(*)::int from public.exercises where is_active) as exercises,
         (select count(*)::int from public.workout_sessions where status = 'concluida' and finished_at > now() - interval '7 days') as sessions_7d,
         (select count(distinct student_id)::int from public.workout_sessions where status = 'concluida' and finished_at > now() - interval '30 days') as active_students_30d,
         (select count(*)::int from public.ai_generations where created_at > now() - interval '24 hours') as ai_24h,
         (select count(*)::int from public.ai_generations where created_at > now() - interval '24 hours' and status <> 'sucesso') as ai_errors_24h`,
    );
    const signups = await db.query<{ created_at: string }>(
      "select created_at from public.profiles where created_at > now() - interval '12 weeks'",
    );
    const sessions = await db.query<{ finished_at: string }>(
      "select finished_at from public.workout_sessions where status = 'concluida' and finished_at > now() - interval '12 weeks'",
    );
    const pendingPros = await db.query<{ user_id: string; full_name: string; cref: string | null; created_at: string }>(
      `select pp.user_id, p.full_name, pp.cref, pp.created_at
         from public.professional_profiles pp join public.profiles p on p.id = pp.user_id
        where pp.status = 'pendente' order by pp.created_at limit 5`,
    );
    const recent = await listAuditRows(db, { limit: 6 });
    return {
      counts: counts!,
      signups: signups.map((r) => r.created_at),
      sessions: sessions.map((r) => r.finished_at),
      pendingPros,
      recent,
    };
  });
}

// ---------------------------------------------------------------------------
// Profissionais
// ---------------------------------------------------------------------------
export type ProfessionalRow = {
  user_id: string;
  full_name: string;
  email: string;
  status: string;
  cref: string | null;
  bio: string | null;
  specialties: string[];
  is_public: boolean;
  accepts_requests: boolean;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  reviewer_name: string | null;
  students: number;
};

export function listProfessionals(adminId: string, status: string) {
  return withUser(adminId, async (db) => {
    const rows = await db.query<Omit<ProfessionalRow, "email">>(
      `select pp.user_id, p.full_name, pp.status::text, pp.cref, pp.bio, pp.specialties, pp.is_public, pp.accepts_requests,
              pp.created_at, pp.reviewed_at, pp.review_note, r.full_name as reviewer_name,
              (select count(*)::int from public.trainer_student_links l where l.trainer_id = pp.user_id and l.status = 'ativo') as students
         from public.professional_profiles pp
         join public.profiles p on p.id = pp.user_id
         left join public.profiles r on r.id = pp.reviewed_by
        where pp.status = $1::public.professional_status
        order by case when pp.status = 'pendente' then pp.created_at end asc, p.full_name`,
      [status],
    );
    const counts = await db.query<{ status: string; n: number }>(
      "select status::text, count(*)::int as n from public.professional_profiles group by status",
    );
    const emails = await db.query<{ id: string; email: string }>("select id, email from public.admin_user_emails($1)", [rows.map((r) => r.user_id)]);
    const byId = new Map(emails.map((e) => [e.id, e.email]));
    return {
      rows: rows.map((r) => ({ ...r, email: byId.get(r.user_id) ?? "" })),
      counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number>,
    };
  });
}

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------
export type UserRow = {
  id: string;
  full_name: string;
  email: string;
  email_verified: boolean;
  created_at: string;
  roles: string[];
  professional_status: string | null;
  sessions_30d: number;
  last_session: string | null;
  total: number;
};

export const USERS_PAGE_SIZE = 25;

export function listUsers(adminId: string, params: { search?: string; role?: string; page?: number }) {
  const page = Math.max(1, params.page ?? 1);
  return withUser(adminId, async (db) => {
    const rows = await db.query<UserRow>(
      "select * from public.admin_list_users($1, $2, $3, $4)",
      [params.search || null, params.role || null, USERS_PAGE_SIZE, (page - 1) * USERS_PAGE_SIZE],
    );
    return { rows, total: Number(rows[0]?.total ?? 0), page };
  });
}

export function getUserForAdmin(adminId: string, userId: string) {
  return withUser(adminId, async (db) => {
    const user = await db.one<UserRow>("select * from public.admin_list_users(null, null, 1, 0, $1)", [userId]);
    if (!user) return null;
    // Somente dados cadastrais e indicadores — sem dados de saúde
    const profile = await db.one<{
      phone: string | null; goal: string | null; experience_level: string | null; days_per_week: number | null;
      terms_accepted_at: string | null; ai_consent_at: string | null; health_data_consent_at: string | null;
    }>(
      `select phone, goal::text, experience_level::text, days_per_week, terms_accepted_at, ai_consent_at, health_data_consent_at
         from public.profiles where id = $1`,
      [userId],
    );
    const links = await db.query<{ id: string; trainer_id: string; trainer_name: string; student_id: string; student_name: string; created_at: string; created_by_admin: boolean }>(
      `select l.id, l.trainer_id, t.full_name as trainer_name, l.student_id, s.full_name as student_name, l.created_at,
              exists (select 1 from public.user_roles ur where ur.user_id = l.created_by and ur.role = 'admin') as created_by_admin
         from public.trainer_student_links l
         join public.profiles t on t.id = l.trainer_id
         join public.profiles s on s.id = l.student_id
        where l.status = 'ativo' and (l.trainer_id = $1 or l.student_id = $1)
        order by l.created_at desc`,
      [userId],
    );
    const stats = await db.one<{ plans: number; sessions: number; requests: number; ai_uses: number }>(
      `select (select count(*)::int from public.workout_plans where student_id = $1 or author_id = $1) as plans,
              (select count(*)::int from public.workout_sessions where student_id = $1 and status = 'concluida') as sessions,
              (select count(*)::int from public.workout_requests where student_id = $1 or trainer_id = $1) as requests,
              (select count(*)::int from public.ai_generations where user_id = $1) as ai_uses`,
      [userId],
    );
    const audit = await listAuditRows(db, { entityId: userId, limit: 10 });
    return { user, profile, links, stats: stats!, audit };
  });
}

// ---------------------------------------------------------------------------
// Vínculos
// ---------------------------------------------------------------------------
export function listLinks(adminId: string, trainerId?: string | null) {
  return withUser(adminId, async (db) => {
    const links = await db.query<{ id: string; trainer_id: string; trainer_name: string; student_id: string; student_name: string; created_at: string; origin: string }>(
      `select l.id, l.trainer_id, t.full_name as trainer_name, l.student_id, s.full_name as student_name, l.created_at,
              case when l.created_by = l.student_id or l.created_by = l.trainer_id then 'solicitação' else 'administração' end as origin
         from public.trainer_student_links l
         join public.profiles t on t.id = l.trainer_id
         join public.profiles s on s.id = l.student_id
        where l.status = 'ativo' and ($1::uuid is null or l.trainer_id = $1)
        order by t.full_name, s.full_name`,
      [trainerId ?? null],
    );
    const trainers = await db.query<{ id: string; full_name: string }>(
      `select p.id, p.full_name from public.professional_profiles pp join public.profiles p on p.id = pp.user_id
        where pp.status = 'aprovado' order by p.full_name`,
    );
    const students = await db.query<{ id: string; full_name: string }>(
      `select p.id, p.full_name from public.profiles p
         join public.user_roles ur on ur.user_id = p.id and ur.role = 'aluno'
        order by p.full_name limit 1000`,
    );
    return { links, trainers, students };
  });
}

// ---------------------------------------------------------------------------
// Exercícios
// ---------------------------------------------------------------------------
export type AdminExercise = {
  id: string;
  slug: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string;
  mechanics: string | null;
  level: string;
  instructions: string[];
  tips: string[];
  video_url: string | null;
  is_active: boolean;
  usage: number;
  updated_at: string;
};

export function listExercisesAdmin(adminId: string, params: { search?: string; status?: string }) {
  return withUser(adminId, (db) =>
    db.query<AdminExercise>(
      `select e.id, e.slug, e.name, e.primary_muscles, e.secondary_muscles, e.equipment, e.mechanics, e.level::text,
              e.instructions, e.tips, e.video_url, e.is_active, e.updated_at,
              (select count(*)::int from public.workout_exercises we where we.exercise_id = e.id) as usage
         from public.exercises e
        where ($1::text is null or e.name ilike '%' || $1 || '%' or e.slug ilike '%' || $1 || '%')
          and ($2::text is null or ($2 = 'ativos' and e.is_active) or ($2 = 'inativos' and not e.is_active))
        order by e.is_active desc, e.name`,
      [params.search || null, params.status || null],
    ),
  );
}

export function getExerciseAdmin(adminId: string, id: string) {
  return withUser(adminId, (db) =>
    db.one<AdminExercise>(
      `select e.id, e.slug, e.name, e.primary_muscles, e.secondary_muscles, e.equipment, e.mechanics, e.level::text,
              e.instructions, e.tips, e.video_url, e.is_active, e.updated_at,
              (select count(*)::int from public.workout_exercises we where we.exercise_id = e.id) as usage
         from public.exercises e where e.id = $1`,
      [id],
    ),
  );
}

// ---------------------------------------------------------------------------
// Horários e conteúdo
// ---------------------------------------------------------------------------
export function listHoursAdmin(adminId: string) {
  return withUser(adminId, (db) =>
    db.query<{ id: string; weekday: number; opens_at: string; closes_at: string; note: string | null }>(
      "select id, weekday, opens_at::text, closes_at::text, note from public.opening_hours order by weekday, opens_at",
    ),
  );
}

export function getContentAdmin(adminId: string, key: string) {
  return withUser(adminId, (db) =>
    db.one<{ value: unknown; updated_at: string; updated_by_name: string | null }>(
      `select c.value, c.updated_at, p.full_name as updated_by_name
         from public.site_content c left join public.profiles p on p.id = c.updated_by where c.key = $1`,
      [key],
    ),
  );
}

// ---------------------------------------------------------------------------
// Auditoria e uso da IA
// ---------------------------------------------------------------------------
export type AuditRow = {
  id: number;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
  target_name: string | null;
};

async function listAuditRows(
  db: Db,
  opts: { action?: string | null; entity?: string | null; entityId?: string | null; limit: number; offset?: number },
) {
  return db.query<AuditRow & { total: number }>(
    `select a.id, a.action, a.entity, a.entity_id, a.metadata, a.created_at, a.actor_id,
            actor.full_name as actor_name, target.full_name as target_name, count(*) over () as total
       from public.audit_logs a
       left join public.profiles actor on actor.id = a.actor_id
       -- case garante que o cast só acontece para ids no formato uuid (ex.: 'aviso' não é)
       left join public.profiles target on target.id = case when a.entity_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then a.entity_id::uuid end
      where ($1::text is null or a.action = $1)
        and ($2::text is null or a.entity = $2)
        and ($3::text is null or a.entity_id = $3 or a.actor_id::text = $3)
      order by a.created_at desc
      limit $4 offset $5`,
    [opts.action ?? null, opts.entity ?? null, opts.entityId ?? null, opts.limit, opts.offset ?? 0],
  );
}

export const AUDIT_PAGE_SIZE = 40;

export function listAudit(adminId: string, params: { action?: string; entity?: string; page?: number }) {
  const page = Math.max(1, params.page ?? 1);
  return withUser(adminId, async (db) => {
    const rows = await listAuditRows(db, {
      action: params.action || null,
      entity: params.entity || null,
      limit: AUDIT_PAGE_SIZE,
      offset: (page - 1) * AUDIT_PAGE_SIZE,
    });
    const actions = await db.query<{ action: string }>("select distinct action from public.audit_logs order by action");
    return { rows, total: Number(rows[0]?.total ?? 0), page, actions: actions.map((a) => a.action) };
  });
}

export function getAiUsage(adminId: string) {
  return withUser(adminId, async (db) => {
    const byStatus = await db.query<{ status: string; n: number; input_tokens: number; output_tokens: number }>(
      `select status::text, count(*)::int as n, coalesce(sum(input_tokens), 0)::int as input_tokens,
              coalesce(sum(output_tokens), 0)::int as output_tokens
         from public.ai_generations where created_at > now() - interval '30 days' group by status`,
    );
    const byKind = await db.query<{ kind: string; n: number; avg_latency: number | null }>(
      `select kind, count(*)::int as n, avg(latency_ms)::int as avg_latency
         from public.ai_generations where created_at > now() - interval '30 days' group by kind order by n desc`,
    );
    const days = await db.query<{ created_at: string }>(
      "select created_at from public.ai_generations where created_at > now() - interval '12 weeks'",
    );
    const recent = await db.query<{ id: string; kind: string; status: string; model: string | null; error_message: string | null; latency_ms: number | null; created_at: string; user_name: string | null }>(
      `select g.id, g.kind, g.status::text, g.model, g.error_message, g.latency_ms, g.created_at, p.full_name as user_name
         from public.ai_generations g left join public.profiles p on p.id = g.user_id
        order by g.created_at desc limit 15`,
    );
    return { byStatus, byKind, dates: days.map((d) => d.created_at), recent };
  });
}

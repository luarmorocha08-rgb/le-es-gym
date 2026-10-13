import "server-only";
import { withUser } from "@/lib/db";
import { loadPlanDays, type PlanDay } from "@/lib/student/queries";

/*
 * Leituras do portal do profissional, sempre com as permissões do próprio
 * profissional (withUser → RLS): só alunos vinculados, rascunhos próprios,
 * medidas apenas quando o aluno compartilhou.
 */

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------
export function getTrainerDashboard(trainerId: string) {
  return withUser(trainerId, async (db) => {
    const counts = await db.one<{
      students: number; pending: number; adjustments: number; in_progress: number; drafts: number; delivered_30d: number;
    }>(
      `select
         (select count(*)::int from public.trainer_student_links where trainer_id = $1 and status = 'ativo') as students,
         (select count(*)::int from public.workout_requests where trainer_id = $1 and status = 'aguardando_profissional') as pending,
         (select count(*)::int from public.workout_requests where trainer_id = $1 and status = 'ajuste_solicitado') as adjustments,
         (select count(*)::int from public.workout_requests where trainer_id = $1 and status in ('em_analise', 'em_elaboracao')) as in_progress,
         (select count(*)::int from public.workout_plans where author_id = $1 and status = 'rascunho' and not is_template) as drafts,
         (select count(*)::int from public.workout_plans where published_by = $1 and published_at > now() - interval '30 days') as delivered_30d`,
      [trainerId],
    );

    const activity = await db.query<{ id: string; student_id: string; full_name: string; finished_at: string; day_label: string | null; plan_title: string | null; perceived_effort: number | null; feedback: string | null }>(
      `select s.id, s.student_id, p.full_name, s.finished_at, s.day_label, wp.title as plan_title, s.perceived_effort, s.feedback
         from public.workout_sessions s
         join public.trainer_student_links l on l.student_id = s.student_id and l.trainer_id = $1 and l.status = 'ativo'
         join public.profiles p on p.id = s.student_id
         left join public.workout_plans wp on wp.id = s.plan_id
        where s.status = 'concluida'
        order by s.finished_at desc limit 8`,
      [trainerId],
    );

    // Alunos sem treinar há 7+ dias (ou que nunca treinaram desde o vínculo)
    const inactive = await db.query<{ student_id: string; full_name: string; last_session: string | null; linked_at: string }>(
      `select l.student_id, p.full_name, l.created_at as linked_at,
              (select max(finished_at) from public.workout_sessions s where s.student_id = l.student_id and s.status = 'concluida') as last_session
         from public.trainer_student_links l join public.profiles p on p.id = l.student_id
        where l.trainer_id = $1 and l.status = 'ativo'
          and coalesce((select max(finished_at) from public.workout_sessions s where s.student_id = l.student_id and s.status = 'concluida'), l.created_at)
              < now() - interval '7 days'
        order by last_session nulls first limit 6`,
      [trainerId],
    );

    const waiting = await db.query<{ id: string; status: string; full_name: string; updated_at: string }>(
      `select r.id, r.status::text, p.full_name, r.updated_at
         from public.workout_requests r join public.profiles p on p.id = r.student_id
        where r.trainer_id = $1 and r.status in ('aguardando_profissional', 'ajuste_solicitado')
        order by r.updated_at limit 6`,
      [trainerId],
    );

    const published = await db.query<{ published_at: string }>(
      `select published_at from public.workout_plans
        where published_by = $1 and published_at > now() - interval '12 weeks'`,
      [trainerId],
    );

    return { counts: counts!, activity, inactive, waiting, published: published.map((p) => p.published_at) };
  });
}

// ---------------------------------------------------------------------------
// Alunos
// ---------------------------------------------------------------------------
export type StudentRow = {
  id: string;
  full_name: string;
  goal: string | null;
  experience_level: string | null;
  days_per_week: number | null;
  linked_at: string;
  last_session: string | null;
  sessions_28d: number;
  current_plan_title: string | null;
  open_requests: number;
};

export function listStudents(trainerId: string) {
  return withUser(trainerId, (db) =>
    db.query<StudentRow>(
      `select p.id, p.full_name, p.goal::text, p.experience_level::text, p.days_per_week, l.created_at as linked_at,
              (select max(finished_at) from public.workout_sessions s where s.student_id = p.id and s.status = 'concluida') as last_session,
              (select count(*)::int from public.workout_sessions s where s.student_id = p.id and s.status = 'concluida'
                  and s.finished_at > now() - interval '28 days') as sessions_28d,
              (select title from public.workout_plans wp where wp.id = p.current_plan_id) as current_plan_title,
              (select count(*)::int from public.workout_requests r where r.student_id = p.id and r.trainer_id = $1
                  and r.status not in ('concluido', 'cancelado')) as open_requests
         from public.trainer_student_links l join public.profiles p on p.id = l.student_id
        where l.trainer_id = $1 and l.status = 'ativo'
        order by p.full_name`,
      [trainerId],
    ),
  );
}

export function getStudentForTrainer(trainerId: string, studentId: string) {
  return withUser(trainerId, async (db) => {
    const linked = await db.one<{ ok: boolean }>("select public.is_linked_trainer($1) as ok", [studentId]);
    if (!linked?.ok) return null;

    const profile = await db.one<{
      id: string; full_name: string; goal: string | null; experience_level: string | null; days_per_week: number | null;
      session_minutes: number | null; birth_date: string | null; current_plan_id: string | null;
    }>(
      `select id, full_name, goal::text, experience_level::text, days_per_week, session_minutes, birth_date::text, current_plan_id
         from public.profiles where id = $1`,
      [studentId],
    );
    const health = await db.one<{ limitations: string | null; exercises_to_avoid: string | null; preferences: string | null; available_equipment: string[]; priority_muscles: string[] }>(
      "select limitations, exercises_to_avoid, preferences, available_equipment, priority_muscles from public.student_health_info where student_id = $1",
      [studentId],
    );
    const plans = await db.query<{ id: string; title: string; source: string; status: string; author_id: string; author_name: string | null; current_version: number; updated_at: string; published_at: string | null }>(
      `select wp.id, wp.title, wp.source::text, wp.status::text, wp.author_id, a.full_name as author_name, wp.current_version,
              wp.updated_at, wp.published_at
         from public.workout_plans wp left join public.profiles a on a.id = wp.author_id
        where wp.student_id = $1 and not wp.is_template
        order by (wp.status = 'arquivado'), wp.updated_at desc`,
      [studentId],
    );
    const sessions = await db.query<{ id: string; finished_at: string; started_at: string; day_label: string | null; plan_title: string | null; perceived_effort: number | null; feedback: string | null; sets: number; volume: string }>(
      `select s.id, s.finished_at, s.started_at, s.day_label, wp.title as plan_title, s.perceived_effort, s.feedback,
              count(c.id)::int as sets, coalesce(sum(c.reps * coalesce(c.load_kg, 0)), 0) as volume
         from public.workout_sessions s
         left join public.workout_plans wp on wp.id = s.plan_id
         left join public.completed_sets c on c.session_id = s.id
        where s.student_id = $1 and s.status = 'concluida'
        group by s.id, wp.title order by s.finished_at desc limit 60`,
      [studentId],
    );
    const sets = await db.query<{ exercise_id: string; name: string; reps: number; load_kg: string | null; completed_at: string }>(
      `select c.exercise_id, e.name, c.reps, c.load_kg, c.completed_at
         from public.completed_sets c
         join public.workout_sessions s on s.id = c.session_id and s.status = 'concluida'
         join public.exercises e on e.id = c.exercise_id
        where c.student_id = $1 and c.completed_at > now() - interval '365 days'
        order by c.completed_at`,
      [studentId],
    );
    const goals = await db.query<{ id: string; title: string; target_value: string | null; unit: string | null; achieved_at: string | null }>(
      "select id, title, target_value, unit, achieved_at from public.personal_goals where student_id = $1 order by (achieved_at is not null), created_at desc",
      [studentId],
    );
    const progress = await db.query<{ id: string; recorded_on: string; weight_kg: string | null; body_fat_pct: string | null; measurements: Record<string, number>; notes: string | null }>(
      `select id, recorded_on::text, weight_kg, body_fat_pct, measurements, notes
         from public.progress_records where student_id = $1 order by recorded_on desc limit 20`,
      [studentId],
    );
    const notes = await db.query<{ id: string; body: string; created_at: string }>(
      "select id, body, created_at from public.trainer_notes where trainer_id = $1 and student_id = $2 order by created_at desc",
      [trainerId, studentId],
    );
    const requests = await db.query<{ id: string; status: string; goal: string; created_at: string }>(
      `select id, status::text, goal::text, created_at from public.workout_requests
        where student_id = $1 and trainer_id = $2 order by created_at desc`,
      [studentId, trainerId],
    );

    return {
      profile: profile!,
      health,
      plans,
      sessions: sessions.map((s) => ({ ...s, volume: Number(s.volume) })),
      sets: sets.map((s) => ({ exerciseId: s.exercise_id, exerciseName: s.name, reps: s.reps, loadKg: num(s.load_kg), date: s.completed_at })),
      goals: goals.map((g) => ({ ...g, target_value: num(g.target_value) })),
      progress: progress.map((p) => ({ ...p, weight_kg: num(p.weight_kg), body_fat_pct: num(p.body_fat_pct) })),
      notes,
      requests,
    };
  });
}

// ---------------------------------------------------------------------------
// Fichas
// ---------------------------------------------------------------------------
export type TrainerPlanRow = {
  id: string;
  title: string;
  status: string;
  source: string;
  is_template: boolean;
  student_id: string | null;
  student_name: string | null;
  current_version: number;
  updated_at: string;
  published_at: string | null;
  day_count: number;
};

export function listTrainerPlans(trainerId: string) {
  return withUser(trainerId, (db) =>
    db.query<TrainerPlanRow>(
      `select wp.id, wp.title, wp.status::text, wp.source::text, wp.is_template, wp.student_id, p.full_name as student_name,
              wp.current_version, wp.updated_at, wp.published_at,
              (select count(*)::int from public.workout_days d where d.plan_id = wp.id) as day_count
         from public.workout_plans wp left join public.profiles p on p.id = wp.student_id
        where wp.author_id = $1
        order by wp.is_template, (wp.status = 'arquivado'), wp.updated_at desc`,
      [trainerId],
    ),
  );
}

export type TrainerPlanDetail = {
  id: string;
  title: string;
  split_type: string;
  goal: string | null;
  description: string | null;
  progression_notes: string | null;
  status: string;
  source: string;
  is_template: boolean;
  author_id: string;
  student_id: string | null;
  student_name: string | null;
  request_id: string | null;
  based_on_plan_id: string | null;
  current_version: number;
  published_at: string | null;
  updated_at: string;
  days: PlanDay[];
  versions: { version: number; change_note: string | null; created_at: string; author_name: string | null; plan_id: string }[];
  snapshot: unknown;
  based_on_snapshot: unknown;
  can_edit: boolean;
  is_mine: boolean;
};

export function getTrainerPlan(trainerId: string, planId: string) {
  return withUser(trainerId, async (db): Promise<TrainerPlanDetail | null> => {
    const plan = await db.one<Omit<TrainerPlanDetail, "days" | "versions" | "snapshot" | "based_on_snapshot" | "can_edit" | "is_mine">>(
      `select wp.id, wp.title, wp.split_type::text, wp.goal::text, wp.description, wp.progression_notes, wp.status::text,
              wp.source::text, wp.is_template, wp.author_id, wp.student_id, p.full_name as student_name, wp.request_id,
              wp.based_on_plan_id, wp.current_version, wp.published_at, wp.updated_at
         from public.workout_plans wp left join public.profiles p on p.id = wp.student_id
        where wp.id = $1`,
      [planId],
    );
    if (!plan) return null;
    const days = await loadPlanDays(db, planId);
    // histórico da linhagem: esta ficha e as versões que a originaram
    const versions = await db.query<TrainerPlanDetail["versions"][number]>(
      `with recursive lineage as (
         select id, based_on_plan_id from public.workout_plans where id = $1
         union all
         select wp.id, wp.based_on_plan_id from public.workout_plans wp join lineage l on wp.id = l.based_on_plan_id
       )
       select v.version, v.change_note, v.created_at, a.full_name as author_name, v.plan_id
         from public.workout_versions v
         join lineage l on l.id = v.plan_id
         left join public.profiles a on a.id = v.created_by
        order by v.version desc`,
      [planId],
    );
    const snap = await db.one<{ s: unknown; b: unknown }>(
      "select public.get_plan_snapshot($1) as s, case when $2::uuid is null then null else public.get_plan_snapshot($2::uuid) end as b",
      [planId, plan.based_on_plan_id],
    );
    const isMine = plan.author_id === trainerId;
    return {
      ...plan,
      days,
      versions,
      snapshot: snap?.s ?? null,
      based_on_snapshot: snap?.b ?? null,
      is_mine: isMine,
      can_edit: isMine && plan.status !== "publicado" && plan.status !== "arquivado",
    };
  });
}

// ---------------------------------------------------------------------------
// Solicitações
// ---------------------------------------------------------------------------
export type TrainerRequestRow = {
  id: string;
  status: string;
  goal: string;
  student_id: string;
  student_name: string;
  days_per_week: number | null;
  session_minutes: number | null;
  created_at: string;
  updated_at: string;
  plan_id: string | null;
  messages: number;
};

export function listTrainerRequests(trainerId: string) {
  return withUser(trainerId, (db) =>
    db.query<TrainerRequestRow>(
      `select r.id, r.status::text, r.goal::text, r.student_id, p.full_name as student_name, r.days_per_week, r.session_minutes,
              r.created_at, r.updated_at, r.plan_id,
              (select count(*)::int from public.request_messages m where m.request_id = r.id) as messages
         from public.workout_requests r join public.profiles p on p.id = r.student_id
        where r.trainer_id = $1
        order by case r.status when 'aguardando_profissional' then 0 when 'ajuste_solicitado' then 1
                   when 'em_analise' then 2 when 'em_elaboracao' then 3 when 'entregue' then 4 else 5 end,
                 r.updated_at desc`,
      [trainerId],
    ),
  );
}

export function getTrainerRequest(trainerId: string, requestId: string) {
  return withUser(trainerId, async (db) => {
    const request = await db.one<{
      id: string; status: string; goal: string; days_per_week: number | null; session_minutes: number | null; details: string | null;
      student_id: string; student_name: string; plan_id: string | null; plan_title: string | null; created_at: string;
      experience_level: string | null; linked: boolean; drafts: { id: string; title: string; status: string }[];
    }>(
      `select r.id, r.status::text, r.goal::text, r.days_per_week, r.session_minutes, r.details, r.student_id,
              p.full_name as student_name, r.plan_id, wp.title as plan_title, r.created_at, p.experience_level::text,
              public.is_linked_trainer(r.student_id) as linked,
              coalesce((select json_agg(json_build_object('id', d.id, 'title', d.title, 'status', d.status) order by d.updated_at desc)
                          from public.workout_plans d where d.request_id = r.id and d.author_id = $2), '[]') as drafts
         from public.workout_requests r
         join public.profiles p on p.id = r.student_id
         left join public.workout_plans wp on wp.id = r.plan_id
        where r.id = $1 and r.trainer_id = $2`,
      [requestId, trainerId],
    );
    if (!request) return null;
    const events = await db.query<{ id: number; to_status: string; note: string | null; created_at: string; mine: boolean }>(
      "select id, to_status::text, note, created_at, actor_id = $2 as mine from public.request_events where request_id = $1 order by created_at",
      [requestId, trainerId],
    );
    const messages = await db.query<{ id: string; body: string; created_at: string; mine: boolean }>(
      "select id, body, created_at, author_id = $2 as mine from public.request_messages where request_id = $1 order by created_at",
      [requestId, trainerId],
    );
    // Treino do próprio aluno (ex.: sugestão de IA) enviado para revisão — visível só com vínculo ativo
    const review = await db.query<{ id: string; title: string; source: string; split_type: string; updated_at: string }>(
      `select id, title, source::text, split_type, updated_at from public.workout_plans
        where request_id = $1 and author_id = $2 and status = 'em_revisao' order by updated_at desc`,
      [requestId, request.student_id],
    );
    const reviewPlans = await Promise.all(review.map(async (p) => ({ ...p, days: await loadPlanDays(db, p.id) })));
    return { request, events, messages, reviewPlans };
  });
}

// ---------------------------------------------------------------------------
// Acompanhamento
// ---------------------------------------------------------------------------
export function getMonitoring(trainerId: string) {
  return withUser(trainerId, (db) =>
    db.query<{
      id: string; full_name: string; days_per_week: number | null; sessions_28d: number; last_session: string | null;
      avg_effort: string | null; last_feedback: string | null; last_feedback_at: string | null; volume_28d: string;
    }>(
      `select p.id, p.full_name, p.days_per_week,
              count(s.id) filter (where s.finished_at > now() - interval '28 days')::int as sessions_28d,
              max(s.finished_at) as last_session,
              round(avg(s.perceived_effort) filter (where s.finished_at > now() - interval '28 days'), 1) as avg_effort,
              (select s2.feedback from public.workout_sessions s2 where s2.student_id = p.id and s2.status = 'concluida'
                  and s2.feedback is not null order by s2.finished_at desc limit 1) as last_feedback,
              (select s2.finished_at from public.workout_sessions s2 where s2.student_id = p.id and s2.status = 'concluida'
                  and s2.feedback is not null order by s2.finished_at desc limit 1) as last_feedback_at,
              coalesce((select sum(c.reps * coalesce(c.load_kg, 0)) from public.completed_sets c
                          join public.workout_sessions s3 on s3.id = c.session_id and s3.status = 'concluida'
                         where c.student_id = p.id and s3.finished_at > now() - interval '28 days'), 0) as volume_28d
         from public.trainer_student_links l
         join public.profiles p on p.id = l.student_id
         left join public.workout_sessions s on s.student_id = p.id and s.status = 'concluida'
        where l.trainer_id = $1 and l.status = 'ativo'
        group by p.id
        order by max(s.finished_at) nulls first`,
      [trainerId],
    ),
  );
}

export function getMyProfessionalProfile(trainerId: string) {
  return withUser(trainerId, (db) =>
    db.one<{ cref: string | null; bio: string | null; specialties: string[]; is_public: boolean; accepts_requests: boolean; status: string }>(
      "select cref, bio, specialties, is_public, accepts_requests, status::text from public.professional_profiles where user_id = $1",
      [trainerId],
    ),
  );
}

export function listMyTemplates(trainerId: string) {
  return withUser(trainerId, (db) =>
    db.query<{ id: string; title: string; split_type: string }>(
      "select id, title, split_type::text from public.workout_plans where author_id = $1 and is_template order by title",
      [trainerId],
    ),
  );
}

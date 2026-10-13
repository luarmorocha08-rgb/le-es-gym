import "server-only";
import { withUser, type Db } from "@/lib/db";

/*
 * Leituras do portal do aluno. Todas rodam com as permissões do usuário
 * (withUser → RLS), então nenhuma consulta consegue ver dados de terceiros.
 */

export type ExerciseSummary = {
  id: string;
  slug: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string;
  mechanics: string | null;
  level: string;
};

export type ExerciseDetail = ExerciseSummary & {
  instructions: string[];
  tips: string[];
  media_path: string | null;
  video_url: string | null;
};

export type PlanSummary = {
  id: string;
  title: string;
  split_type: string;
  goal: string | null;
  source: "aluno" | "profissional" | "ia";
  status: string;
  author_id: string;
  author_name: string | null;
  updated_at: string;
  published_at: string | null;
  day_count: number;
  exercise_count: number;
  is_current: boolean;
};

export type PlanExercise = {
  id: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  target_load_kg: number | null;
  notes: string | null;
  name: string;
  slug: string;
  primary_muscles: string[];
  equipment: string;
};

export type PlanDay = { id: string; position: number; label: string; name: string; notes: string | null; exercises: PlanExercise[] };

export type PlanDetail = Omit<PlanSummary, "day_count" | "exercise_count"> & {
  description: string | null;
  progression_notes: string | null;
  current_version: number;
  days: PlanDay[];
  can_edit: boolean;
};

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** Dias e exercícios de uma ficha (respeita a RLS da transação recebida). */
export async function loadPlanDays(db: Db, planId: string): Promise<PlanDay[]> {
  const rows = await db.query<Record<string, unknown>>(
    `select d.id, d.position, d.label, d.name, d.notes,
            we.id as we_id, we.exercise_id, we.position as we_position, we.sets, we.reps, we.rest_seconds,
            we.target_load_kg, we.notes as we_notes, e.name as ex_name, e.slug, e.primary_muscles, e.equipment
       from public.workout_days d
       left join public.workout_exercises we on we.day_id = d.id
       left join public.exercises e on e.id = we.exercise_id
      where d.plan_id = $1
      order by d.position, we.position`,
    [planId],
  );
  const days = new Map<string, PlanDay>();
  for (const r of rows) {
    const id = r.id as string;
    if (!days.has(id)) {
      days.set(id, { id, position: r.position as number, label: r.label as string, name: r.name as string, notes: r.notes as string | null, exercises: [] });
    }
    if (r.we_id) {
      days.get(id)!.exercises.push({
        id: r.we_id as string,
        exercise_id: r.exercise_id as string,
        position: r.we_position as number,
        sets: r.sets as number,
        reps: r.reps as string,
        rest_seconds: r.rest_seconds as number,
        target_load_kg: num(r.target_load_kg),
        notes: r.we_notes as string | null,
        name: r.ex_name as string,
        slug: r.slug as string,
        primary_muscles: r.primary_muscles as string[],
        equipment: r.equipment as string,
      });
    }
  }
  return [...days.values()];
}

// ---------------------------------------------------------------------------
// Exercícios
// ---------------------------------------------------------------------------
export function listExercises(userId: string, filters: { q?: string; muscle?: string; equipment?: string } = {}) {
  return withUser(userId, async (db) => {
    const params: unknown[] = [];
    const where = ["is_active"];
    if (filters.q) {
      params.push(`%${filters.q.trim().toLowerCase()}%`);
      where.push(`(lower(name) like $${params.length} or lower(array_to_string(primary_muscles, ' ')) like $${params.length})`);
    }
    if (filters.muscle) {
      params.push(filters.muscle);
      where.push(`($${params.length} = any(primary_muscles) or $${params.length} = any(secondary_muscles))`);
    }
    if (filters.equipment) {
      params.push(filters.equipment);
      where.push(`equipment = $${params.length}`);
    }
    return db.query<ExerciseSummary>(
      `select id, slug, name, primary_muscles, secondary_muscles, equipment, mechanics, level::text
         from public.exercises where ${where.join(" and ")} order by name`,
      params,
    );
  });
}

export function exerciseFacets(userId: string) {
  return withUser(userId, (db) =>
    db.one<{ muscles: string[]; equipment: string[] }>(
      `select array(select distinct unnest(primary_muscles) from public.exercises where is_active order by 1) as muscles,
              array(select distinct equipment from public.exercises where is_active order by 1) as equipment`,
    ),
  );
}

export function getExercise(userId: string, slug: string) {
  return withUser(userId, (db) =>
    db.one<ExerciseDetail>(
      `select id, slug, name, primary_muscles, secondary_muscles, equipment, mechanics, level::text,
              instructions, tips, media_path, video_url
         from public.exercises where slug = $1 and is_active`,
      [slug],
    ),
  );
}

/** Histórico do aluno num exercício (para a página de detalhe). */
export function exerciseHistory(userId: string, exerciseId: string) {
  return withUser(userId, async (db) =>
    (
      await db.query<{ completed_at: string; reps: number; load_kg: string | null }>(
        `select completed_at, reps, load_kg from public.completed_sets
          where student_id = $1 and exercise_id = $2 order by completed_at desc limit 30`,
        [userId, exerciseId],
      )
    ).map((r) => ({ ...r, load_kg: num(r.load_kg) })),
  );
}

// ---------------------------------------------------------------------------
// Fichas
// ---------------------------------------------------------------------------
export function listPlans(userId: string) {
  return withUser(userId, (db) =>
    db.query<PlanSummary>(
      `select p.id, p.title, p.split_type::text, p.goal::text, p.source::text, p.status::text, p.author_id,
              a.full_name as author_name, p.updated_at, p.published_at,
              (select count(*)::int from public.workout_days d where d.plan_id = p.id) as day_count,
              (select count(*)::int from public.workout_exercises we join public.workout_days d on d.id = we.day_id
                where d.plan_id = p.id) as exercise_count,
              (pr.current_plan_id = p.id) as is_current
         from public.workout_plans p
         join public.profiles pr on pr.id = $1
         left join public.profiles a on a.id = p.author_id
        where p.student_id = $1 and not p.is_template
        order by (p.status = 'arquivado'), (pr.current_plan_id = p.id) desc nulls last, p.updated_at desc`,
      [userId],
    ),
  );
}

async function loadPlan(db: Db, userId: string, planId: string): Promise<PlanDetail | null> {
  const plan = await db.one<Omit<PlanDetail, "days" | "can_edit">>(
    `select p.id, p.title, p.split_type::text, p.goal::text, p.source::text, p.status::text, p.author_id,
            a.full_name as author_name, p.updated_at, p.published_at, p.description, p.progression_notes,
            p.current_version, (pr.current_plan_id = p.id) as is_current
       from public.workout_plans p
       join public.profiles pr on pr.id = $1
       left join public.profiles a on a.id = p.author_id
      where p.id = $2 and p.student_id = $1`,
    [userId, planId],
  );
  if (!plan) return null;

  const days = await loadPlanDays(db, planId);

  return {
    ...plan,
    days,
    // Só o próprio aluno edita fichas que ele montou (ou sugestões de IA dele)
    can_edit: plan.author_id === userId && plan.source !== "profissional" && plan.status !== "publicado",
  };
}

export function getPlan(userId: string, planId: string) {
  return withUser(userId, (db) => loadPlan(db, userId, planId));
}

// ---------------------------------------------------------------------------
// Sessões de treino
// ---------------------------------------------------------------------------
export type SessionDetail = {
  id: string;
  status: "em_andamento" | "concluida" | "abandonada";
  started_at: string;
  finished_at: string | null;
  perceived_effort: number | null;
  feedback: string | null;
  plan_id: string | null;
  plan_title: string | null;
  day_id: string | null;
  day_label: string | null;
  day_name: string | null;
  exercises: (PlanExercise & { instructions: string[]; video_url: string | null; previous: { reps: number; load_kg: number | null }[] })[];
  sets: { id: string; workout_exercise_id: string | null; exercise_id: string; set_number: number; reps: number; load_kg: number | null }[];
};

export function getOpenSession(userId: string) {
  return withUser(userId, (db) =>
    db.one<{ id: string; day_label: string | null; plan_title: string | null; started_at: string }>(
      `select s.id, s.day_label, p.title as plan_title, s.started_at
         from public.workout_sessions s left join public.workout_plans p on p.id = s.plan_id
        where s.student_id = $1 and s.status = 'em_andamento'`,
      [userId],
    ),
  );
}

export function getSession(userId: string, sessionId: string) {
  return withUser(userId, async (db): Promise<SessionDetail | null> => {
    const s = await db.one<Omit<SessionDetail, "exercises" | "sets">>(
      `select s.id, s.status::text, s.started_at, s.finished_at, s.perceived_effort, s.feedback,
              s.plan_id, p.title as plan_title, s.day_id, s.day_label, d.name as day_name
         from public.workout_sessions s
         left join public.workout_plans p on p.id = s.plan_id
         left join public.workout_days d on d.id = s.day_id
        where s.id = $1 and s.student_id = $2`,
      [sessionId, userId],
    );
    if (!s) return null;

    const exercises = s.day_id
      ? await db.query<PlanExercise & { target_load_kg: string | null; instructions: string[]; video_url: string | null }>(
          `select we.id, we.exercise_id, we.position, we.sets, we.reps, we.rest_seconds, we.target_load_kg, we.notes,
                  e.name, e.slug, e.primary_muscles, e.equipment, e.instructions, e.video_url
             from public.workout_exercises we join public.exercises e on e.id = we.exercise_id
            where we.day_id = $1 order by we.position`,
          [s.day_id],
        )
      : [];

    // Última sessão concluída de cada exercício (carga anterior)
    const previous = exercises.length
      ? await db.query<{ exercise_id: string; reps: number; load_kg: string | null; set_number: number }>(
          `select c.exercise_id, c.reps, c.load_kg, c.set_number
             from public.completed_sets c
             join (
               select distinct on (cs.exercise_id) cs.exercise_id, cs.session_id
                 from public.completed_sets cs join public.workout_sessions ws on ws.id = cs.session_id
                where cs.student_id = $1 and cs.exercise_id = any($2::uuid[]) and cs.session_id <> $3
                  and ws.status = 'concluida'
                order by cs.exercise_id, cs.completed_at desc
             ) last on last.exercise_id = c.exercise_id and last.session_id = c.session_id
            order by c.exercise_id, c.set_number`,
          [userId, exercises.map((e) => e.exercise_id), sessionId],
        )
      : [];

    const sets = await db.query<SessionDetail["sets"][number] & { load_kg: string | null }>(
      `select id, workout_exercise_id, exercise_id, set_number, reps, load_kg
         from public.completed_sets where session_id = $1 order by completed_at`,
      [sessionId],
    );

    return {
      ...s,
      exercises: exercises.map((e) => ({
        ...e,
        target_load_kg: num(e.target_load_kg),
        previous: previous
          .filter((p) => p.exercise_id === e.exercise_id)
          .map((p) => ({ reps: p.reps, load_kg: num(p.load_kg) })),
      })),
      sets: sets.map((x) => ({ ...x, load_kg: num(x.load_kg) })),
    };
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export function getDashboard(userId: string) {
  return withUser(userId, async (db) => {
    const profile = await db.one<{ current_plan_id: string | null; days_per_week: number | null }>(
      "select current_plan_id, days_per_week from public.profiles where id = $1",
      [userId],
    );

    // Ficha atual: a escolhida pelo aluno, senão a mais recente em uso/publicada
    const currentPlanId =
      profile?.current_plan_id ??
      (
        await db.one<{ id: string }>(
          `select id from public.workout_plans where student_id = $1 and status in ('ativo', 'publicado')
            order by updated_at desc limit 1`,
          [userId],
        )
      )?.id ??
      null;

    const plan = currentPlanId ? await loadPlan(db, userId, currentPlanId) : null;
    const lastDay = plan
      ? await db.one<{ day_id: string | null }>(
          `select day_id from public.workout_sessions where student_id = $1 and plan_id = $2 and status = 'concluida'
            order by finished_at desc limit 1`,
          [userId, plan.id],
        )
      : null;

    const sessions = await db.query<{ id: string; started_at: string; finished_at: string; day_label: string | null; volume: string; sets: number }>(
      `select s.id, s.started_at, s.finished_at, s.day_label,
              coalesce(sum(c.reps * coalesce(c.load_kg, 0)), 0) as volume, count(c.id)::int as sets
         from public.workout_sessions s left join public.completed_sets c on c.session_id = s.id
        where s.student_id = $1 and s.status = 'concluida' and s.finished_at > now() - interval '120 days'
        group by s.id order by s.finished_at desc`,
      [userId],
    );

    const totals = await db.one<{ completed: number; goals_open: number; goals_done: number }>(
      `select (select count(*)::int from public.workout_sessions where student_id = $1 and status = 'concluida') as completed,
              (select count(*)::int from public.personal_goals where student_id = $1 and achieved_at is null) as goals_open,
              (select count(*)::int from public.personal_goals where student_id = $1 and achieved_at is not null) as goals_done`,
      [userId],
    );

    const notifications = await db.query<{ id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }>(
      `select id, title, body, link, read_at, created_at from public.notifications
        where user_id = $1 order by created_at desc limit 5`,
      [userId],
    );

    const requests = await db.query<{ id: string; status: string; trainer_name: string | null; updated_at: string }>(
      `select r.id, r.status::text, t.full_name as trainer_name, r.updated_at
         from public.workout_requests r left join public.profiles t on t.id = r.trainer_id
        where r.student_id = $1 and r.status not in ('concluido', 'cancelado')
        order by r.updated_at desc limit 3`,
      [userId],
    );

    return {
      plan,
      lastCompletedDayId: lastDay?.day_id ?? null,
      daysPerWeek: profile?.days_per_week ?? null,
      sessions: sessions.map((s) => ({ ...s, volume: Number(s.volume) })),
      totals: totals ?? { completed: 0, goals_open: 0, goals_done: 0 },
      notifications,
      requests,
    };
  });
}

// ---------------------------------------------------------------------------
// Evolução
// ---------------------------------------------------------------------------
export function getEvolution(userId: string) {
  return withUser(userId, async (db) => {
    const sets = await db.query<{ exercise_id: string; name: string; reps: number; load_kg: string | null; completed_at: string }>(
      `select c.exercise_id, e.name, c.reps, c.load_kg, c.completed_at
         from public.completed_sets c
         join public.workout_sessions s on s.id = c.session_id and s.status = 'concluida'
         join public.exercises e on e.id = c.exercise_id
        where c.student_id = $1 and c.completed_at > now() - interval '365 days'
        order by c.completed_at`,
      [userId],
    );
    const sessions = await db.query<{ id: string; started_at: string; finished_at: string; day_label: string | null; plan_title: string | null; perceived_effort: number | null; sets: number; volume: string }>(
      `select s.id, s.started_at, s.finished_at, s.day_label, p.title as plan_title, s.perceived_effort,
              count(c.id)::int as sets, coalesce(sum(c.reps * coalesce(c.load_kg, 0)), 0) as volume
         from public.workout_sessions s
         left join public.workout_plans p on p.id = s.plan_id
         left join public.completed_sets c on c.session_id = s.id
        where s.student_id = $1 and s.status = 'concluida'
        group by s.id, p.title order by s.finished_at desc limit 60`,
      [userId],
    );
    const progress = await db.query<{ id: string; recorded_on: string; weight_kg: string | null; body_fat_pct: string | null; measurements: Record<string, number>; notes: string | null; share_with_trainer: boolean }>(
      `select id, recorded_on::text, weight_kg, body_fat_pct, measurements, notes, share_with_trainer
         from public.progress_records where student_id = $1 order by recorded_on desc limit 50`,
      [userId],
    );
    const goals = await db.query<{ id: string; title: string; target_value: string | null; unit: string | null; due_on: string | null; achieved_at: string | null; exercise_name: string | null }>(
      `select g.id, g.title, g.target_value, g.unit, g.due_on::text, g.achieved_at, e.name as exercise_name
         from public.personal_goals g left join public.exercises e on e.id = g.exercise_id
        where g.student_id = $1 order by (g.achieved_at is not null), g.created_at desc`,
      [userId],
    );
    return {
      sets: sets.map((s) => ({ exerciseId: s.exercise_id, exerciseName: s.name, reps: s.reps, loadKg: num(s.load_kg), date: s.completed_at })),
      sessions: sessions.map((s) => ({ ...s, volume: Number(s.volume) })),
      progress: progress.map((p) => ({ ...p, weight_kg: num(p.weight_kg), body_fat_pct: num(p.body_fat_pct) })),
      goals: goals.map((g) => ({ ...g, target_value: num(g.target_value) })),
    };
  });
}

// ---------------------------------------------------------------------------
// Meu Treinador
// ---------------------------------------------------------------------------
export type TrainerCard = {
  user_id: string;
  full_name: string;
  bio: string | null;
  specialties: string[];
  cref: string | null;
  accepts_requests: boolean;
  linked: boolean;
};

export function listTrainers(userId: string) {
  return withUser(userId, (db) =>
    db.query<TrainerCard>(
      `select t.user_id, t.full_name, t.bio, t.specialties, t.cref, t.accepts_requests,
              exists (select 1 from public.trainer_student_links l
                       where l.trainer_id = t.user_id and l.student_id = $1 and l.status = 'ativo') as linked
         from public.public_trainers t order by linked desc, t.full_name`,
      [userId],
    ),
  );
}

export type RequestSummary = {
  id: string;
  status: string;
  goal: string;
  trainer_id: string | null;
  trainer_name: string | null;
  created_at: string;
  updated_at: string;
  plan_id: string | null;
  trainer_messages: number;
};

export function listRequests(userId: string) {
  return withUser(userId, (db) =>
    db.query<RequestSummary>(
      `select r.id, r.status::text, r.goal::text, r.trainer_id, coalesce(t.full_name, tp.full_name) as trainer_name,
              r.created_at, r.updated_at, r.plan_id,
              (select count(*)::int from public.request_messages m where m.request_id = r.id and m.author_id <> $1) as trainer_messages
         from public.workout_requests r
         left join public.public_trainers t on t.user_id = r.trainer_id
         left join public.profiles tp on tp.id = r.trainer_id
        where r.student_id = $1 order by r.updated_at desc`,
      [userId],
    ),
  );
}

export function getRequest(userId: string, requestId: string) {
  return withUser(userId, async (db) => {
    const request = await db.one<{
      id: string; status: string; goal: string; days_per_week: number | null; session_minutes: number | null;
      details: string | null; share_health_info: boolean; trainer_id: string | null; trainer_name: string | null;
      plan_id: string | null; plan_title: string | null; created_at: string;
    }>(
      `select r.id, r.status::text, r.goal::text, r.days_per_week, r.session_minutes, r.details, r.share_health_info,
              r.trainer_id, coalesce(t.full_name, tp.full_name) as trainer_name, r.plan_id, p.title as plan_title, r.created_at
         from public.workout_requests r
         left join public.public_trainers t on t.user_id = r.trainer_id
         left join public.profiles tp on tp.id = r.trainer_id
         left join public.workout_plans p on p.id = r.plan_id
        where r.id = $1 and r.student_id = $2`,
      [requestId, userId],
    );
    if (!request) return null;
    const events = await db.query<{ id: number; from_status: string | null; to_status: string; note: string | null; created_at: string; mine: boolean }>(
      `select id, from_status::text, to_status::text, note, created_at, actor_id = $2 as mine
         from public.request_events where request_id = $1 order by created_at`,
      [requestId, userId],
    );
    const messages = await db.query<{ id: string; body: string; created_at: string; mine: boolean }>(
      `select id, body, created_at, author_id = $2 as mine
         from public.request_messages where request_id = $1 order by created_at`,
      [requestId, userId],
    );
    return { request, events, messages };
  });
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------
export type StudentProfile = {
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  goal: string | null;
  experience_level: string | null;
  days_per_week: number | null;
  session_minutes: number | null;
  ai_consent_at: string | null;
  health_data_consent_at: string | null;
  terms_accepted_at: string | null;
  health: { limitations: string | null; exercises_to_avoid: string | null; preferences: string | null; available_equipment: string[]; priority_muscles: string[] } | null;
};

export function getProfile(userId: string) {
  return withUser(userId, async (db) => {
    const profile = await db.one<Omit<StudentProfile, "health">>(
      `select full_name, phone, birth_date::text, goal::text, experience_level::text, days_per_week, session_minutes,
              ai_consent_at, health_data_consent_at, terms_accepted_at
         from public.profiles where id = $1`,
      [userId],
    );
    if (!profile) return null;
    const health = await db.one<NonNullable<StudentProfile["health"]>>(
      `select limitations, exercises_to_avoid, preferences, available_equipment, priority_muscles
         from public.student_health_info where student_id = $1`,
      [userId],
    );
    return { ...profile, health } satisfies StudentProfile;
  });
}

export function listNotifications(userId: string) {
  return withUser(userId, (db) =>
    db.query<{ id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }>(
      `select id, type, title, body, link, read_at, created_at from public.notifications
        where user_id = $1 order by created_at desc limit 50`,
      [userId],
    ),
  );
}

/** Resumo de uma sessão concluída, com recordes batidos nela. */
export function getSessionSummary(userId: string, sessionId: string) {
  return withUser(userId, async (db) => {
    const rows = await db.query<{ exercise_id: string; name: string; sets: number; reps: number; volume: string; best: string | null; previous_best: string | null }>(
      `select c.exercise_id, e.name, count(*)::int as sets, sum(c.reps)::int as reps,
              sum(c.reps * coalesce(c.load_kg, 0)) as volume, max(c.load_kg) as best,
              (select max(p.load_kg) from public.completed_sets p
                 join public.workout_sessions ps on ps.id = p.session_id and ps.status = 'concluida'
                where p.student_id = $2 and p.exercise_id = c.exercise_id and p.session_id <> $1
                  and p.completed_at < (select started_at from public.workout_sessions where id = $1)) as previous_best
         from public.completed_sets c join public.exercises e on e.id = c.exercise_id
        where c.session_id = $1 and c.student_id = $2
        group by c.exercise_id, e.name order by min(c.completed_at)`,
      [sessionId, userId],
    );
    return rows.map((r) => {
      const best = num(r.best);
      const prev = num(r.previous_best);
      return { ...r, volume: Number(r.volume), best, previous_best: prev, record: best !== null && best > 0 && (prev === null || best > prev) && prev !== null };
    });
  });
}

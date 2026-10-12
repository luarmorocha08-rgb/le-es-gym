-- =============================================================================
-- LEÕES GYM C5 — Schema inicial
-- Tabelas, constraints, índices, funções auxiliares, triggers e políticas RLS.
--
-- Princípios:
--   * Nenhum usuário escolhe o próprio papel. Todo cadastro nasce como "aluno";
--     o papel "profissional" só é concedido por um administrador ao aprovar o
--     cadastro profissional; "admin" só é concedido por outro admin (ou via SQL).
--   * Profissionais só enxergam alunos vinculados a eles (trainer_student_links).
--   * Dados sensíveis (saúde, medidas, fotos) ficam em tabelas próprias com RLS
--     restrita ao titular e aos profissionais vinculados.
--   * Ações importantes passam por funções SECURITY DEFINER que validam
--     permissão, gravam histórico e registram em audit_logs.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('aluno', 'profissional', 'admin');

create type public.professional_status as enum ('pendente', 'aprovado', 'rejeitado', 'suspenso');

create type public.link_status as enum ('ativo', 'encerrado');

create type public.experience_level as enum ('iniciante', 'intermediario', 'avancado');

create type public.training_goal as enum (
  'hipertrofia', 'forca', 'emagrecimento', 'condicionamento', 'saude', 'resistencia', 'outro'
);

create type public.split_type as enum ('ABC', 'ABCD', 'ABCDE', 'FULL_BODY', 'UPPER_LOWER', 'PERSONALIZADO');

-- aluno: montado pelo próprio aluno | profissional: elaborado por treinador | ia: sugestão gerada por IA
create type public.plan_source as enum ('aluno', 'profissional', 'ia');

-- rascunho: em edição | ativo: treino próprio do aluno em uso | em_revisao: enviado a um profissional
-- publicado: aprovado e publicado por profissional | arquivado: fora de uso
create type public.plan_status as enum ('rascunho', 'ativo', 'em_revisao', 'publicado', 'arquivado');

create type public.request_status as enum (
  'aguardando_profissional', 'em_analise', 'em_elaboracao', 'entregue',
  'ajuste_solicitado', 'concluido', 'cancelado'
);

create type public.session_status as enum ('em_andamento', 'concluida', 'abandonada');

create type public.ai_generation_status as enum ('sucesso', 'erro', 'invalido', 'bloqueado');

-- -----------------------------------------------------------------------------
-- Utilitário: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =============================================================================
-- PERFIS E PAPÉIS
-- =============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text check (phone is null or char_length(phone) <= 30),
  birth_date date check (birth_date is null or birth_date > date '1900-01-01'),
  avatar_path text,
  goal public.training_goal,
  experience_level public.experience_level,
  days_per_week smallint check (days_per_week is null or days_per_week between 1 and 7),
  session_minutes smallint check (session_minutes is null or session_minutes between 15 and 240),
  terms_accepted_at timestamptz,
  ai_consent_at timestamptz,          -- consentimento explícito para uso de IA
  health_data_consent_at timestamptz, -- consentimento para tratamento de dados de saúde (LGPD art. 11)
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Perfil básico de todo usuário autenticado.';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
comment on table public.user_roles is 'Papéis concedidos. Escrita somente via funções administrativas.';

create table public.professional_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status public.professional_status not null default 'pendente',
  cref text check (cref is null or char_length(cref) <= 30),
  bio text check (bio is null or char_length(bio) <= 1200),
  specialties text[] not null default '{}',
  photo_path text,
  is_public boolean not null default false, -- aparece em /equipe e em "Meu Treinador"
  accepts_requests boolean not null default true,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger professional_profiles_updated_at before update on public.professional_profiles
  for each row execute function public.set_updated_at();

-- Dados de saúde declarados (sensíveis). Separados do perfil para RLS mais restrita.
create table public.student_health_info (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  limitations text check (limitations is null or char_length(limitations) <= 2000),
  exercises_to_avoid text check (exercises_to_avoid is null or char_length(exercises_to_avoid) <= 1000),
  preferences text check (preferences is null or char_length(preferences) <= 1000),
  priority_muscles text[] not null default '{}',
  available_equipment text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger student_health_info_updated_at before update on public.student_health_info
  for each row execute function public.set_updated_at();

create table public.trainer_student_links (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.link_status not null default 'ativo',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  check (trainer_id <> student_id)
);
create unique index trainer_student_links_active_uniq
  on public.trainer_student_links (trainer_id, student_id) where status = 'ativo';
create index trainer_student_links_student_idx on public.trainer_student_links (student_id) where status = 'ativo';

-- =============================================================================
-- FUNÇÕES AUXILIARES DE AUTORIZAÇÃO (SECURITY DEFINER → evitam recursão de RLS)
-- =============================================================================
create or replace function public.has_role(_role public.app_role)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = _role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.has_role('admin');
$$;

-- Profissional com papel concedido E cadastro aprovado (suspensos perdem acesso)
create or replace function public.is_active_trainer()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.has_role('profissional') and exists (
    select 1 from public.professional_profiles pp
    where pp.user_id = (select auth.uid()) and pp.status = 'aprovado'
  );
$$;

create or replace function public.is_linked_trainer(_student uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_active_trainer() and exists (
    select 1 from public.trainer_student_links l
    where l.trainer_id = (select auth.uid())
      and l.student_id = _student
      and l.status = 'ativo'
  );
$$;

create or replace function public.can_view_student(_student uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select _student = (select auth.uid())
      or public.is_linked_trainer(_student)
      or public.is_admin();
$$;

-- anon também executa: as funções retornam false sem sessão e são usadas em políticas
-- de tabelas com leitura pública (ex.: exercises).
revoke execute on function public.has_role(public.app_role) from public;
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_active_trainer() from public;
revoke execute on function public.is_linked_trainer(uuid) from public;
revoke execute on function public.can_view_student(uuid) from public;
grant execute on function public.has_role(public.app_role) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_active_trainer() to anon, authenticated;
grant execute on function public.is_linked_trainer(uuid) to anon, authenticated;
grant execute on function public.can_view_student(uuid) to anon, authenticated;

-- =============================================================================
-- AUDITORIA
-- =============================================================================
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

-- Uso interno pelas funções SECURITY DEFINER; não exposto a clientes.
create or replace function public.write_audit_log(_action text, _entity text, _entity_id text, _metadata jsonb default '{}'::jsonb)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values ((select auth.uid()), _action, _entity, _entity_id, coalesce(_metadata, '{}'::jsonb));
$$;
revoke execute on function public.write_audit_log(text, text, text, jsonb) from public, anon, authenticated;

-- =============================================================================
-- NOTIFICAÇÕES
-- =============================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null check (char_length(title) <= 160),
  body text check (body is null or char_length(body) <= 1000),
  link text check (link is null or link like '/%'), -- somente rotas internas
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create or replace function public.notify(_user uuid, _type text, _title text, _body text, _link text)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, body, link)
  values (_user, _type, _title, _body, _link);
$$;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;

-- =============================================================================
-- CADASTRO: cria perfil + papel "aluno" ao criar usuário no Auth
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  _name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  _wants_pro boolean := coalesce(new.raw_user_meta_data ->> 'wants_professional', '') = 'true';
begin
  insert into public.profiles (id, full_name, terms_accepted_at)
  values (
    new.id,
    left(coalesce(_name, split_part(coalesce(new.email, 'Aluno'), '@', 1), 'Aluno'), 120),
    case when coalesce(new.raw_user_meta_data ->> 'terms_accepted', '') = 'true' then now() end
  );

  -- Todo usuário começa como aluno. Papel profissional depende de aprovação.
  insert into public.user_roles (user_id, role) values (new.id, 'aluno');

  if _wants_pro then
    insert into public.professional_profiles (user_id, status, cref)
    values (new.id, 'pendente', left(nullif(trim(new.raw_user_meta_data ->> 'cref'), ''), 30));
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bloqueia alteração direta de campos de moderação pelo próprio profissional
create or replace function public.guard_professional_profile()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.review_note is distinct from old.review_note then
    raise exception 'Somente administradores podem alterar o status do cadastro profissional.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger professional_profiles_guard before update on public.professional_profiles
  for each row execute function public.guard_professional_profile();

-- =============================================================================
-- BIBLIOTECA DE EXERCÍCIOS
-- =============================================================================
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  primary_muscles text[] not null check (cardinality(primary_muscles) > 0),
  secondary_muscles text[] not null default '{}',
  equipment text not null,
  mechanics text check (mechanics in ('composto', 'isolado')),
  level public.experience_level not null default 'iniciante',
  instructions text[] not null check (cardinality(instructions) > 0),
  tips text[] not null default '{}',
  media_path text,  -- caminho no bucket "exercise-media"
  video_url text check (video_url is null or video_url ~ '^https://'),
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exercises_primary_muscles_idx on public.exercises using gin (primary_muscles);
create index exercises_equipment_idx on public.exercises (equipment);
create index exercises_name_idx on public.exercises (lower(name));

create trigger exercises_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();

-- =============================================================================
-- FICHAS DE TREINO
-- =============================================================================
create table public.workout_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  trainer_id uuid references public.profiles (id) on delete set null,
  status public.request_status not null default 'aguardando_profissional',
  goal public.training_goal not null,
  days_per_week smallint check (days_per_week between 1 and 7),
  session_minutes smallint check (session_minutes between 15 and 240),
  details text check (details is null or char_length(details) <= 2000),
  share_health_info boolean not null default false, -- aluno autoriza o profissional a ver dados de saúde
  plan_id uuid, -- FK adicionada após workout_plans
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_requests_student_idx on public.workout_requests (student_id, created_at desc);
create index workout_requests_trainer_idx on public.workout_requests (trainer_id, status);

create trigger workout_requests_updated_at before update on public.workout_requests
  for each row execute function public.set_updated_at();

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,      -- quem solicitou
  student_id uuid references public.profiles (id) on delete cascade,            -- aluno alvo
  kind text not null check (kind in ('gerar_treino', 'ajustar_treino', 'substituir_exercicio', 'explicar_exercicio')),
  provider text not null,
  model text not null,
  input jsonb not null,      -- entrada já minimizada (sem nome, e-mail, telefone)
  output jsonb,
  status public.ai_generation_status not null,
  error_message text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  created_at timestamptz not null default now()
);
create index ai_generations_user_idx on public.ai_generations (user_id, created_at desc);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles (id) on delete cascade, -- null = modelo (template)
  author_id uuid not null references public.profiles (id) on delete cascade,
  source public.plan_source not null,
  status public.plan_status not null default 'rascunho',
  is_template boolean not null default false,
  title text not null check (char_length(title) between 2 and 120),
  split_type public.split_type not null default 'PERSONALIZADO',
  goal public.training_goal,
  description text check (description is null or char_length(description) <= 2000),
  progression_notes text check (progression_notes is null or char_length(progression_notes) <= 2000),
  ai_generation_id uuid references public.ai_generations (id) on delete set null,
  request_id uuid references public.workout_requests (id) on delete set null,
  current_version integer not null default 0,
  published_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_template and student_id is null) or (not is_template and student_id is not null)),
  check (not (source = 'ia' and status = 'publicado' and published_by is null))
);
create index workout_plans_student_idx on public.workout_plans (student_id, status);
create index workout_plans_author_idx on public.workout_plans (author_id);

alter table public.workout_requests
  add constraint workout_requests_plan_fk foreign key (plan_id) references public.workout_plans (id) on delete set null;

create trigger workout_plans_updated_at before update on public.workout_plans
  for each row execute function public.set_updated_at();

create table public.workout_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  position smallint not null check (position between 0 and 13),
  label text not null check (char_length(label) between 1 and 12),  -- "A", "B", "Upper"...
  name text not null check (char_length(name) between 1 and 80),    -- "Peito e tríceps"
  notes text check (notes is null or char_length(notes) <= 1000),
  unique (plan_id, position) deferrable initially deferred
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.workout_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position smallint not null check (position between 0 and 59),
  sets smallint not null check (sets between 1 and 12),
  reps text not null check (reps ~ '^[0-9]{1,3}(-[0-9]{1,3})?$|^falha$'), -- "10", "8-12", "falha"
  rest_seconds smallint not null default 60 check (rest_seconds between 0 and 600),
  target_load_kg numeric(6, 2) check (target_load_kg is null or target_load_kg between 0 and 1000),
  notes text check (notes is null or char_length(notes) <= 500),
  unique (day_id, position) deferrable initially deferred
);
create index workout_exercises_exercise_idx on public.workout_exercises (exercise_id);

create table public.workout_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  change_note text check (change_note is null or char_length(change_note) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (plan_id, version)
);

-- Regras de transição de status das fichas (também aplicadas para quem tem acesso direto)
create or replace function public.guard_workout_plan()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  -- Somente as funções publish_workout_plan / admin podem marcar como publicado.
  if new.status = 'publicado' and (tg_op = 'INSERT' or old.status <> 'publicado') then
    if coalesce(current_setting('app.publishing', true), '') <> 'on' then
      raise exception 'Use publish_workout_plan() para publicar uma ficha.' using errcode = '42501';
    end if;
  end if;

  -- Fichas montadas pelo aluno nunca podem ser "publicadas" (não são prescrição profissional).
  if new.status = 'publicado' and new.source = 'aluno' then
    raise exception 'Fichas criadas pelo aluno não podem ser publicadas como prescrição.' using errcode = '42501';
  end if;

  -- Um aluno não pode alterar uma ficha publicada por profissional (só arquivar).
  if tg_op = 'UPDATE' and old.status = 'publicado' and old.author_id <> (select auth.uid())
     and not public.is_admin() then
    if new.status not in ('publicado', 'arquivado')
       or new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.split_type is distinct from old.split_type then
      raise exception 'Fichas publicadas por profissionais só podem ser arquivadas pelo aluno.' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'UPDATE' and (new.source is distinct from old.source
     or new.is_template is distinct from old.is_template
     or new.ai_generation_id is distinct from old.ai_generation_id) then
    raise exception 'Origem da ficha não pode ser alterada.' using errcode = '42501';
  end if;

  if (new.published_by is distinct from (case when tg_op = 'UPDATE' then old.published_by end)
      or new.published_at is distinct from (case when tg_op = 'UPDATE' then old.published_at end)
      or new.current_version is distinct from (case when tg_op = 'UPDATE' then old.current_version else 0 end))
     and coalesce(current_setting('app.publishing', true), '') <> 'on' then
    raise exception 'Dados de publicação são definidos por publish_workout_plan().' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.author_id is distinct from old.author_id then
    raise exception 'O autor da ficha não pode ser alterado.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.student_id is distinct from old.student_id then
    raise exception 'O aluno da ficha não pode ser alterado.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger workout_plans_guard before insert or update on public.workout_plans
  for each row execute function public.guard_workout_plan();

-- Pode editar a estrutura da ficha (dias/exercícios)?
create or replace function public.can_edit_plan(_plan uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workout_plans p
    where p.id = _plan
      and (
        public.is_admin()
        -- autor edita enquanto não publicada (profissional pode editar publicada → nova versão)
        or (p.author_id = (select auth.uid()) and (p.status <> 'publicado' or public.is_active_trainer()))
        -- profissional vinculado edita fichas do aluno que estão em revisão
        or (p.student_id is not null and p.status = 'em_revisao' and public.is_linked_trainer(p.student_id))
      )
  );
$$;

create or replace function public.can_view_plan(_plan uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workout_plans p
    where p.id = _plan
      and (
        p.author_id = (select auth.uid())
        or public.is_admin()
        or (p.student_id = (select auth.uid()) and (p.source <> 'profissional' or p.status in ('publicado', 'arquivado')))
        or (p.student_id is not null and public.is_linked_trainer(p.student_id)
            and (p.status <> 'rascunho' or p.author_id = (select auth.uid())))
      )
  );
$$;

revoke execute on function public.can_edit_plan(uuid) from public, anon;
revoke execute on function public.can_view_plan(uuid) from public, anon;
grant execute on function public.can_edit_plan(uuid) to authenticated;
grant execute on function public.can_view_plan(uuid) to authenticated;

-- Snapshot completo de uma ficha (usado em versões e comparação)
create or replace function public.plan_snapshot(_plan uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'title', p.title,
    'split_type', p.split_type,
    'goal', p.goal,
    'description', p.description,
    'progression_notes', p.progression_notes,
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', d.label, 'name', d.name, 'notes', d.notes,
        'exercises', coalesce((
          select jsonb_agg(jsonb_build_object(
            'exercise_id', we.exercise_id, 'exercise_name', e.name, 'sets', we.sets, 'reps', we.reps,
            'rest_seconds', we.rest_seconds, 'target_load_kg', we.target_load_kg, 'notes', we.notes
          ) order by we.position)
          from public.workout_exercises we join public.exercises e on e.id = we.exercise_id
          where we.day_id = d.id
        ), '[]'::jsonb)
      ) order by d.position)
      from public.workout_days d where d.plan_id = p.id
    ), '[]'::jsonb)
  )
  from public.workout_plans p where p.id = _plan;
$$;
revoke execute on function public.plan_snapshot(uuid) from public, anon, authenticated;

-- Publicação: somente profissional ativo vinculado ao aluno (ou admin).
-- Gera versão imutável, notifica o aluno, atualiza a solicitação e audita.
create or replace function public.publish_workout_plan(_plan uuid, _note text default null)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  _p public.workout_plans%rowtype;
  _version integer;
begin
  select * into _p from public.workout_plans where id = _plan for update;
  if not found then
    raise exception 'Ficha não encontrada.' using errcode = 'P0002';
  end if;
  if _p.is_template or _p.student_id is null then
    raise exception 'Modelos não podem ser publicados para alunos.' using errcode = '22023';
  end if;
  if _p.source = 'aluno' then
    raise exception 'Fichas criadas pelo aluno não podem ser publicadas como prescrição.' using errcode = '42501';
  end if;
  if not (public.is_linked_trainer(_p.student_id) or public.is_admin()) then
    raise exception 'Sem permissão para publicar treinos para este aluno.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.workout_days d join public.workout_exercises we on we.day_id = d.id
    where d.plan_id = _plan
  ) then
    raise exception 'A ficha precisa de pelo menos um exercício.' using errcode = '22023';
  end if;

  _version := _p.current_version + 1;

  insert into public.workout_versions (plan_id, version, snapshot, change_note, created_by)
  values (_plan, _version, public.plan_snapshot(_plan), left(_note, 500), (select auth.uid()));

  -- Publicar uma nova ficha arquiva a ficha profissional publicada anterior do mesmo aluno.
  perform set_config('app.publishing', 'on', true);
  update public.workout_plans
     set status = 'arquivado'
   where student_id = _p.student_id and status = 'publicado' and id <> _plan;

  update public.workout_plans
     set status = 'publicado',
         current_version = _version,
         published_by = (select auth.uid()),
         published_at = now()
   where id = _plan;
  perform set_config('app.publishing', 'off', true);

  if _p.request_id is not null then
    perform set_config('app.request_transition', 'on', true);
    update public.workout_requests r set status = 'entregue', plan_id = _plan
     where r.id = _p.request_id and r.status in ('em_analise', 'em_elaboracao', 'ajuste_solicitado', 'entregue');
    if found then
      insert into public.request_events (request_id, actor_id, to_status, note)
      values (_p.request_id, (select auth.uid()), 'entregue', 'Ficha publicada (versão ' || _version || ')');
    end if;
    perform set_config('app.request_transition', 'off', true);
  end if;

  perform public.notify(_p.student_id, 'treino_publicado', 'Novo treino disponível',
    'Seu profissional publicou a ficha "' || _p.title || '".', '/aluno/meus-treinos');
  perform public.write_audit_log('publicar_ficha', 'workout_plans', _plan::text,
    jsonb_build_object('version', _version, 'student_id', _p.student_id, 'source', _p.source));

  return _version;
end;
$$;
revoke execute on function public.publish_workout_plan(uuid, text) from public, anon;
grant execute on function public.publish_workout_plan(uuid, text) to authenticated;

-- =============================================================================
-- SOLICITAÇÕES AO PROFISSIONAL
-- =============================================================================
create table public.request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.workout_requests (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  from_status public.request_status,
  to_status public.request_status not null,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index request_events_request_idx on public.request_events (request_id, created_at);

create table public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.workout_requests (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index request_messages_request_idx on public.request_messages (request_id, created_at);

create or replace function public.can_access_request(_request uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workout_requests r
    where r.id = _request
      and (
        r.student_id = (select auth.uid())
        or public.is_admin()
        or (r.trainer_id = (select auth.uid()) and public.is_active_trainer())
      )
  );
$$;
revoke execute on function public.can_access_request(uuid) from public, anon;
grant execute on function public.can_access_request(uuid) to authenticated;

-- Máquina de estados das solicitações. Cada transição tem um ator permitido.
create or replace function public.transition_request(_request uuid, _to public.request_status, _note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  _r public.workout_requests%rowtype;
  _uid uuid := (select auth.uid());
  _is_student boolean;
  _is_trainer boolean;
begin
  select * into _r from public.workout_requests where id = _request for update;
  if not found then
    raise exception 'Solicitação não encontrada.' using errcode = 'P0002';
  end if;

  _is_student := _r.student_id = _uid;
  _is_trainer := _r.trainer_id = _uid and public.is_active_trainer();

  if not (
    -- profissional
    (_is_trainer and (_r.status, _to) in (
      ('aguardando_profissional', 'em_analise'),
      ('em_analise', 'em_elaboracao'),
      ('ajuste_solicitado', 'em_elaboracao'),
      ('em_elaboracao', 'entregue'),
      ('entregue', 'concluido')
    ))
    -- aluno
    or (_is_student and (_r.status, _to) in (
      ('entregue', 'ajuste_solicitado'),
      ('entregue', 'concluido'),
      ('aguardando_profissional', 'cancelado'),
      ('em_analise', 'cancelado')
    ))
    or public.is_admin()
  ) then
    raise exception 'Transição de status não permitida.' using errcode = '42501';
  end if;

  -- Ao aceitar (em_analise), o profissional precisa estar vinculado ao aluno.
  if _to = 'em_analise' and not public.is_admin() and not exists (
    select 1 from public.trainer_student_links
    where trainer_id = _r.trainer_id and student_id = _r.student_id and status = 'ativo'
  ) then
    insert into public.trainer_student_links (trainer_id, student_id, created_by)
    values (_r.trainer_id, _r.student_id, _uid);
    perform public.write_audit_log('vincular_aluno', 'trainer_student_links', _r.student_id::text,
      jsonb_build_object('trainer_id', _r.trainer_id, 'origem', 'aceite_de_solicitacao'));
  end if;

  perform set_config('app.request_transition', 'on', true);
  update public.workout_requests set status = _to where id = _request;
  perform set_config('app.request_transition', 'off', true);
  insert into public.request_events (request_id, actor_id, from_status, to_status, note)
  values (_request, _uid, _r.status, _to, left(_note, 1000));

  if (case when _is_student then _r.trainer_id else _r.student_id end) is not null then
  perform public.notify(
    case when _is_student then _r.trainer_id else _r.student_id end,
    'solicitacao_status', 'Solicitação atualizada',
    'Status: ' || replace(_to::text, '_', ' '),
    case when _is_student then '/profissional/solicitacoes' else '/aluno/solicitar-profissional' end
  );
  end if;
end;
$$;
revoke execute on function public.transition_request(uuid, public.request_status, text) from public, anon;
grant execute on function public.transition_request(uuid, public.request_status, text) to authenticated;

-- Valida criação de solicitação pelo aluno e registra evento inicial
create or replace function public.on_request_created()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.trainer_id is not null and not exists (
    select 1 from public.professional_profiles pp
    join public.user_roles ur on ur.user_id = pp.user_id and ur.role = 'profissional'
    where pp.user_id = new.trainer_id and pp.status = 'aprovado' and pp.accepts_requests
  ) then
    raise exception 'Profissional indisponível para solicitações.' using errcode = '22023';
  end if;
  insert into public.request_events (request_id, actor_id, to_status)
  values (new.id, new.student_id, new.status);
  if new.trainer_id is not null then
    perform public.notify(new.trainer_id, 'nova_solicitacao', 'Nova solicitação de treino',
      'Um aluno solicitou um treino personalizado.', '/profissional/solicitacoes');
  end if;
  return new;
end;
$$;

create trigger workout_requests_created after insert on public.workout_requests
  for each row execute function public.on_request_created();

-- Status só muda via transition_request()
create or replace function public.guard_request_update()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.request_transition', true), '') <> 'on' then
    raise exception 'Use transition_request() para alterar o status.' using errcode = '42501';
  end if;
  if new.student_id is distinct from old.student_id or new.trainer_id is distinct from old.trainer_id then
    if not public.is_admin() then
      raise exception 'Participantes da solicitação não podem ser alterados.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger workout_requests_guard before update on public.workout_requests
  for each row execute function public.guard_request_update();

-- =============================================================================
-- EXECUÇÃO DE TREINOS
-- =============================================================================
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid references public.workout_plans (id) on delete set null,
  day_id uuid references public.workout_days (id) on delete set null,
  day_label text,           -- cópia para histórico mesmo se a ficha mudar
  status public.session_status not null default 'em_andamento',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  perceived_effort smallint check (perceived_effort is null or perceived_effort between 1 and 10),
  feedback text check (feedback is null or char_length(feedback) <= 1000),
  check (finished_at is null or finished_at >= started_at)
);
create index workout_sessions_student_idx on public.workout_sessions (student_id, started_at desc);
create unique index workout_sessions_one_open
  on public.workout_sessions (student_id) where status = 'em_andamento';

create table public.completed_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  workout_exercise_id uuid references public.workout_exercises (id) on delete set null,
  set_number smallint not null check (set_number between 1 and 20),
  reps smallint not null check (reps between 0 and 200),
  load_kg numeric(6, 2) check (load_kg is null or load_kg between 0 and 1000),
  completed_at timestamptz not null default now(),
  unique (session_id, workout_exercise_id, set_number)
);
create index completed_sets_student_exercise_idx on public.completed_sets (student_id, exercise_id, completed_at desc);

-- =============================================================================
-- EVOLUÇÃO
-- =============================================================================
create table public.progress_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  recorded_on date not null default current_date,
  weight_kg numeric(5, 2) check (weight_kg is null or weight_kg between 20 and 400),
  body_fat_pct numeric(4, 1) check (body_fat_pct is null or body_fat_pct between 2 and 70),
  measurements jsonb not null default '{}'::jsonb, -- {"cintura_cm": 80, ...}
  photo_path text,  -- bucket privado "progress-photos"
  notes text check (notes is null or char_length(notes) <= 500),
  share_with_trainer boolean not null default false,
  created_at timestamptz not null default now()
);
create index progress_records_student_idx on public.progress_records (student_id, recorded_on desc);

create table public.personal_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  exercise_id uuid references public.exercises (id) on delete set null,
  target_value numeric(8, 2),
  unit text check (unit is null or char_length(unit) <= 16),
  due_on date,
  achieved_at timestamptz,
  created_at timestamptz not null default now()
);
create index personal_goals_student_idx on public.personal_goals (student_id);

create table public.trainer_notes (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trainer_notes_idx on public.trainer_notes (trainer_id, student_id, created_at desc);

create trigger trainer_notes_updated_at before update on public.trainer_notes
  for each row execute function public.set_updated_at();

-- =============================================================================
-- CONTEÚDO INSTITUCIONAL (gerenciado pelo admin, lido publicamente)
-- =============================================================================
create table public.opening_hours (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  opens_at time not null,
  closes_at time not null,
  note text check (note is null or char_length(note) <= 120),
  check (closes_at > opens_at)
);
create index opening_hours_weekday_idx on public.opening_hours (weekday, opens_at);

create table public.site_content (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger site_content_updated_at before update on public.site_content
  for each row execute function public.set_updated_at();

-- =============================================================================
-- FUNÇÕES ADMINISTRATIVAS
-- =============================================================================
create or replace function public.review_professional(_user uuid, _status public.professional_status, _note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Somente administradores.' using errcode = '42501';
  end if;

  update public.professional_profiles
     set status = _status, reviewed_by = (select auth.uid()), reviewed_at = now(), review_note = left(_note, 500)
   where user_id = _user;
  if not found then
    raise exception 'Cadastro profissional não encontrado.' using errcode = 'P0002';
  end if;

  if _status = 'aprovado' then
    insert into public.user_roles (user_id, role, granted_by)
    values (_user, 'profissional', (select auth.uid()))
    on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles where user_id = _user and role = 'profissional';
  end if;

  perform public.notify(_user, 'cadastro_profissional', 'Cadastro profissional atualizado',
    'Status: ' || _status::text, '/profissional/dashboard');
  perform public.write_audit_log('revisar_profissional', 'professional_profiles', _user::text,
    jsonb_build_object('status', _status));
end;
$$;
revoke execute on function public.review_professional(uuid, public.professional_status, text) from public, anon;
grant execute on function public.review_professional(uuid, public.professional_status, text) to authenticated;

create or replace function public.set_user_role(_user uuid, _role public.app_role, _grant boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Somente administradores.' using errcode = '42501';
  end if;
  if _role = 'profissional' then
    raise exception 'Use review_professional() para o papel profissional.' using errcode = '22023';
  end if;
  if not _grant and _role = 'admin' and _user = (select auth.uid()) then
    raise exception 'Você não pode remover seu próprio acesso de administrador.' using errcode = '22023';
  end if;

  if _grant then
    insert into public.user_roles (user_id, role, granted_by) values (_user, _role, (select auth.uid()))
    on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles where user_id = _user and role = _role;
  end if;
  perform public.write_audit_log(case when _grant then 'conceder_papel' else 'remover_papel' end,
    'user_roles', _user::text, jsonb_build_object('role', _role));
end;
$$;
revoke execute on function public.set_user_role(uuid, public.app_role, boolean) from public, anon;
grant execute on function public.set_user_role(uuid, public.app_role, boolean) to authenticated;

create or replace function public.link_trainer_student(_trainer uuid, _student uuid, _active boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Somente administradores.' using errcode = '42501';
  end if;
  if _active then
    if not exists (
      select 1 from public.professional_profiles pp
      join public.user_roles ur on ur.user_id = pp.user_id and ur.role = 'profissional'
      where pp.user_id = _trainer and pp.status = 'aprovado'
    ) then
      raise exception 'Profissional não aprovado.' using errcode = '22023';
    end if;
    insert into public.trainer_student_links (trainer_id, student_id, created_by)
    values (_trainer, _student, (select auth.uid()))
    on conflict (trainer_id, student_id) where status = 'ativo' do nothing;
  else
    update public.trainer_student_links set status = 'encerrado', ended_at = now()
     where trainer_id = _trainer and student_id = _student and status = 'ativo';
  end if;
  perform public.write_audit_log(case when _active then 'vincular_aluno' else 'desvincular_aluno' end,
    'trainer_student_links', _student::text, jsonb_build_object('trainer_id', _trainer));
end;
$$;
revoke execute on function public.link_trainer_student(uuid, uuid, boolean) from public, anon;
grant execute on function public.link_trainer_student(uuid, uuid, boolean) to authenticated;

-- Exportação de dados pessoais (LGPD art. 18, II e V)
create or replace function public.export_my_data()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'roles', (select coalesce(jsonb_agg(ur.role), '[]') from public.user_roles ur where ur.user_id = (select auth.uid())),
    'health_info', (select to_jsonb(h) from public.student_health_info h where h.student_id = (select auth.uid())),
    'workout_plans', (select coalesce(jsonb_agg(public.plan_snapshot(wp.id) || jsonb_build_object('id', wp.id, 'status', wp.status, 'source', wp.source)), '[]')
                       from public.workout_plans wp where wp.student_id = (select auth.uid()) or wp.author_id = (select auth.uid())),
    'workout_sessions', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from public.workout_sessions s where s.student_id = (select auth.uid())),
    'completed_sets', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.completed_sets c where c.student_id = (select auth.uid())),
    'progress_records', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.progress_records r where r.student_id = (select auth.uid())),
    'personal_goals', (select coalesce(jsonb_agg(to_jsonb(g)), '[]') from public.personal_goals g where g.student_id = (select auth.uid())),
    'workout_requests', (select coalesce(jsonb_agg(to_jsonb(q)), '[]') from public.workout_requests q where q.student_id = (select auth.uid())),
    'ai_generations', (select coalesce(jsonb_agg(jsonb_build_object('kind', a.kind, 'created_at', a.created_at, 'input', a.input, 'output', a.output)), '[]')
                       from public.ai_generations a where a.user_id = (select auth.uid()) or a.student_id = (select auth.uid())),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n)), '[]') from public.notifications n where n.user_id = (select auth.uid()))
  );
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.student_health_info enable row level security;
alter table public.trainer_student_links enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_requests enable row level security;
alter table public.ai_generations enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_days enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_versions enable row level security;
alter table public.request_events enable row level security;
alter table public.request_messages enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.completed_sets enable row level security;
alter table public.progress_records enable row level security;
alter table public.personal_goals enable row level security;
alter table public.trainer_notes enable row level security;
alter table public.opening_hours enable row level security;
alter table public.site_content enable row level security;

-- profiles
create policy "profiles: ver próprio, vinculados e admin" on public.profiles
  for select to authenticated using (public.can_view_student(id) or exists (
    -- aluno vê o perfil do profissional vinculado a ele
    select 1 from public.trainer_student_links l
    where l.trainer_id = profiles.id and l.student_id = (select auth.uid()) and l.status = 'ativo'
  ) or exists (
    -- perfis públicos de profissionais aprovados
    select 1 from public.professional_profiles pp
    where pp.user_id = profiles.id and pp.is_public and pp.status = 'aprovado'
  ) or exists (
    -- profissional vê quem lhe enviou solicitação
    select 1 from public.workout_requests r
    where r.student_id = profiles.id and r.trainer_id = (select auth.uid())
  ));
create policy "profiles: atualizar próprio" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admin atualiza" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- user_roles: leitura própria/admin; escrita somente via funções
create policy "user_roles: ver próprios" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- professional_profiles
create policy "professional_profiles: públicos aprovados" on public.professional_profiles
  for select to anon, authenticated using (is_public and status = 'aprovado');
create policy "professional_profiles: próprio e admin" on public.professional_profiles
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin()
    or exists (select 1 from public.trainer_student_links l
               where l.trainer_id = professional_profiles.user_id and l.student_id = (select auth.uid()) and l.status = 'ativo'));
create policy "professional_profiles: solicitar cadastro" on public.professional_profiles
  for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pendente');
create policy "professional_profiles: editar próprio" on public.professional_profiles
  for update to authenticated using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

-- Perfil público (anon) precisa do nome: view segura sem dados pessoais
create view public.public_trainers
with (security_invoker = false) as
  select pp.user_id, p.full_name, pp.bio, pp.specialties, pp.photo_path, pp.cref, pp.accepts_requests
  from public.professional_profiles pp
  join public.profiles p on p.id = pp.user_id
  join public.user_roles ur on ur.user_id = pp.user_id and ur.role = 'profissional'
  where pp.is_public and pp.status = 'aprovado';
grant select on public.public_trainers to anon, authenticated;

-- student_health_info: titular; profissional vinculado; admin NÃO lê saúde por padrão
create policy "health: titular" on public.student_health_info
  for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "health: profissional vinculado" on public.student_health_info
  for select to authenticated using (public.is_linked_trainer(student_id));

-- trainer_student_links
create policy "links: participantes e admin" on public.trainer_student_links
  for select to authenticated using (
    student_id = (select auth.uid()) or trainer_id = (select auth.uid()) or public.is_admin());

-- audit_logs: somente admin lê
create policy "audit: admin lê" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- notifications
create policy "notifications: titular lê" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: titular marca como lida" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: titular apaga" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

-- exercises: leitura pública dos ativos; escrita admin
create policy "exercises: leitura" on public.exercises
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "exercises: admin escreve" on public.exercises
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- workout_requests
create policy "requests: participantes" on public.workout_requests
  for select to authenticated using (public.can_access_request(id));
create policy "requests: aluno cria" on public.workout_requests
  for insert to authenticated with check (
    student_id = (select auth.uid()) and trainer_id is not null
    and status = 'aguardando_profissional' and plan_id is null);
create policy "requests: participantes atualizam detalhes" on public.workout_requests
  for update to authenticated using (public.can_access_request(id)) with check (public.can_access_request(id));

-- ai_generations: titular, aluno alvo e admin leem; inserção somente pelo servidor (service role)
create policy "ai: titular lê" on public.ai_generations
  for select to authenticated using (user_id = (select auth.uid()) or student_id = (select auth.uid()) or public.is_admin());

-- workout_plans
create policy "plans: ver" on public.workout_plans
  for select to authenticated using (
    public.can_view_plan(id) or (is_template and author_id = (select auth.uid())));
create policy "plans: aluno cria próprio" on public.workout_plans
  for insert to authenticated with check (
    author_id = (select auth.uid()) and student_id = (select auth.uid()) and not is_template
    and source in ('aluno', 'ia') and status in ('rascunho', 'ativo'));
create policy "plans: profissional cria para vinculado" on public.workout_plans
  for insert to authenticated with check (
    author_id = (select auth.uid()) and public.is_active_trainer()
    and source in ('profissional', 'ia') and status = 'rascunho'
    and (is_template or public.is_linked_trainer(student_id)));
create policy "plans: editar" on public.workout_plans
  for update to authenticated using (
    public.can_edit_plan(id) or (student_id = (select auth.uid()) and public.can_view_plan(id)))
  with check (public.can_edit_plan(id) or student_id = (select auth.uid()));
create policy "plans: excluir" on public.workout_plans
  for delete to authenticated using (
    public.is_admin()
    or (author_id = (select auth.uid()) and (status = 'rascunho'
        or (source <> 'profissional' and status in ('ativo', 'arquivado')))));

-- workout_days / workout_exercises (herdam da ficha)
create policy "days: ver" on public.workout_days
  for select to authenticated using (public.can_view_plan(plan_id) or exists (
    select 1 from public.workout_plans p where p.id = plan_id and p.is_template and p.author_id = (select auth.uid())));
create policy "days: editar" on public.workout_days
  for all to authenticated using (public.can_edit_plan(plan_id)) with check (public.can_edit_plan(plan_id));

create policy "exercises_in_plan: ver" on public.workout_exercises
  for select to authenticated using (exists (
    select 1 from public.workout_days d where d.id = day_id and (public.can_view_plan(d.plan_id) or exists (
      select 1 from public.workout_plans p where p.id = d.plan_id and p.is_template and p.author_id = (select auth.uid())))));
create policy "exercises_in_plan: editar" on public.workout_exercises
  for all to authenticated using (exists (
    select 1 from public.workout_days d where d.id = day_id and public.can_edit_plan(d.plan_id)))
  with check (exists (
    select 1 from public.workout_days d where d.id = day_id and public.can_edit_plan(d.plan_id)));

-- workout_versions: leitura de quem vê a ficha; escrita só via publish_workout_plan
create policy "versions: ver" on public.workout_versions
  for select to authenticated using (public.can_view_plan(plan_id));

-- request_events / messages
create policy "request_events: participantes" on public.request_events
  for select to authenticated using (public.can_access_request(request_id));
create policy "request_messages: participantes leem" on public.request_messages
  for select to authenticated using (public.can_access_request(request_id));
create policy "request_messages: participantes escrevem" on public.request_messages
  for insert to authenticated with check (
    author_id = (select auth.uid()) and public.can_access_request(request_id));

-- workout_sessions / completed_sets
create policy "sessions: ver" on public.workout_sessions
  for select to authenticated using (public.can_view_student(student_id));
create policy "sessions: aluno registra" on public.workout_sessions
  for insert to authenticated with check (
    student_id = (select auth.uid()) and (plan_id is null or public.can_view_plan(plan_id)));
create policy "sessions: aluno atualiza" on public.workout_sessions
  for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "sessions: aluno exclui" on public.workout_sessions
  for delete to authenticated using (student_id = (select auth.uid()));

create policy "sets: ver" on public.completed_sets
  for select to authenticated using (public.can_view_student(student_id));
create policy "sets: aluno registra" on public.completed_sets
  for insert to authenticated with check (
    student_id = (select auth.uid()) and exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.student_id = (select auth.uid()) and s.status = 'em_andamento'));
create policy "sets: aluno corrige" on public.completed_sets
  for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "sets: aluno exclui" on public.completed_sets
  for delete to authenticated using (student_id = (select auth.uid()));

-- progress_records: titular; profissional vinculado só quando compartilhado
create policy "progress: titular" on public.progress_records
  for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "progress: profissional vinculado (compartilhado)" on public.progress_records
  for select to authenticated using (share_with_trainer and public.is_linked_trainer(student_id));

-- personal_goals
create policy "goals: titular" on public.personal_goals
  for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "goals: profissional vinculado lê" on public.personal_goals
  for select to authenticated using (public.is_linked_trainer(student_id));

-- trainer_notes: privadas do profissional autor
create policy "trainer_notes: autor" on public.trainer_notes
  for all to authenticated using (trainer_id = (select auth.uid()) and public.is_linked_trainer(student_id))
  with check (trainer_id = (select auth.uid()) and public.is_linked_trainer(student_id));

-- opening_hours / site_content: leitura pública; escrita admin
create policy "hours: leitura pública" on public.opening_hours
  for select to anon, authenticated using (true);
create policy "hours: admin escreve" on public.opening_hours
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "site_content: leitura pública" on public.site_content
  for select to anon, authenticated using (true);
create policy "site_content: admin escreve" on public.site_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- STORAGE (buckets privados; caminho sempre começa com o id do usuário)
-- =============================================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
      ('exercise-media', 'exercise-media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']),
      ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
      ('site-media', 'site-media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
    on conflict (id) do nothing;

    execute $p$
      create policy "avatars: dono escreve" on storage.objects for all to authenticated
        using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
        with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy "progress: dono" on storage.objects for all to authenticated
        using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
        with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$;
    execute $p$
      create policy "exercise-media: admin escreve" on storage.objects for all to authenticated
        using (bucket_id = 'exercise-media' and public.is_admin())
        with check (bucket_id = 'exercise-media' and public.is_admin())
    $p$;
    execute $p$
      create policy "site-media: admin escreve" on storage.objects for all to authenticated
        using (bucket_id = 'site-media' and public.is_admin())
        with check (bucket_id = 'site-media' and public.is_admin())
    $p$;
  end if;
end;
$$;

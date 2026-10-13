-- =============================================================================
-- Etapa 5 — Portal do profissional
--   * Fichas publicadas ficam imutáveis: alterações viram uma nova versão em
--     rascunho (based_on_plan_id) que, ao ser publicada, arquiva a anterior.
--     Assim o aluno nunca vê edições ainda não revisadas.
--   * Publicar define a ficha como "treino atual" do aluno.
-- =============================================================================

alter table public.workout_plans
  add column based_on_plan_id uuid references public.workout_plans (id) on delete set null;
create index workout_plans_based_on_idx on public.workout_plans (based_on_plan_id);

-- Estrutura (dias/exercícios) só é editável fora do status publicado
create or replace function public.can_edit_plan(_plan uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workout_plans p
    where p.id = _plan
      and p.status <> 'publicado'
      and (
        public.is_admin()
        or p.author_id = (select auth.uid())
        -- profissional vinculado edita fichas do aluno que estão em revisão
        or (p.student_id is not null and p.status = 'em_revisao' and public.is_linked_trainer(p.student_id))
      )
  );
$$;

-- Snapshot legível por quem pode ver a ficha (comparação de versões)
create or replace function public.get_plan_snapshot(_plan uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.workout_plans p
    where p.id = _plan and (p.author_id = (select auth.uid()) or public.can_view_plan(_plan))
  ) then
    return null;
  end if;
  return public.plan_snapshot(_plan);
end;
$$;
revoke execute on function public.get_plan_snapshot(uuid) from public, anon;
grant execute on function public.get_plan_snapshot(uuid) to authenticated;

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
  if _p.status = 'publicado' then
    raise exception 'Esta ficha já está publicada. Crie uma nova versão para alterá-la.' using errcode = '22023';
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

  -- numeração contínua entre versões derivadas
  _version := greatest(
    _p.current_version,
    coalesce((select current_version from public.workout_plans where id = _p.based_on_plan_id), 0)
  ) + 1;

  insert into public.workout_versions (plan_id, version, snapshot, change_note, created_by)
  values (_plan, _version, public.plan_snapshot(_plan), left(_note, 500), (select auth.uid()));

  perform set_config('app.publishing', 'on', true);
  -- a prescrição publicada anterior do aluno é arquivada
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

  update public.profiles set current_plan_id = _plan where id = _p.student_id;

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
    'Seu profissional publicou a ficha "' || _p.title || '".', '/aluno/meus-treinos/' || _plan);
  perform public.write_audit_log('publicar_ficha', 'workout_plans', _plan::text,
    jsonb_build_object('version', _version, 'student_id', _p.student_id, 'source', _p.source,
                       'based_on', _p.based_on_plan_id));

  return _version;
end;
$$;
revoke execute on function public.publish_workout_plan(uuid, text) from public, anon;
grant execute on function public.publish_workout_plan(uuid, text) to authenticated;

-- based_on_plan_id é definido na criação e não muda
create or replace function public.guard_plan_lineage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.based_on_plan_id is distinct from old.based_on_plan_id then
    raise exception 'A origem da versão não pode ser alterada.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger workout_plans_lineage before update of based_on_plan_id on public.workout_plans
  for each row execute function public.guard_plan_lineage();

create index workout_sessions_finished_idx on public.workout_sessions (student_id, finished_at desc) where status = 'concluida';

-- =============================================================================
-- Etapa 4 — Portal do aluno
-- =============================================================================

-- Ficha escolhida pelo aluno como "treino atual" (dashboard e botão INICIAR TREINO)
alter table public.profiles
  add column current_plan_id uuid references public.workout_plans (id) on delete set null;

-- Dados de saúde só podem ser gravados após consentimento explícito (LGPD art. 11)
drop policy "health: titular" on public.student_health_info;

create policy "health: titular lê" on public.student_health_info
  for select to authenticated using (student_id = (select auth.uid()));
create policy "health: titular exclui" on public.student_health_info
  for delete to authenticated using (student_id = (select auth.uid()));
create policy "health: titular grava com consentimento" on public.student_health_info
  for insert to authenticated with check (
    student_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.health_data_consent_at is not null));
create policy "health: titular atualiza com consentimento" on public.student_health_info
  for update to authenticated using (student_id = (select auth.uid()))
  with check (
    student_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.health_data_consent_at is not null));

-- Revogar o consentimento de saúde apaga os dados de saúde declarados
create or replace function public.on_health_consent_revoked()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if old.health_data_consent_at is not null and new.health_data_consent_at is null then
    delete from public.student_health_info where student_id = new.id;
  end if;
  return new;
end;
$$;

create trigger profiles_health_consent_revoked after update of health_data_consent_at on public.profiles
  for each row execute function public.on_health_consent_revoked();

-- Consultas frequentes do portal
create index completed_sets_session_idx on public.completed_sets (session_id);
create index workout_days_plan_idx on public.workout_days (plan_id, position);
create index workout_exercises_day_idx on public.workout_exercises (day_id, position);

-- A política de leitura das fichas precisa reconhecer o autor diretamente:
-- em INSERT ... RETURNING a função can_view_plan() ainda não enxerga a linha nova.
drop policy "plans: ver" on public.workout_plans;
create policy "plans: ver" on public.workout_plans
  for select to authenticated using (
    author_id = (select auth.uid()) or public.can_view_plan(id));

-- Mesmo caso para solicitações criadas pelo aluno (INSERT ... RETURNING)
drop policy "requests: participantes" on public.workout_requests;
create policy "requests: participantes" on public.workout_requests
  for select to authenticated using (
    student_id = (select auth.uid()) or public.can_access_request(id));

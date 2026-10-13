-- =============================================================================
-- Testes de autorização (RLS + funções). Executar com scripts/test-db.sh
-- Cada bloco troca o usuário simulado (auth.uid()) e verifica o que é
-- permitido e o que deve ser bloqueado.
-- =============================================================================
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create schema if not exists tests;
grant usage on schema tests to authenticated, anon;

create or replace function tests.expect_error(_sql text, _label text)
returns void language plpgsql as $$
begin
  begin
    execute _sql;
  exception when others then
    raise notice 'OK (bloqueado): % — %', _label, sqlerrm;
    return;
  end;
  raise exception 'FALHA: deveria ter sido bloqueado: %', _label;
end;
$$;

create or replace function tests.expect_count(_sql text, _expected bigint, _label text)
returns void language plpgsql as $$
declare _n bigint;
begin
  execute 'select count(*) from (' || _sql || ') q' into _n;
  if _n <> _expected then
    raise exception 'FALHA: % — esperado %, obtido %', _label, _expected, _n;
  end if;
  raise notice 'OK: % (%)', _label, _n;
end;
$$;
grant execute on all functions in schema tests to authenticated, anon;

create or replace function tests.login(_uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('app.user_id', coalesce(_uid::text, ''), false);
end;
$$;
grant execute on function tests.login(uuid) to authenticated, anon;

-- Usuários (como o Better Auth cria) ------------------------------------------
insert into auth.users (id, name, email, "emailVerified") values
  ('00000000-0000-0000-0000-00000000000a', 'Admin Teste', 'admin@teste.local', true),
  ('00000000-0000-0000-0000-0000000000f1', 'Profissional Um', 'pro1@teste.local', true),
  ('00000000-0000-0000-0000-0000000000f2', 'Profissional Dois', 'pro2@teste.local', true),
  ('00000000-0000-0000-0000-0000000000a1', 'Aluno Um', 'aluno1@teste.local', true),
  ('00000000-0000-0000-0000-0000000000a2', '', 'aluno2@teste.local', true);
insert into auth.account ("accountId", "providerId", "userId", password, "updatedAt")
values ('00000000-0000-0000-0000-0000000000a1', 'credential', '00000000-0000-0000-0000-0000000000a1', 'hash-secreto', now());

-- bootstrap do primeiro admin (feito manualmente via SQL no projeto real)
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin');

-- pós-cadastro feito pela própria sessão de cada usuário (como em actions.ts)
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000f1');
insert into public.professional_profiles (user_id, status, cref) values ('00000000-0000-0000-0000-0000000000f1', 'pendente', '000000-G/SP');
select tests.login('00000000-0000-0000-0000-0000000000f2');
insert into public.professional_profiles (user_id, status) values ('00000000-0000-0000-0000-0000000000f2', 'pendente');
select tests.login('00000000-0000-0000-0000-0000000000a1');
update public.profiles set terms_accepted_at = now() where id = '00000000-0000-0000-0000-0000000000a1';
reset role;

do $$ begin
  perform tests.expect_count($q$select 1 from public.profiles$q$, 5, 'trigger criou 5 perfis');
  perform tests.expect_count($q$select 1 from public.profiles where full_name = 'aluno2'$q$, 1, 'nome vazio usa parte do e-mail');
  perform tests.expect_count($q$select 1 from public.user_roles where role = 'aluno'$q$, 5, 'todos começam como aluno');
  perform tests.expect_count($q$select 1 from public.professional_profiles where status = 'pendente'$q$, 2, '2 cadastros profissionais pendentes');
  perform tests.expect_count($q$select 1 from public.profiles where terms_accepted_at is not null$q$, 1, 'aceite de termos registrado');
end $$;

-- Schema auth é inacessível às sessões de usuário ------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform tests.expect_error($q$select password from auth.account$q$, 'usuário ler hashes de senha');
  perform tests.expect_error($q$select email from auth.users$q$, 'usuário listar e-mails de auth.users');
  perform tests.expect_error($q$select token from auth.session$q$, 'usuário ler tokens de sessão');
end $$;
reset role;
set role anon;
do $$ begin
  perform tests.expect_error($q$select token from auth.session$q$, 'anônimo ler tokens de sessão');
end $$;
reset role;

-- ALUNO 1 ----------------------------------------------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform tests.expect_count($q$select 1 from public.profiles$q$, 1, 'aluno vê só o próprio perfil');
  perform tests.expect_error($q$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000a1', 'admin')$q$, 'aluno se promover a admin');
  perform tests.expect_error($q$select public.set_user_role('00000000-0000-0000-0000-0000000000a1', 'admin', true)$q$, 'aluno usar set_user_role');
  perform tests.expect_error($q$insert into public.professional_profiles (user_id, status) values ('00000000-0000-0000-0000-0000000000a1', 'aprovado')$q$, 'aluno criar cadastro profissional já aprovado');
  perform tests.expect_count($q$select 1 from public.exercises$q$, (select count(*) from public.exercises), 'aluno lê a biblioteca');
  perform tests.expect_error($q$insert into public.exercises (slug, name, primary_muscles, equipment, instructions) values ('x-y', 'Teste', '{peito}', 'barra', '{a}')$q$, 'aluno criar exercício');
  perform tests.expect_count($q$select 1 from public.public_trainers$q$, 0, 'nenhum profissional público antes da aprovação');
  perform tests.expect_error($q$insert into public.workout_requests (student_id, trainer_id, goal) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'hipertrofia')$q$, 'solicitar a profissional não aprovado');
end $$;
do $$ begin
  perform tests.expect_error($q$insert into public.student_health_info (student_id, limitations) values ('00000000-0000-0000-0000-0000000000a1', 'x')$q$, 'gravar saúde sem consentimento');
end $$;
update public.profiles set health_data_consent_at = now() where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.student_health_info (student_id, limitations) values ('00000000-0000-0000-0000-0000000000a1', 'Desconforto no ombro direito');
reset role;

-- PROFISSIONAL 1 (pendente) ---------------------------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000f1');
do $$ begin
  perform tests.expect_error($q$update public.professional_profiles set status = 'aprovado' where user_id = '00000000-0000-0000-0000-0000000000f1'$q$, 'profissional se autoaprovar');
  perform tests.expect_error($q$select public.review_professional('00000000-0000-0000-0000-0000000000f1', 'aprovado')$q$, 'profissional usar review_professional');
  if public.is_active_trainer() then raise exception 'FALHA: pendente não pode ser profissional ativo'; end if;
end $$;
update public.professional_profiles set bio = 'Especialista em hipertrofia', is_public = true, specialties = '{hipertrofia,forca}'
 where user_id = '00000000-0000-0000-0000-0000000000f1';
reset role;

-- ADMIN aprova profissionais --------------------------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000a');
select public.review_professional('00000000-0000-0000-0000-0000000000f1', 'aprovado', 'CREF verificado');
select public.review_professional('00000000-0000-0000-0000-0000000000f2', 'aprovado');
do $$ begin
  perform tests.expect_count($q$select 1 from public.user_roles where role = 'profissional'$q$, 2, 'papel profissional concedido');
  perform tests.expect_count($q$select 1 from public.audit_logs where action = 'revisar_profissional'$q$, 2, 'aprovações auditadas');
  perform tests.expect_error($q$select public.set_user_role('00000000-0000-0000-0000-00000000000a', 'admin', false)$q$, 'admin remover o próprio acesso');
end $$;
reset role;

-- ALUNO 1 solicita treino ------------------------------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform tests.expect_count($q$select 1 from public.public_trainers$q$, 1, 'profissional público visível');
end $$;
do $$ declare _id uuid; begin
  insert into public.workout_requests (id, student_id, trainer_id, goal, days_per_week, details, share_health_info)
  values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'hipertrofia', 4, 'Quero focar em pernas', true)
  returning id into _id;
  raise notice 'OK: aluno cria solicitação com RETURNING';
end $$;
do $$ begin
  perform tests.expect_error($q$update public.workout_requests set status = 'concluido' where id = '11111111-1111-1111-1111-111111111111'$q$, 'aluno mudar status direto');
  perform tests.expect_error($q$select public.transition_request('11111111-1111-1111-1111-111111111111', 'entregue')$q$, 'aluno marcar como entregue');
end $$;
reset role;

-- ALUNO 2 não enxerga dados do aluno 1 ----------------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  perform tests.expect_count($q$select 1 from public.workout_requests$q$, 0, 'aluno 2 não vê solicitação do aluno 1');
  perform tests.expect_count($q$select 1 from public.student_health_info$q$, 0, 'aluno 2 não vê saúde do aluno 1');
  perform tests.expect_error($q$insert into public.request_messages (request_id, author_id, body) values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000a2', 'oi')$q$, 'aluno 2 escrever na solicitação alheia');
end $$;
reset role;

-- PROFISSIONAL 2 (não vinculado) ----------------------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000f2');
do $$ begin
  perform tests.expect_count($q$select 1 from public.workout_requests$q$, 0, 'profissional 2 não vê solicitação de outro');
  perform tests.expect_error($q$select public.transition_request('11111111-1111-1111-1111-111111111111', 'em_analise')$q$, 'profissional 2 aceitar solicitação de outro');
  perform tests.expect_error($q$insert into public.workout_plans (student_id, author_id, source, title) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f2', 'profissional', 'Invasão')$q$, 'profissional 2 criar ficha para aluno não vinculado');
end $$;
reset role;

-- PROFISSIONAL 1 aceita e elabora ---------------------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000f1');
do $$ begin
  perform tests.expect_count($q$select 1 from public.student_health_info$q$, 0, 'antes do vínculo, sem acesso à saúde');
end $$;
select public.transition_request('11111111-1111-1111-1111-111111111111', 'em_analise', 'Vou analisar');
select public.transition_request('11111111-1111-1111-1111-111111111111', 'em_elaboracao');
do $$ begin
  perform tests.expect_count($q$select 1 from public.trainer_student_links where status = 'ativo'$q$, 1, 'vínculo criado ao aceitar');
  perform tests.expect_count($q$select 1 from public.student_health_info$q$, 1, 'vinculado lê saúde do aluno');
  perform tests.expect_count($q$select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'$q$, 1, 'vinculado vê perfil do aluno');
  perform tests.expect_count($q$select 1 from public.request_events where request_id = '11111111-1111-1111-1111-111111111111'$q$, 3, 'histórico de status');
end $$;
insert into public.workout_plans (id, student_id, author_id, source, title, split_type, request_id)
values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'profissional', 'Hipertrofia — Fase 1', 'ABC', '11111111-1111-1111-1111-111111111111');
insert into public.workout_days (id, plan_id, position, label, name)
values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 0, 'A', 'Peito e tríceps');
insert into public.workout_exercises (day_id, exercise_id, position, sets, reps, rest_seconds)
select '33333333-3333-3333-3333-333333333333', id, 0, 4, '8-12', 90 from public.exercises where slug = 'supino-reto-barra';
do $$ begin
  perform tests.expect_error($q$update public.workout_plans set status = 'publicado' where id = '22222222-2222-2222-2222-222222222222'$q$, 'publicar sem publish_workout_plan');
  perform tests.expect_error($q$update public.workout_plans set current_version = 9 where id = '22222222-2222-2222-2222-222222222222'$q$, 'forjar versão');
  perform tests.expect_error($q$insert into public.workout_exercises (day_id, exercise_id, position, sets, reps) select '33333333-3333-3333-3333-333333333333', id, 1, 3, 'muitas' from public.exercises limit 1$q$, 'repetições inválidas');
end $$;
insert into public.trainer_notes (trainer_id, student_id, body)
values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'Observar ombro direito.');
reset role;

-- ALUNO 1: rascunho do profissional invisível ---------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform tests.expect_count($q$select 1 from public.workout_plans$q$, 0, 'aluno não vê rascunho do profissional');
  perform tests.expect_count($q$select 1 from public.trainer_notes$q$, 0, 'aluno não vê notas privadas do profissional');
  perform tests.expect_count($q$select 1 from public.profiles$q$, 2, 'aluno vê o próprio perfil e o do profissional vinculado');
end $$;
reset role;

-- PROFISSIONAL 1 publica ------------------------------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000f1');
select public.publish_workout_plan('22222222-2222-2222-2222-222222222222', 'Primeira versão');
do $$ begin
  perform tests.expect_count($q$select 1 from public.workout_versions where plan_id = '22222222-2222-2222-2222-222222222222' and version = 1$q$, 1, 'versão 1 registrada');
  perform tests.expect_count($q$select 1 from public.workout_requests where status = 'entregue'$q$, 1, 'solicitação entregue ao publicar');
end $$;
reset role;

-- ALUNO 1 recebe, treina e não pode adulterar ---------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform tests.expect_count($q$select 1 from public.workout_plans where status = 'publicado'$q$, 1, 'aluno vê ficha publicada');
  perform tests.expect_count($q$select 1 from public.workout_exercises$q$, 1, 'aluno vê exercícios da ficha');
  perform tests.expect_count($q$select 1 from public.notifications where type = 'treino_publicado'$q$, 1, 'aluno notificado');
  perform tests.expect_error($q$update public.workout_plans set title = 'Alterado' where id = '22222222-2222-2222-2222-222222222222'$q$, 'aluno editar ficha publicada');
  perform tests.expect_error($q$insert into public.workout_plans (student_id, author_id, source, title, status) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'profissional', 'Falso', 'rascunho')$q$, 'aluno criar ficha como profissional');
  perform tests.expect_error($q$insert into public.ai_generations (user_id, kind, provider, model, input, status) values ('00000000-0000-0000-0000-0000000000a1', 'gerar_treino', 'x', 'y', '{}', 'sucesso')$q$, 'aluno forjar geração de IA');
end $$;
-- aluno conta zero linhas alteradas ao tentar editar exercícios (RLS filtra)
do $$ declare _n int; begin
  update public.workout_exercises set sets = 10; get diagnostics _n = row_count;
  if _n <> 0 then raise exception 'FALHA: aluno alterou % exercícios publicados', _n; end if;
  raise notice 'OK: aluno não altera exercícios publicados (0 linhas)';
end $$;

-- ficha própria do aluno (com RETURNING, como o app faz)
do $$ declare _id uuid; begin
  insert into public.workout_plans (id, student_id, author_id, source, title, status, split_type)
  values ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'aluno', 'Meu treino', 'ativo', 'FULL_BODY')
  returning id into _id;
  raise notice 'OK: aluno cria ficha própria com RETURNING';
end $$;
do $$ begin
  perform tests.expect_error($q$select public.publish_workout_plan('44444444-4444-4444-4444-444444444444')$q$, 'aluno publicar a própria ficha');
  perform tests.expect_error($q$update public.workout_plans set source = 'profissional' where id = '44444444-4444-4444-4444-444444444444'$q$, 'aluno trocar origem da ficha');
end $$;

-- sessão de treino
insert into public.workout_sessions (id, student_id, plan_id, day_id, day_label)
values ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-0000000000a1', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'A');
insert into public.completed_sets (session_id, student_id, exercise_id, workout_exercise_id, set_number, reps, load_kg)
select '55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-0000000000a1', we.exercise_id, we.id, 1, 10, 60
from public.workout_exercises we limit 1;
update public.workout_sessions set status = 'concluida', finished_at = now() where id = '55555555-5555-5555-5555-555555555555';
do $$ begin
  perform tests.expect_error($q$insert into public.completed_sets (session_id, student_id, exercise_id, set_number, reps) select '55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-0000000000a1', id, 2, 10 from public.exercises limit 1$q$, 'registrar série em sessão encerrada');
  perform tests.expect_error($q$select public.transition_request('11111111-1111-1111-1111-111111111111', 'em_elaboracao')$q$, 'aluno voltar status para elaboração');
end $$;
select public.transition_request('11111111-1111-1111-1111-111111111111', 'ajuste_solicitado', 'Trocar supino por halteres');
insert into public.progress_records (student_id, weight_kg, share_with_trainer) values ('00000000-0000-0000-0000-0000000000a1', 80, false);
do $$ declare _d jsonb; begin
  _d := public.export_my_data();
  if jsonb_array_length(_d -> 'workout_sessions') <> 1 or _d -> 'profile' ->> 'full_name' <> 'Aluno Um' then
    raise exception 'FALHA: exportação incompleta';
  end if;
  raise notice 'OK: exportação de dados (LGPD)';
end $$;
reset role;

-- PROFISSIONAL 1 acompanha ----------------------------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000f1');
do $$ begin
  perform tests.expect_count($q$select 1 from public.workout_sessions$q$, 1, 'vinculado vê sessões do aluno');
  perform tests.expect_count($q$select 1 from public.completed_sets$q$, 1, 'vinculado vê cargas do aluno');
  perform tests.expect_count($q$select 1 from public.progress_records$q$, 0, 'medidas não compartilhadas ficam privadas');
  perform tests.expect_count($q$select 1 from public.workout_plans where id = '44444444-4444-4444-4444-444444444444'$q$, 1, 'vinculado vê ficha ativa do aluno');
end $$;
select public.transition_request('11111111-1111-1111-1111-111111111111', 'em_elaboracao');
reset role;

-- PROFISSIONAL 2 continua sem acesso ------------------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000f2');
do $$ begin
  perform tests.expect_count($q$select 1 from public.workout_sessions$q$, 0, 'não vinculado não vê sessões');
  perform tests.expect_count($q$select 1 from public.workout_plans$q$, 0, 'não vinculado não vê fichas');
  perform tests.expect_count($q$select 1 from public.trainer_notes$q$, 0, 'notas de outro profissional invisíveis');
  perform tests.expect_count($q$select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'$q$, 0, 'não vinculado não vê perfil do aluno');
end $$;
reset role;

-- ADMIN suspende profissional 1 → perde acesso --------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000a');
select public.review_professional('00000000-0000-0000-0000-0000000000f1', 'suspenso', 'Teste de suspensão');
do $$ begin
  perform tests.expect_count($q$select 1 from public.audit_logs$q$, (select count(*) from public.audit_logs), 'admin lê auditoria');
  perform tests.expect_count($q$select 1 from public.student_health_info$q$, 0, 'admin não lê saúde por padrão');
end $$;
reset role;

set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000f1');
do $$ begin
  perform tests.expect_count($q$select 1 from public.workout_sessions$q$, 0, 'suspenso perde acesso às sessões');
  perform tests.expect_count($q$select 1 from public.student_health_info$q$, 0, 'suspenso perde acesso à saúde');
end $$;
reset role;

-- Revogar consentimento apaga dados de saúde ---------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-0000000000a2');
update public.profiles set health_data_consent_at = now() where id = '00000000-0000-0000-0000-0000000000a2';
insert into public.student_health_info (student_id, limitations) values ('00000000-0000-0000-0000-0000000000a2', 'Joelho');
update public.profiles set health_data_consent_at = null where id = '00000000-0000-0000-0000-0000000000a2';
do $$ begin
  perform tests.expect_count($q$select 1 from public.student_health_info$q$, 0, 'revogar consentimento apaga saúde');
end $$;
reset role;

-- ANÔNIMO ---------------------------------------------------------------------
set role anon;
select tests.login(null);
do $$ begin
  perform tests.expect_count($q$select 1 from public.exercises$q$, (select count(*) from public.exercises where is_active), 'anônimo lê biblioteca');
  perform tests.expect_count($q$select 1 from public.profiles$q$, 0, 'anônimo não lê perfis');
  perform tests.expect_count($q$select 1 from public.public_trainers$q$, 0, 'profissional suspenso sai da equipe pública');
end $$;
reset role;

select 'TODOS OS TESTES DE RLS PASSARAM' as resultado;

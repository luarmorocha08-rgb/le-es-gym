-- =============================================================================
-- Etapa 7 — Administração
--   * Listagem de usuários com e-mail (auth.users não é exposta: função
--     SECURITY DEFINER restrita a administradores; nunca inclui dados de saúde).
--   * Auditoria automática de alterações na biblioteca, horários e conteúdos.
--   * Vínculos e revisões de cadastro notificam os envolvidos.
-- =============================================================================

create or replace function public.admin_list_users(
  _search text default null,
  _role text default null,
  _limit int default 30,
  _offset int default 0,
  _id uuid default null
)
returns table (
  id uuid,
  full_name text,
  email text,
  email_verified boolean,
  created_at timestamptz,
  roles text[],
  professional_status text,
  sessions_30d int,
  last_session timestamptz,
  total bigint
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Somente administradores.' using errcode = '42501';
  end if;
  return query
    with base as (
      select p.id, p.full_name, u.email, u."emailVerified" as email_verified, p.created_at,
             coalesce((select array_agg(ur.role::text order by ur.role) from public.user_roles ur where ur.user_id = p.id), '{}') as roles,
             pp.status::text as professional_status
        from public.profiles p
        join auth.users u on u.id = p.id
        left join public.professional_profiles pp on pp.user_id = p.id
       where (_id is null or p.id = _id)
         and (_search is null or _search = ''
              or p.full_name ilike '%' || _search || '%'
              or u.email ilike '%' || _search || '%')
    ), filtered as (
      select * from base b
       where _role is null or _role = ''
          or (_role = 'pendente' and b.professional_status = 'pendente')
          or (_role <> 'pendente' and _role = any (b.roles))
    )
    select f.id, f.full_name, f.email, f.email_verified, f.created_at, f.roles, f.professional_status,
           (select count(*)::int from public.workout_sessions s
             where s.student_id = f.id and s.status = 'concluida' and s.finished_at > now() - interval '30 days'),
           (select max(s.finished_at) from public.workout_sessions s where s.student_id = f.id and s.status = 'concluida'),
           count(*) over ()
      from filtered f
     order by f.created_at desc
     limit least(greatest(_limit, 1), 100) offset greatest(_offset, 0);
end;
$$;
revoke execute on function public.admin_list_users(text, text, int, int, uuid) from public, anon;
grant execute on function public.admin_list_users(text, text, int, int, uuid) to authenticated;

-- Auditoria automática (tabelas escritas somente por administradores) ----------
create or replace function public.audit_admin_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  _row jsonb := to_jsonb(coalesce(new, old));
  _id text := coalesce(_row ->> 'id', _row ->> 'key');
  _label text := coalesce(_row ->> 'name', _row ->> 'slug', _row ->> 'key', _row ->> 'weekday');
begin
  -- só alterações feitas por uma sessão do app (seed e scripts não poluem o log)
  if (select auth.uid()) is null then
    return null;
  end if;
  perform public.write_audit_log(
    lower(tg_op), tg_table_name, _id,
    jsonb_strip_nulls(jsonb_build_object(
      'label', _label,
      'is_active', case when tg_table_name = 'exercises' then _row -> 'is_active' end,
      'hours', case when tg_table_name = 'opening_hours'
                    then left(_row ->> 'opens_at', 5) || '–' || left(_row ->> 'closes_at', 5) end
    ))
  );
  return null;
end;
$$;

create trigger exercises_audit after insert or update or delete on public.exercises
  for each row execute function public.audit_admin_change();
create trigger opening_hours_audit after insert or update or delete on public.opening_hours
  for each row execute function public.audit_admin_change();
create trigger site_content_audit after insert or update or delete on public.site_content
  for each row execute function public.audit_admin_change();

-- Revisão de cadastro: link da notificação coerente com o novo status ---------
create or replace function public.review_professional(_user uuid, _status public.professional_status, _note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Somente administradores.' using errcode = '42501';
  end if;
  if _user = (select auth.uid()) then
    raise exception 'Você não pode revisar o próprio cadastro.' using errcode = '22023';
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

  perform public.notify(
    _user, 'cadastro_profissional',
    case _status
      when 'aprovado' then 'Cadastro profissional aprovado'
      when 'rejeitado' then 'Cadastro profissional não aprovado'
      when 'suspenso' then 'Acesso profissional suspenso'
      else 'Cadastro profissional em análise'
    end,
    nullif(left(_note, 500), ''),
    case when _status = 'aprovado' then '/profissional/dashboard' else '/aluno/dashboard' end);
  perform public.write_audit_log('revisar_profissional', 'professional_profiles', _user::text,
    jsonb_strip_nulls(jsonb_build_object('status', _status, 'note', nullif(left(_note, 200), ''))));
end;
$$;

-- Vínculo manual: valida o aluno e notifica os dois lados ----------------------
create or replace function public.link_trainer_student(_trainer uuid, _student uuid, _active boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  _trainer_name text;
  _student_name text;
begin
  if not public.is_admin() then
    raise exception 'Somente administradores.' using errcode = '42501';
  end if;
  if _trainer = _student then
    raise exception 'O profissional não pode ser vinculado a si mesmo.' using errcode = '22023';
  end if;
  select full_name into _trainer_name from public.profiles where id = _trainer;
  select full_name into _student_name from public.profiles where id = _student;
  if _student_name is null or _trainer_name is null then
    raise exception 'Usuário não encontrado.' using errcode = 'P0002';
  end if;

  if _active then
    if not exists (
      select 1 from public.professional_profiles pp
      join public.user_roles ur on ur.user_id = pp.user_id and ur.role = 'profissional'
      where pp.user_id = _trainer and pp.status = 'aprovado'
    ) then
      raise exception 'Profissional não aprovado.' using errcode = '22023';
    end if;
    if exists (select 1 from public.trainer_student_links
                where trainer_id = _trainer and student_id = _student and status = 'ativo') then
      raise exception 'Este vínculo já está ativo.' using errcode = '23505';
    end if;
    insert into public.trainer_student_links (trainer_id, student_id, created_by)
    values (_trainer, _student, (select auth.uid()));
    perform public.notify(_student, 'vinculo', 'Novo profissional vinculado',
      _trainer_name || ' agora acompanha seus treinos.', '/aluno/solicitar-profissional');
    perform public.notify(_trainer, 'vinculo', 'Novo aluno vinculado',
      _student_name || ' foi vinculado a você pela administração.', '/profissional/alunos/' || _student::text);
  else
    update public.trainer_student_links set status = 'encerrado', ended_at = now()
     where trainer_id = _trainer and student_id = _student and status = 'ativo';
    if not found then
      raise exception 'Vínculo ativo não encontrado.' using errcode = 'P0002';
    end if;
    perform public.notify(_student, 'vinculo', 'Vínculo encerrado',
      'O acompanhamento com ' || _trainer_name || ' foi encerrado.', '/aluno/solicitar-profissional');
    perform public.notify(_trainer, 'vinculo', 'Vínculo encerrado',
      'O acompanhamento de ' || _student_name || ' foi encerrado pela administração.', '/profissional/alunos');
  end if;
  perform public.write_audit_log(case when _active then 'vincular_aluno' else 'desvincular_aluno' end,
    'trainer_student_links', _student::text, jsonb_build_object('trainer_id', _trainer));
end;
$$;

create index if not exists ai_generations_created_idx on public.ai_generations (created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);

-- E-mails de uma lista de usuários (somente administradores)
create or replace function public.admin_user_emails(_ids uuid[])
returns table (id uuid, email text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Somente administradores.' using errcode = '42501';
  end if;
  return query select u.id, u.email from auth.users u where u.id = any (_ids);
end;
$$;
revoke execute on function public.admin_user_emails(uuid[]) from public, anon;
grant execute on function public.admin_user_emails(uuid[]) to authenticated;

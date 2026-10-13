-- =============================================================================
-- Etapa 8 — Limite de tentativas (força bruta) compartilhado entre instâncias
--   * auth."rateLimit": armazenamento do limitador do Better Auth (/api/auth/*).
--   * auth.rate_limits + auth.consume_rate_limit(): limitador das Server Actions
--     de login, cadastro e senha (que não passam pelo roteador HTTP do Better Auth).
--   Ambos ficam no schema auth, sem acesso para os papéis anon/authenticated.
-- =============================================================================

create table auth."rateLimit" (
  "id" uuid default gen_random_uuid() not null primary key,
  "key" text not null unique,
  "count" integer not null,
  "lastRequest" bigint not null
);

create table auth.rate_limits (
  key text primary key,
  count integer not null,
  window_start timestamptz not null default now()
);

-- Conta uma tentativa de forma atômica. Retorna 0 se permitido ou os segundos
-- até liberar quando o limite da janela foi excedido.
create or replace function auth.consume_rate_limit(_key text, _window_seconds integer, _max integer)
returns integer
language plpgsql
as $$
declare
  _row auth.rate_limits;
begin
  insert into auth.rate_limits as r (key, count, window_start)
  values (_key, 1, now())
  on conflict (key) do update set
    count = case when r.window_start <= now() - make_interval(secs => _window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start <= now() - make_interval(secs => _window_seconds) then now() else r.window_start end
  returning * into _row;

  if _row.count > _max then
    return greatest(1, ceil(extract(epoch from (_row.window_start + make_interval(secs => _window_seconds) - now())))::integer);
  end if;
  return 0;
end;
$$;

-- Limpa uma chave (ex.: login bem-sucedido zera as falhas daquele e-mail)
create or replace function auth.reset_rate_limit(_key text)
returns void
language sql
as $$
  delete from auth.rate_limits where key = _key;
$$;

revoke all on auth."rateLimit", auth.rate_limits from public, anon, authenticated;
revoke execute on function auth.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function auth.reset_rate_limit(text) from public, anon, authenticated;

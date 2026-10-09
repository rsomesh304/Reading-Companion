create table if not exists public.reading_companion_session_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  daily_limit_minutes integer not null default 30 check (daily_limit_minutes between 1 and 1440),
  usage_date date not null default current_date,
  used_seconds integer not null default 0 check (used_seconds >= 0),
  updated_at timestamptz not null default now()
);

alter table public.reading_companion_session_limits enable row level security;
revoke all on table public.reading_companion_session_limits from anon, authenticated;

create or replace function public.get_reading_companion_session_limit(p_user_id uuid)
returns table(daily_limit_minutes integer, used_seconds integer, usage_date date)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.reading_companion_session_limits (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.reading_companion_session_limits
  set usage_date = current_date, used_seconds = 0, updated_at = now()
  where user_id = p_user_id and usage_date <> current_date;

  return query
  select limits.daily_limit_minutes, limits.used_seconds, limits.usage_date
  from public.reading_companion_session_limits as limits
  where limits.user_id = p_user_id;
end;
$$;

create or replace function public.record_reading_companion_session_usage(p_user_id uuid, p_seconds integer)
returns table(daily_limit_minutes integer, used_seconds integer, usage_date date)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_seconds < 1 or p_seconds > 60 then
    raise exception 'invalid_usage_seconds';
  end if;

  perform * from public.get_reading_companion_session_limit(p_user_id);

  update public.reading_companion_session_limits as limits
  set used_seconds = least(limits.daily_limit_minutes * 60, limits.used_seconds + p_seconds),
      updated_at = now()
  where limits.user_id = p_user_id and limits.usage_date = current_date;

  return query
  select limits.daily_limit_minutes, limits.used_seconds, limits.usage_date
  from public.reading_companion_session_limits as limits
  where limits.user_id = p_user_id;
end;
$$;

create or replace function public.set_reading_companion_session_limit(p_user_id uuid, p_minutes integer)
returns table(daily_limit_minutes integer, used_seconds integer, usage_date date)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_minutes < 1 or p_minutes > 1440 then
    raise exception 'invalid_daily_limit_minutes';
  end if;

  perform * from public.get_reading_companion_session_limit(p_user_id);

  update public.reading_companion_session_limits
  set daily_limit_minutes = p_minutes, updated_at = now()
  where user_id = p_user_id;

  return query
  select limits.daily_limit_minutes, limits.used_seconds, limits.usage_date
  from public.reading_companion_session_limits as limits
  where limits.user_id = p_user_id;
end;
$$;

revoke all on function public.get_reading_companion_session_limit(uuid) from public, anon, authenticated;
revoke all on function public.record_reading_companion_session_usage(uuid, integer) from public, anon, authenticated;
revoke all on function public.set_reading_companion_session_limit(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_reading_companion_session_limit(uuid) to service_role;
grant execute on function public.record_reading_companion_session_usage(uuid, integer) to service_role;
grant execute on function public.set_reading_companion_session_limit(uuid, integer) to service_role;

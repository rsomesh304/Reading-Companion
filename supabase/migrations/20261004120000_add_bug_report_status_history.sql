-- Records when each status change happened so the app can show a date next to every stage in a report's timeline.
-- Safe to run more than once.

alter table public.bug_reports
  add column if not exists status_history jsonb not null default '[]'::jsonb,
  add column if not exists status_updated_at timestamp with time zone;

create or replace function public.bug_reports_track_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status_history := jsonb_build_array(
      jsonb_build_object('status', coalesce(new.status, 'queued'), 'at', coalesce(new.created_at, now()))
    );
    new.status_updated_at := coalesce(new.created_at, now());
  elsif new.status is distinct from old.status or new.status_note is distinct from old.status_note then
    new.status_history := coalesce(old.status_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'status', new.status,
        'note', case when new.status_note is distinct from old.status_note then nullif(btrim(new.status_note), '') else null end,
        'at', now()
      )
    );
    new.status_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists bug_reports_track_status on public.bug_reports;
create trigger bug_reports_track_status
  before insert or update on public.bug_reports
  for each row execute function public.bug_reports_track_status();

-- Existing reports: Sent on the day they were raised, plus the current status with the best date we know.
update public.bug_reports
set
  status_history = case
    when status in ('sent', 'queued') then jsonb_build_array(jsonb_build_object('status', 'sent', 'at', created_at))
    else jsonb_build_array(
      jsonb_build_object('status', 'sent', 'at', created_at),
      jsonb_build_object('status', status, 'note', nullif(btrim(status_note), ''), 'at', coalesce(resolved_at, created_at))
    )
  end,
  status_updated_at = coalesce(resolved_at, created_at)
where status_history = '[]'::jsonb;

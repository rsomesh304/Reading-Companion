-- One note per status: editing the note of the current status now updates its existing history entry
-- instead of appending a second one. Existing duplicate entries are collapsed to the latest note.
-- Safe to run more than once.

create or replace function public.bug_reports_track_status()
returns trigger
language plpgsql
as $$
declare
  history jsonb;
  last_index integer;
begin
  if tg_op = 'INSERT' then
    new.status_history := jsonb_build_array(
      jsonb_build_object('status', coalesce(new.status, 'queued'), 'at', coalesce(new.created_at, now()))
    );
    new.status_updated_at := coalesce(new.created_at, now());
  elsif new.status is distinct from old.status then
    new.status_history := coalesce(old.status_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'status', new.status,
        'note', case when new.status_note is distinct from old.status_note then nullif(btrim(new.status_note), '') else null end,
        'at', now()
      )
    );
    new.status_updated_at := now();
  elsif new.status_note is distinct from old.status_note then
    history := coalesce(old.status_history, '[]'::jsonb);
    last_index := jsonb_array_length(history) - 1;
    if last_index >= 0 and history -> last_index ->> 'status' = new.status then
      -- Same status, new wording: replace the note in place and keep the date the status was reached.
      new.status_history := jsonb_set(
        history,
        array[last_index::text],
        (history -> last_index)
          || jsonb_build_object('note', nullif(btrim(new.status_note), ''), 'note_updated_at', now())
      );
    else
      new.status_history := history || jsonb_build_array(
        jsonb_build_object('status', new.status, 'note', nullif(btrim(new.status_note), ''), 'at', now())
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bug_reports_track_status on public.bug_reports;
create trigger bug_reports_track_status
  before insert or update on public.bug_reports
  for each row execute function public.bug_reports_track_status();

-- Collapse runs of consecutive entries with the same status into one entry:
-- the first entry's date (when the status was reached) with the last entry's note (the latest edit).
with expanded as (
  select b.id, e.value as entry, e.ord, e.value ->> 'status' as status
  from public.bug_reports b
  cross join lateral jsonb_array_elements(b.status_history) with ordinality as e(value, ord)
),
marked as (
  select *, case when status is distinct from lag(status) over (partition by id order by ord) then 1 else 0 end as starts_run
  from expanded
),
grouped as (
  select *, sum(starts_run) over (partition by id order by ord) as run
  from marked
),
collapsed as (
  select
    id,
    run,
    count(*) as size,
    (array_agg(entry order by ord))[1] as first_entry,
    (array_agg(entry order by ord desc))[1] as last_entry
  from grouped
  group by id, run
),
rebuilt as (
  select
    id,
    jsonb_agg(
      case when size = 1 then first_entry
      else first_entry || jsonb_build_object('note', last_entry -> 'note', 'note_updated_at', last_entry -> 'at')
      end
      order by run
    ) as history,
    bool_or(size > 1) as changed
  from collapsed
  group by id
)
update public.bug_reports b
set status_history = r.history
from rebuilt r
where b.id = r.id and r.changed;

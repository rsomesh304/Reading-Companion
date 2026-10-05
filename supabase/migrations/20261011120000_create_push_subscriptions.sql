-- Web Push subscriptions, one row per browser/device. Only the backend (service role) reads or writes it.
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_id uuid references auth.users (id) on delete cascade,
  announcements boolean not null default true,
  reminders_enabled boolean not null default false,
  -- Minutes after local midnight at which the study reminder fires (null = not enough activity yet).
  reminder_minute smallint check (reminder_minute between 0 and 1439),
  timezone text not null default 'UTC',
  last_reminded_on date,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_reminders_idx
  on public.push_subscriptions (reminders_enabled)
  where reminders_enabled;

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;

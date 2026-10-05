create table if not exists public.reading_companion_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  snapshot jsonb not null default '{"version":1,"data":{}}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.reading_companion_accounts enable row level security;
revoke all on table public.reading_companion_accounts from anon, authenticated;
grant select, insert, update, delete on table public.reading_companion_accounts to authenticated;

drop policy if exists "Readers can view their own cloud snapshot" on public.reading_companion_accounts;
create policy "Readers can view their own cloud snapshot"
  on public.reading_companion_accounts for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Readers can create their own cloud snapshot" on public.reading_companion_accounts;
create policy "Readers can create their own cloud snapshot"
  on public.reading_companion_accounts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Readers can update their own cloud snapshot" on public.reading_companion_accounts;
create policy "Readers can update their own cloud snapshot"
  on public.reading_companion_accounts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Readers can delete their own cloud snapshot" on public.reading_companion_accounts;
create policy "Readers can delete their own cloud snapshot"
  on public.reading_companion_accounts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

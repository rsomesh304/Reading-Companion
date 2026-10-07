-- Who may open the in-app Docs, plus the private docs bundle itself.
-- Both tables are readable only by the backend (service role): RLS is on and no policies exist.
create table if not exists public.docs_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.docs_content (
  key text primary key,
  body jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.docs_access enable row level security;
alter table public.docs_content enable row level security;
revoke all on public.docs_access, public.docs_content from anon, authenticated;

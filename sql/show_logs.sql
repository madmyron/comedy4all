-- Comedy4All: live set logs + last rehearsal scores (per user)
-- Run once in Supabase → SQL Editor for project largbufmopnfeodsmhkr

create table if not exists public.show_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  venue text,
  show_date date,
  length text,
  notes text,
  rating integer,
  set_name text,
  joke_ids jsonb not null default '[]'::jsonb,
  reactions jsonb not null default '{}'::jsonb,
  rehearsal_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists show_logs_user_updated
  on public.show_logs (user_id, updated_at desc);

create table if not exists public.rehearsal_scores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  scores jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.show_logs enable row level security;
alter table public.rehearsal_scores enable row level security;

drop policy if exists "Users manage own show_logs" on public.show_logs;
create policy "Users manage own show_logs"
  on public.show_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own rehearsal_scores" on public.rehearsal_scores;
create policy "Users manage own rehearsal_scores"
  on public.rehearsal_scores
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.show_logs to authenticated;
grant select, insert, update, delete on public.rehearsal_scores to authenticated;

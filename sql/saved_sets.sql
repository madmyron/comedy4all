-- Comedy4All: cross-device set sync
-- Run this once in Supabase → SQL Editor for project largbufmopnfeodsmhkr

create table if not exists public.saved_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  joke_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists saved_sets_user_name_ci
  on public.saved_sets (user_id, lower(name));

create table if not exists public.set_builder_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_joke_ids jsonb not null default '[]'::jsonb,
  active_set_name text,
  updated_at timestamptz not null default now()
);

alter table public.saved_sets enable row level security;
alter table public.set_builder_state enable row level security;

drop policy if exists "Users manage own saved_sets" on public.saved_sets;
create policy "Users manage own saved_sets"
  on public.saved_sets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own set_builder_state" on public.set_builder_state;
create policy "Users manage own set_builder_state"
  on public.set_builder_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.saved_sets to authenticated;
grant select, insert, update, delete on public.set_builder_state to authenticated;

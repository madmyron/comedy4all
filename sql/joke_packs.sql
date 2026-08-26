-- Comedy4All: joke packs (theme folders; a joke can be in many packs)
-- Run once in Supabase → SQL Editor for project largbufmopnfeodsmhkr

alter table public.jokes
  add column if not exists packs text[] not null default '{}'::text[];

comment on column public.jokes.packs is 'Theme pack names this joke belongs to (many-to-many by name)';

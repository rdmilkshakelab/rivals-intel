-- Rivals Intel Supabase foundation
-- Run this in the Supabase SQL editor after creating your project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can create their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  if requested_username is null then
    requested_username := 'player_' || left(replace(new.id::text, '-', ''), 10);
  end if;

  insert into public.profiles (id, username)
  values (new.id, requested_username)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Players are private saved lookups, not live-match telemetry.
create table if not exists public.saved_players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_identifier text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, player_identifier)
);

alter table public.saved_players enable row level security;

create policy "Users manage their own saved players"
  on public.saved_players for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

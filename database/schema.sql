-- Texas Home Hub Pro V2 core property engagement schema
create extension if not exists pgcrypto;

create table if not exists public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create table if not exists public.showing_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  property_id integer not null,
  property_title text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  preferred_date date not null,
  preferred_time text not null,
  message text,
  status text not null default 'new' check (status in ('new','contacted','confirmed','completed','cancelled')),
  created_at timestamptz not null default now()
);

alter table public.saved_properties enable row level security;
alter table public.showing_requests enable row level security;

create policy "Users read own saved properties" on public.saved_properties for select using (auth.uid() = user_id);
create policy "Users add own saved properties" on public.saved_properties for insert with check (auth.uid() = user_id);
create policy "Users remove own saved properties" on public.saved_properties for delete using (auth.uid() = user_id);

create policy "Anyone may submit showing requests" on public.showing_requests for insert with check (user_id is null or auth.uid() = user_id);
create policy "Users read own showing requests" on public.showing_requests for select using (auth.uid() = user_id);

create index if not exists saved_properties_user_idx on public.saved_properties(user_id);
create index if not exists showing_requests_user_idx on public.showing_requests(user_id);
create index if not exists showing_requests_property_idx on public.showing_requests(property_id);
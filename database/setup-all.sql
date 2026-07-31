-- Texas Home Hub Pro V2 — Complete Supabase Setup
-- Run this entire file once in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- =========================================================
-- 1. USER PROFILES
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'buyer' check (role in ('buyer','seller','investor','homeowner','agent','admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    coalesce(new.raw_user_meta_data->>'role','buyer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================================================
-- 2. SAVED HOMES + SHOWING REQUESTS
-- =========================================================
create table if not exists public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id bigint not null,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create table if not exists public.showing_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  property_id bigint not null,
  property_title text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  preferred_date date not null,
  preferred_time text not null,
  message text,
  status text not null default 'new' check (status in ('new','contacted','confirmed','completed','cancelled')),
  internal_notes text,
  assigned_to uuid references public.profiles(id) on delete set null,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.saved_properties enable row level security;
alter table public.showing_requests enable row level security;

drop policy if exists "Users read own saved properties" on public.saved_properties;
create policy "Users read own saved properties" on public.saved_properties
for select using (auth.uid() = user_id);

drop policy if exists "Users add own saved properties" on public.saved_properties;
create policy "Users add own saved properties" on public.saved_properties
for insert with check (auth.uid() = user_id);

drop policy if exists "Users remove own saved properties" on public.saved_properties;
create policy "Users remove own saved properties" on public.saved_properties
for delete using (auth.uid() = user_id);

drop policy if exists "Anyone may submit showing requests" on public.showing_requests;
create policy "Anyone may submit showing requests" on public.showing_requests
for insert with check (user_id is null or auth.uid() = user_id);

drop policy if exists "Users read own showing requests" on public.showing_requests;
create policy "Users read own showing requests" on public.showing_requests
for select using (auth.uid() = user_id);

create index if not exists saved_properties_user_idx on public.saved_properties(user_id);
create index if not exists showing_requests_user_idx on public.showing_requests(user_id);
create index if not exists showing_requests_property_idx on public.showing_requests(property_id);
create index if not exists showing_requests_status_idx on public.showing_requests(status);

-- =========================================================
-- 3. ADMIN + CRM
-- =========================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  role text not null default 'buyer' check (role in ('buyer','seller','investor','homeowner','agent')),
  stage text not null default 'new' check (stage in ('new','contacted','qualified','touring','offer','under_contract','closed','lost')),
  source text not null default 'website',
  assigned_to uuid references public.profiles(id) on delete set null,
  next_follow_up_at timestamptz,
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.crm_leads enable row level security;
alter table public.crm_notes enable row level security;

drop trigger if exists crm_leads_touch_updated_at on public.crm_leads;
create trigger crm_leads_touch_updated_at
before update on public.crm_leads
for each row execute procedure public.touch_updated_at();

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage showing requests" on public.showing_requests;
create policy "Admins manage showing requests" on public.showing_requests
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read saved activity" on public.saved_properties;
create policy "Admins read saved activity" on public.saved_properties
for select using (public.is_admin());

drop policy if exists "Admins manage CRM leads" on public.crm_leads;
create policy "Admins manage CRM leads" on public.crm_leads
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage CRM notes" on public.crm_notes;
create policy "Admins manage CRM notes" on public.crm_notes
for all using (public.is_admin()) with check (public.is_admin());

create index if not exists crm_leads_stage_idx on public.crm_leads(stage);
create index if not exists crm_leads_follow_up_idx on public.crm_leads(next_follow_up_at);
create index if not exists crm_notes_lead_idx on public.crm_notes(lead_id);

-- =========================================================
-- 4. PROPERTY MANAGEMENT
-- =========================================================
create table if not exists public.properties (
  id bigint generated by default as identity primary key,
  title text not null,
  slug text unique,
  address text,
  city text not null,
  state text not null default 'TX',
  zip text not null,
  county text,
  price numeric(12,2) not null check (price >= 0),
  beds numeric(4,1) not null default 0,
  baths numeric(4,1) not null default 0,
  sqft integer not null default 0,
  lot_sqft integer,
  year_built integer,
  property_type text not null default 'Single Family',
  category text not null default 'Residential' check (category in ('Residential','Commercial','Land','Multi-family','Luxury')),
  status text not null default 'draft' check (status in ('draft','active','pending','sold','archived')),
  badge text check (badge is null or badge in ('Featured','New','Open House','Pending','Sold')),
  description text,
  features text[] not null default '{}',
  featured boolean not null default false,
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_images (
  id bigint generated by default as identity primary key,
  property_id bigint not null references public.properties(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;
alter table public.property_images enable row level security;

create index if not exists properties_public_idx on public.properties(published,status,featured);
create index if not exists properties_location_idx on public.properties(city,zip);
create index if not exists property_images_property_idx on public.property_images(property_id,sort_order);

drop policy if exists "Public reads published properties" on public.properties;
create policy "Public reads published properties" on public.properties
for select using ((published = true and status <> 'archived') or public.is_admin());

drop policy if exists "Admins insert properties" on public.properties;
create policy "Admins insert properties" on public.properties
for insert with check (public.is_admin());

drop policy if exists "Admins update properties" on public.properties;
create policy "Admins update properties" on public.properties
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete properties" on public.properties;
create policy "Admins delete properties" on public.properties
for delete using (public.is_admin());

drop policy if exists "Public reads images for published properties" on public.property_images;
create policy "Public reads images for published properties" on public.property_images
for select using (
  exists (
    select 1 from public.properties p
    where p.id = property_id and (p.published = true or public.is_admin())
  )
);

drop policy if exists "Admins insert property images" on public.property_images;
create policy "Admins insert property images" on public.property_images
for insert with check (public.is_admin());

drop policy if exists "Admins update property images" on public.property_images;
create policy "Admins update property images" on public.property_images
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete property images" on public.property_images;
create policy "Admins delete property images" on public.property_images
for delete using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public reads property image objects" on storage.objects;
create policy "Public reads property image objects" on storage.objects
for select using (bucket_id = 'property-images');

drop policy if exists "Admins upload property image objects" on storage.objects;
create policy "Admins upload property image objects" on storage.objects
for insert with check (bucket_id = 'property-images' and public.is_admin());

drop policy if exists "Admins update property image objects" on storage.objects;
create policy "Admins update property image objects" on storage.objects
for update using (bucket_id = 'property-images' and public.is_admin());

drop policy if exists "Admins delete property image objects" on storage.objects;
create policy "Admins delete property image objects" on storage.objects
for delete using (bucket_id = 'property-images' and public.is_admin());

-- Finished. After signing up, promote your account with:
-- update public.profiles set role = 'admin', updated_at = now() where email = 'YOUR_EMAIL@example.com';

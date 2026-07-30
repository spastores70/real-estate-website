-- Texas Home Hub Pro V2 Admin CRM V1
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

alter table public.showing_requests add column if not exists internal_notes text;
alter table public.showing_requests add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
alter table public.showing_requests add column if not exists next_follow_up_at timestamptz;

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

drop trigger if exists crm_leads_touch_updated_at on public.crm_leads;
create trigger crm_leads_touch_updated_at
before update on public.crm_leads
for each row execute procedure public.touch_updated_at();

alter table public.crm_leads enable row level security;
alter table public.crm_notes enable row level security;

create policy "Admins manage profiles" on public.profiles
for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage showing requests" on public.showing_requests
for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins read saved activity" on public.saved_properties
for select using (public.is_admin());
create policy "Admins manage CRM leads" on public.crm_leads
for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage CRM notes" on public.crm_notes
for all using (public.is_admin()) with check (public.is_admin());

create index if not exists crm_leads_stage_idx on public.crm_leads(stage);
create index if not exists crm_leads_follow_up_idx on public.crm_leads(next_follow_up_at);
create index if not exists crm_notes_lead_idx on public.crm_notes(lead_id);
create index if not exists showing_requests_status_idx on public.showing_requests(status);

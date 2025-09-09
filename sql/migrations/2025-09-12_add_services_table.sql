-- 2025-09-12_add_services_table.sql
-- Idempotent migration to add services table with indexes and RLS policies
set search_path = public;

-- Table
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,
  name text not null,
  description text,
  unitprice numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Helpful index for filtering and ordering
create index if not exists idx_services_business_name on public.services (businessid, name);

-- RLS
alter table public.services enable row level security;

drop policy if exists "Allow read services for business owner" on public.services;
create policy "Allow read services for business owner" on public.services
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert services for business owner" on public.services;
create policy "Allow insert services for business owner" on public.services
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update services for business owner" on public.services;
create policy "Allow update services for business owner" on public.services
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete services for business owner" on public.services;
create policy "Allow delete services for business owner" on public.services
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  );

-- Grants
grant select, insert, update, delete on table public.services to authenticated;

-- Reload PostgREST cache
select pg_notify('pgrst', 'reload schema');

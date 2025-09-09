-- 2025-09-12_add_customers_table.sql
-- Idempotent migration to add customers table with indexes and RLS policies
set search_path = public;

-- Table
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,

  -- display and basic info
  name text not null,
  code text,
  address text,

  -- contact type
  contact_type text not null check (contact_type in ('corporate','individual')),

  -- corporate fields
  legal_entity_type text,
  company_name text,
  branch_type text check (branch_type in ('main','branch','unspecified')),
  branch_number text,

  -- individual fields
  prefix text,
  first_name text,
  last_name text,

  -- tax and address details
  tax_id text,
  street_address text,
  subdistrict text,
  district text,
  province text,
  postal_code text,

  -- contact info
  contact_person text,
  email text,
  phone text,
  website text,
  fax text,

  created_at timestamptz not null default now()
);

-- Helpful index for filtering and ordering
create index if not exists idx_customers_business_name on public.customers (businessid, name);

-- RLS
alter table public.customers enable row level security;

drop policy if exists "Allow read customers for business owner" on public.customers;
create policy "Allow read customers for business owner" on public.customers
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert customers for business owner" on public.customers;
create policy "Allow insert customers for business owner" on public.customers
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update customers for business owner" on public.customers;
create policy "Allow update customers for business owner" on public.customers
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete customers for business owner" on public.customers;
create policy "Allow delete customers for business owner" on public.customers
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  );

-- Grants
grant select, insert, update, delete on table public.customers to authenticated;

-- Reload PostgREST cache
select pg_notify('pgrst', 'reload schema');

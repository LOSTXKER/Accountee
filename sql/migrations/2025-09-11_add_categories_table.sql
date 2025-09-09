-- 2025-09-11_add_categories_table.sql
-- Idempotent migration to add categories table with indexes and RLS policies
set search_path = public;

-- Table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,
  name text not null,
  type text not null check (type in ('income','expense','cogs')),
  parent_id uuid null references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_categories_business_name on public.categories (businessid, name);
create index if not exists idx_categories_parent on public.categories (parent_id);

-- RLS
alter table public.categories enable row level security;

drop policy if exists "Allow read categories for business owner" on public.categories;
create policy "Allow read categories for business owner" on public.categories
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert categories for business owner" on public.categories;
create policy "Allow insert categories for business owner" on public.categories
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update categories for business owner" on public.categories;
create policy "Allow update categories for business owner" on public.categories
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete categories for business owner" on public.categories;
create policy "Allow delete categories for business owner" on public.categories
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  );

grant select, insert, update, delete on table public.categories to authenticated;

-- PostgREST schema cache reload (no-op in psql, but useful as a reminder)
-- select pg_notify('pgrst', 'reload schema');

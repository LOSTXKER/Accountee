-- 2025-09-12_add_recurring_transactions_table.sql
-- Idempotent migration to add recurring_transactions with indexes, FKs, RLS and grants
set search_path = public;

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,
  user_id uuid not null,
  description text not null,
  amount numeric not null,
  type text not null check (type in ('income','expense')),
  frequency text not null check (frequency in ('daily','weekly','monthly','yearly')),
  start_date date not null,
  end_date date,
  category_id uuid references public.categories(id) on delete set null,
  last_created_date date,
  next_due_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_recurring_business_created on public.recurring_transactions (businessid, created_at desc);
create index if not exists idx_recurring_business_next_due on public.recurring_transactions (businessid, next_due_date);

-- RLS
alter table public.recurring_transactions enable row level security;

drop policy if exists "Allow read recurring for business owner" on public.recurring_transactions;
create policy "Allow read recurring for business owner" on public.recurring_transactions
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert recurring for business owner" on public.recurring_transactions;
create policy "Allow insert recurring for business owner" on public.recurring_transactions
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update recurring for business owner" on public.recurring_transactions;
create policy "Allow update recurring for business owner" on public.recurring_transactions
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete recurring for business owner" on public.recurring_transactions;
create policy "Allow delete recurring for business owner" on public.recurring_transactions
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

-- Grants
grant select, insert, update, delete on table public.recurring_transactions to authenticated;

-- Reload PostgREST cache
select pg_notify('pgrst', 'reload schema');

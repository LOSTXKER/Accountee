-- 2025-09-10_add_document_counters_table.sql
-- Idempotent migration to add document_counters with RLS
set search_path = public;

create table if not exists public.document_counters (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  invoice_next_number integer not null default 1,
  quotation_next_number integer not null default 1,
  receipt_next_number integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.document_counters enable row level security;

drop policy if exists "Read counters for business owner" on public.document_counters;
create policy "Read counters for business owner" on public.document_counters
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = document_counters.business_id
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Insert counters for business owner" on public.document_counters;
create policy "Insert counters for business owner" on public.document_counters
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = document_counters.business_id
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Update counters for business owner" on public.document_counters;
create policy "Update counters for business owner" on public.document_counters
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = document_counters.business_id
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = document_counters.business_id
        and b.ownerid = auth.uid()
    )
  );

grant select, insert, update on table public.document_counters to authenticated;

-- Refresh PostgREST schema
select pg_notify('pgrst', 'reload schema');

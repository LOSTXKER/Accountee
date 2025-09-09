-- 2025-09-12_rls_sales_documents_and_transactions.sql
-- Idempotent RLS policies for sales_documents and transactions based on businesses.ownerid
set search_path = public;

-- sales_documents
alter table if exists public.sales_documents enable row level security;

drop policy if exists "Allow read sales_documents for business owner" on public.sales_documents;
create policy "Allow read sales_documents for business owner" on public.sales_documents
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = sales_documents.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert sales_documents for business owner" on public.sales_documents;
create policy "Allow insert sales_documents for business owner" on public.sales_documents
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = sales_documents.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update sales_documents for business owner" on public.sales_documents;
create policy "Allow update sales_documents for business owner" on public.sales_documents
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = sales_documents.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = sales_documents.businessid
        and b.ownerid = auth.uid()
    )
  );

grant select, insert, update on table public.sales_documents to authenticated;

-- transactions
alter table if exists public.transactions enable row level security;

drop policy if exists "Allow read transactions for business owner" on public.transactions;
create policy "Allow read transactions for business owner" on public.transactions
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert transactions for business owner" on public.transactions;
create policy "Allow insert transactions for business owner" on public.transactions
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update transactions for business owner" on public.transactions;
create policy "Allow update transactions for business owner" on public.transactions
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = transactions.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete transactions for business owner" on public.transactions;
create policy "Allow delete transactions for business owner" on public.transactions
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

grant select, insert, update, delete on table public.transactions to authenticated;

-- Reload PostgREST cache
select pg_notify('pgrst', 'reload schema');

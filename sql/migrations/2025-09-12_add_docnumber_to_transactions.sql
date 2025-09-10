-- 2025-09-12_add_docnumber_to_transactions.sql
-- Add docnumber column to transactions and create unique index per business
set search_path = public;

alter table if exists public.transactions
  add column if not exists docnumber text;

create unique index if not exists uq_transactions_business_docnumber
  on public.transactions (businessid, docnumber) where docnumber is not null;

-- Refresh PostgREST schema
select pg_notify('pgrst', 'reload schema');

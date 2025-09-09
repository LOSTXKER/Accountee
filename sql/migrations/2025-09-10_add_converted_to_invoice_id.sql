-- Migration: add converted_to_invoice_id to sales_documents (idempotent)
set search_path = public;

-- Add column if missing
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sales_documents'
      and column_name = 'converted_to_invoice_id'
  ) then
    alter table public.sales_documents
      add column converted_to_invoice_id uuid;
  end if;
end$$;

-- Index to speed up reverse lookups
create index if not exists idx_sales_documents_converted_to_invoice_id
  on public.sales_documents (converted_to_invoice_id);

-- Ask PostgREST to reload schema
select pg_notify('pgrst', 'reload schema');

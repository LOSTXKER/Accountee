-- 2025-09-12_fix_unique_index_sales_documents.sql
-- Make docnumber unique per business, not globally
set search_path = public;

-- Drop old unique index if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'i'
          AND c.relname = 'uq_sales_documents_docnumber'
          AND n.nspname = 'public'
    ) THEN
        EXECUTE 'drop index if exists public.uq_sales_documents_docnumber';
    END IF;
END$$;

-- Create new unique index per business
create unique index if not exists uq_sales_documents_business_docnumber on public.sales_documents (businessid, docnumber);

-- Refresh PostgREST schema
select pg_notify('pgrst', 'reload schema');

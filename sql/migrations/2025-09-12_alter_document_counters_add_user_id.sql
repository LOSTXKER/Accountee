-- 2025-09-12_alter_document_counters_add_user_id.sql
-- Idempotently add user_id column to document_counters for UI upsert compatibility
set search_path = public;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_counters' and column_name = 'user_id'
  ) then
    -- already exists
    null;
  else
    alter table public.document_counters add column user_id uuid;
  end if;
end$$;

-- No policy changes needed, RLS remains scoped by business owner via businesses.ownerid
select pg_notify('pgrst', 'reload schema');

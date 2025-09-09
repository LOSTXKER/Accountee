-- 2025-09-11_fix_document_status_enum_label.sql
-- Safely rename the misspelled Thai enum label from 'เกิดกำหนด' to 'เกินกำหนด'
set search_path = public;

-- Only perform rename if the old value exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'document_status' AND e.enumlabel = 'เกิดกำหนด'
  ) THEN
    ALTER TYPE public.document_status RENAME VALUE 'เกิดกำหนด' TO 'เกินกำหนด';
  END IF;
END$$;

-- Optional: force PostgREST to reload schema cache
-- select pg_notify('pgrst', 'reload schema');

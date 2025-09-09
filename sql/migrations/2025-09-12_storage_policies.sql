-- 2025-09-12_storage_policies.sql
-- Allow authenticated users to upload to required buckets
set search_path = storage;

-- Ensure schema usage
grant usage on schema storage to authenticated;

-- Objects table policies (RLS is enabled by default on storage.objects)
drop policy if exists "Read app buckets" on storage.objects;
create policy "Read app buckets" on storage.objects
  for select to authenticated
  using ( bucket_id in ('attachments','wht_certificates','business_assets','files') );

drop policy if exists "Upload to app buckets" on storage.objects;
create policy "Upload to app buckets" on storage.objects
  for insert to authenticated
  with check ( bucket_id in ('attachments','wht_certificates','business_assets','files') );

drop policy if exists "Update own objects in app buckets" on storage.objects;
create policy "Update own objects in app buckets" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('attachments','wht_certificates','business_assets','files')
    and (owner = auth.uid())
  )
  with check (
    bucket_id in ('attachments','wht_certificates','business_assets','files')
    and (owner = auth.uid())
  );

drop policy if exists "Delete own objects in app buckets" on storage.objects;
create policy "Delete own objects in app buckets" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('attachments','wht_certificates','business_assets','files')
    and (owner = auth.uid())
  );

-- Switch back to public for cache reload
set search_path = public;
select pg_notify('pgrst', 'reload schema');

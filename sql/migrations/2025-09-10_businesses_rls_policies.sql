-- RLS policies and grants for public.businesses
set search_path = public;

-- Ensure roles have basic access
grant usage on schema public to anon, authenticated;
-- DML privileges for authenticated users
grant select, insert, update on table public.businesses to authenticated;

-- Policy: select own businesses
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'businesses' and policyname = 'select_own_businesses'
  ) then
    create policy select_own_businesses
      on public.businesses
      for select
      to authenticated
      using (ownerid = auth.uid());
  end if;
end$$;

-- Policy: insert own business
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'businesses' and policyname = 'insert_own_business'
  ) then
    create policy insert_own_business
      on public.businesses
      for insert
      to authenticated
      with check (ownerid = auth.uid());
  end if;
end$$;

-- Policy: update own business
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'businesses' and policyname = 'update_own_business'
  ) then
    create policy update_own_business
      on public.businesses
      for update
      to authenticated
      using (ownerid = auth.uid())
      with check (ownerid = auth.uid());
  end if;
end$$;

-- Optional: prevent deletes by default (no policy created)
-- If you need delete later, add a similar policy with constraints.

-- Reload PostgREST cache
select pg_notify('pgrst', 'reload schema');

-- sql/app_functions.sql
-- Additional RPC functions required by the application
-- Run this after creating your new Supabase project

set search_path = public;

-- ===============================
-- Helper: drop existing to allow re-deploy
-- ===============================
drop function if exists public.get_export_transactions(uuid, timestamptz, timestamptz, text, integer, integer);
drop function if exists public.get_profit_loss_summary(uuid, timestamptz, timestamptz);
drop function if exists public.get_wht_summary(uuid, timestamptz, timestamptz);
drop function if exists public.get_dashboard_stats(uuid, int);

-- ===============================
-- 1) get_export_transactions
-- Returns paginated transactions with filters
-- ===============================
create or replace function public.get_export_transactions(
  p_business_id uuid,
  p_start_date timestamptz,
  p_end_date   timestamptz,
  p_type       text default null, -- 'income' | 'expense' | null
  p_limit      integer default 1000,
  p_offset     integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total bigint := 0;
begin
  -- Total count with same filters
  with base as (
    select *
    from transactions t
    where t.businessid = p_business_id
      and coalesce(t.isdeleted, false) = false
      and t.date >= p_start_date
      and t.date < (p_end_date + interval '1 day')
      and (p_type is null or (lower(p_type) = 'income' and t.type = 'income')
           or (lower(p_type) = 'expense' and t.type in ('expense','cogs'))
           or (lower(p_type) not in ('income','expense')))
      and t.status <> 'ยกเลิก'
  )
  select count(*) into v_total from base;

  return jsonb_build_object(
    'transactions', coalesce((
      select jsonb_agg(row_to_json(r))
      from (
        select * from (
          select b.*
          from (
            select * from transactions t
            where t.businessid = p_business_id
              and coalesce(t.isdeleted, false) = false
              and t.date >= p_start_date
              and t.date < (p_end_date + interval '1 day')
              and (p_type is null or (lower(p_type) = 'income' and t.type = 'income')
                   or (lower(p_type) = 'expense' and t.type in ('expense','cogs'))
                   or (lower(p_type) not in ('income','expense')))
              and t.status <> 'ยกเลิก'
            order by t.date desc
          ) as b
        ) q
        limit greatest(p_limit, 1)
        offset greatest(p_offset, 0)
      ) r
    ), '[]'::jsonb),
    'pagination', jsonb_build_object(
      'total', v_total,
      'limit', p_limit,
      'offset', p_offset,
      'hasMore', (v_total > (p_offset + p_limit))
    )
  );
end;
$$;

grant execute on function public.get_export_transactions(uuid, timestamptz, timestamptz, text, integer, integer) to anon, authenticated, service_role;


-- ===============================
-- 2) get_profit_loss_summary
-- Aggregated P&L for a date range
-- ===============================
create or replace function public.get_profit_loss_summary(
  p_business_id uuid,
  p_start_date timestamptz,
  p_end_date   timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_income numeric := 0;
  v_expense numeric := 0;
  v_cogs numeric := 0;
begin
  select coalesce(sum(amount),0) into v_income
    from transactions
   where businessid = p_business_id
     and coalesce(isdeleted, false) = false
     and date >= p_start_date and date < (p_end_date + interval '1 day')
     and type = 'income'
     and status <> 'ยกเลิก';

  select coalesce(sum(amount),0) into v_expense
    from transactions
   where businessid = p_business_id
     and coalesce(isdeleted, false) = false
     and date >= p_start_date and date < (p_end_date + interval '1 day')
     and type = 'expense'
     and status <> 'ยกเลิก';

  select coalesce(sum(amount),0) into v_cogs
    from transactions
   where businessid = p_business_id
     and coalesce(isdeleted, false) = false
     and date >= p_start_date and date < (p_end_date + interval '1 day')
     and type = 'cogs'
     and status <> 'ยกเลิก';

  return jsonb_build_object(
    'total_income', v_income,
    'total_expense', v_expense,
    'total_cogs', v_cogs,
    'net_profit', (v_income - (v_expense + v_cogs))
  );
end;
$$;

grant execute on function public.get_profit_loss_summary(uuid, timestamptz, timestamptz) to anon, authenticated, service_role;


-- ===============================
-- 3) get_wht_summary
-- Withholding tax high-level summary for a date range (optional dates)
-- ===============================
create or replace function public.get_wht_summary(
  p_business_id uuid,
  p_start_date timestamptz default null,
  p_end_date   timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total_wht numeric := 0;
  v_count bigint := 0;
begin
  with base as (
    select * from transactions t
     where t.businessid = p_business_id
       and coalesce(t.isdeleted, false) = false
       and coalesce(t.withholdingtax, 0) > 0
       and (p_start_date is null or t.date >= p_start_date)
       and (p_end_date   is null or t.date < (p_end_date + interval '1 day'))
       and t.status <> 'ยกเลิก'
  )
  select coalesce(sum(withholdingtax),0), count(*) into v_total_wht, v_count from base;

  return jsonb_build_object(
    'total_wht_amount', v_total_wht,
    'transactions_with_wht', v_count,
    'period', jsonb_build_object('start', p_start_date, 'end', p_end_date)
  );
end;
$$;

grant execute on function public.get_wht_summary(uuid, timestamptz, timestamptz) to anon, authenticated, service_role;


-- ===============================
-- 4) get_dashboard_stats
-- Lightweight summary for dashboard over the last N days
-- ===============================
create or replace function public.get_dashboard_stats(
  p_business_id uuid,
  p_period_days int default 30
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with recent as (
    select * from transactions
     where businessid = p_business_id
       and coalesce(isdeleted, false) = false
       and date >= (now() - make_interval(days => p_period_days))
       and status <> 'ยกเลิก'
  )
  select jsonb_build_object(
    'total', (select count(*) from recent),
    'income_count', (select count(*) from recent where type = 'income'),
    'expense_count', (select count(*) from recent where type in ('expense','cogs')),
    'sum_income', (select coalesce(sum(amount),0) from recent where type = 'income'),
    'sum_expense', (select coalesce(sum(amount),0) from recent where type in ('expense','cogs')),
    'sum_wht', (select coalesce(sum(withholdingtax),0) from recent where coalesce(withholdingtax,0) > 0),
    'net', (
      (select coalesce(sum(amount),0) from recent where type = 'income')
      - (select coalesce(sum(amount),0) from recent where type in ('expense','cogs'))
    )
  );
$$;

grant execute on function public.get_dashboard_stats(uuid, int) to anon, authenticated, service_role;

-- Ask PostgREST to reload schema
select pg_notify('pgrst', 'reload schema');

-- ===============================
-- 5) get_table_columns (introspection helper for scripts)
-- ===============================
drop function if exists public.get_table_columns(text);
create or replace function public.get_table_columns(
  p_table_name text
)
returns table (column_name text, data_type text, is_nullable text)
language sql
stable
set search_path = public
as $$
  select c.column_name, c.data_type, c.is_nullable
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = p_table_name
  order by c.ordinal_position;
$$;

grant execute on function public.get_table_columns(text) to anon, authenticated, service_role;

select pg_notify('pgrst', 'reload schema');

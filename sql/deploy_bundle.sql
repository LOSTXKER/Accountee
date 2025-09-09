-- deploy_bundle.sql
-- Generated at 2025-09-09T22:17:50.244Z
-- Paste this into Supabase SQL Editor and run.
-- Note: No transaction wrapper to allow CREATE EXTENSION.



-- ================= BOOTSTRAP =================

-- sql/bootstrap_schema.sql
-- Create required types and tables for a fresh Supabase project
-- Run this BEFORE running other function files

set search_path = public;

-- Enable UUID generation (compatible with Supabase)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============== ENUM TYPES ==============
do $$
begin
  if not exists (select 1 from pg_type where typname = 'sales_doc_type') then
    create type public.sales_doc_type as enum ('quotation','invoice','receipt','credit-note','debit-note','proforma');
  end if;
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type public.document_status as enum (
      'ฉบับร่าง',
      'รอตอบรับ',
      'ยอมรับแล้ว',
      'ปฏิเสธแล้ว',
      'รอชำระ',
      'ค้างชำระ',
      'ชำระแล้ว',
      'สมบูรณ์',
  'เกินกำหนด',
      'ยกเลิก'
    );
  end if;
end$$;

-- ============== TABLES ==============

-- sales_documents: used by sales document workflow RPCs
create table if not exists public.sales_documents (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,
  type public.sales_doc_type not null,
  docnumber text not null,
  customername text not null default '',
  customeraddress text not null default '',
  issuedate timestamptz not null default now(),
  duedate timestamptz,
  expirydate timestamptz,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  discountamount numeric not null default 0,
  vatamount numeric not null default 0,
  withholdingtaxamount numeric not null default 0,
  grandtotal numeric not null default 0,
  status public.document_status not null default 'ฉบับร่าง',
  notes text,
  -- Optional linkage when converting a quotation → invoice (kept nullable for compatibility)
  converted_to_invoice_id uuid,
  relatedinvoiceid uuid,
  relatedreceiptid uuid,
  accepted_date timestamptz,
  created_at timestamptz not null default now()
);

-- Unique constraint to support docnumber collision handling
create unique index if not exists uq_sales_documents_docnumber on public.sales_documents (docnumber);

-- Helpful indexes similar to those added later by functions file
create index if not exists idx_sales_documents_biz_type_issuedate_desc on public.sales_documents (businessid, type, issuedate desc);
-- Helpful when checking conversion links
create index if not exists idx_sales_documents_converted_to_invoice_id on public.sales_documents (converted_to_invoice_id);
create index if not exists idx_sales_documents_relatedinvoiceid on public.sales_documents (relatedinvoiceid);
create index if not exists idx_sales_documents_relatedreceiptid on public.sales_documents (relatedreceiptid);


-- transactions: used by reports/dashboard/export RPCs
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,
  date timestamptz not null,
  description text not null,
  amount numeric not null default 0,
  type text not null check (type in ('income','expense','cogs')),
  category text not null default '',
  status text not null,
  attachment_status text,
  vat_type text,
  subtotal numeric not null default 0,
  vat_amount numeric not null default 0,
  document_attachments jsonb,
  slip_attachments jsonb,
  pending_documents jsonb,
  withholdingtax_rate numeric,
  withholdingtax numeric,
  wht_certificate_attachment jsonb,
  isdeleted boolean not null default false,
  created_at timestamptz not null default now(),
  source_recurring_id uuid,
  source_doc_id uuid,
  wht_rate numeric
);

-- Indexes to speed up common queries used by RPCs
create index if not exists idx_transactions_business_date on public.transactions (businessid, date desc) where isdeleted = false;
create index if not exists idx_transactions_type_business on public.transactions (type, businessid) where isdeleted = false;
create index if not exists idx_transactions_wht on public.transactions (businessid) where coalesce(withholdingtax,0) > 0 and isdeleted = false;

-- Optional: businesses table (minimal) for compatibility
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  ownerid uuid,
  businessname text not null,
  company_address text,
  tax_id text,
  logo_url text,
  bank_details text,
  invoice_prefix text,
  quotation_prefix text,
  receipt_prefix text,
  created_at timestamptz not null default now()
);

-- Make sure RLS can be configured later (left to project setup)
alter table public.sales_documents enable row level security;
alter table public.transactions enable row level security;
alter table public.businesses enable row level security;

-- RLS for sales_documents (owner of the business only)
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

-- RLS for transactions (owner of the business only)
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

-- categories: hierarchical categories for transactions (income/expense/cogs)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,
  name text not null,
  type text not null check (type in ('income','expense','cogs')),
  parent_id uuid null references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_categories_business_name on public.categories (businessid, name);
create index if not exists idx_categories_parent on public.categories (parent_id);

-- RLS for categories (owner of the business only)
alter table public.categories enable row level security;
drop policy if exists "Allow read categories for business owner" on public.categories;
create policy "Allow read categories for business owner" on public.categories
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert categories for business owner" on public.categories;
create policy "Allow insert categories for business owner" on public.categories
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update categories for business owner" on public.categories;
create policy "Allow update categories for business owner" on public.categories
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete categories for business owner" on public.categories;
create policy "Allow delete categories for business owner" on public.categories
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  );

grant select, insert, update, delete on table public.categories to authenticated;

-- customers: business contacts for sales/transactions
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,
  name text not null,
  code text,
  address text,
  contact_type text not null check (contact_type in ('corporate','individual')),
  legal_entity_type text,
  company_name text,
  branch_type text check (branch_type in ('main','branch','unspecified')),
  branch_number text,
  prefix text,
  first_name text,
  last_name text,
  tax_id text,
  street_address text,
  subdistrict text,
  district text,
  province text,
  postal_code text,
  contact_person text,
  email text,
  phone text,
  website text,
  fax text,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_business_name on public.customers (businessid, name);

-- RLS for customers (owner of the business only)
alter table public.customers enable row level security;
drop policy if exists "Allow read customers for business owner" on public.customers;
create policy "Allow read customers for business owner" on public.customers
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert customers for business owner" on public.customers;
create policy "Allow insert customers for business owner" on public.customers
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update customers for business owner" on public.customers;
create policy "Allow update customers for business owner" on public.customers
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete customers for business owner" on public.customers;
create policy "Allow delete customers for business owner" on public.customers
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  );

grant select, insert, update, delete on table public.customers to authenticated;

-- services: items/services catalog per business
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,
  name text not null,
  description text,
  unitprice numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_services_business_name on public.services (businessid, name);

-- RLS for services (owner of the business only)
alter table public.services enable row level security;
drop policy if exists "Allow read services for business owner" on public.services;
create policy "Allow read services for business owner" on public.services
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert services for business owner" on public.services;
create policy "Allow insert services for business owner" on public.services
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update services for business owner" on public.services;
create policy "Allow update services for business owner" on public.services
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete services for business owner" on public.services;
create policy "Allow delete services for business owner" on public.services
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  );

grant select, insert, update, delete on table public.services to authenticated;

-- recurring_transactions: scheduled income/expenses per business
create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,
  user_id uuid not null,
  description text not null,
  amount numeric not null,
  type text not null check (type in ('income','expense')),
  frequency text not null check (frequency in ('daily','weekly','monthly','yearly')),
  start_date date not null,
  end_date date,
  category_id uuid references public.categories(id) on delete set null,
  last_created_date date,
  next_due_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_recurring_business_created on public.recurring_transactions (businessid, created_at desc);
create index if not exists idx_recurring_business_next_due on public.recurring_transactions (businessid, next_due_date);

-- RLS for recurring_transactions
alter table public.recurring_transactions enable row level security;
drop policy if exists "Allow read recurring for business owner" on public.recurring_transactions;
create policy "Allow read recurring for business owner" on public.recurring_transactions
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert recurring for business owner" on public.recurring_transactions;
create policy "Allow insert recurring for business owner" on public.recurring_transactions
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update recurring for business owner" on public.recurring_transactions;
create policy "Allow update recurring for business owner" on public.recurring_transactions
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete recurring for business owner" on public.recurring_transactions;
create policy "Allow delete recurring for business owner" on public.recurring_transactions
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

grant select, insert, update, delete on table public.recurring_transactions to authenticated;

-- document_counters: per-business counters for document numbering
create table if not exists public.document_counters (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  invoice_next_number integer not null default 1,
  quotation_next_number integer not null default 1,
  receipt_next_number integer not null default 1,
  user_id uuid,
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

-- Done
select 'bootstrap_schema.sql applied' as status;



-- ================= MIGRATIONS =================


-- ---- 2025-09-10_add_converted_to_invoice_id.sql ----

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



-- ---- 2025-09-10_add_document_counters_table.sql ----

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



-- ---- 2025-09-10_businesses_rls_policies.sql ----

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



-- ---- 2025-09-11_add_categories_table.sql ----

-- 2025-09-11_add_categories_table.sql
-- Idempotent migration to add categories table with indexes and RLS policies
set search_path = public;

-- Table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,
  name text not null,
  type text not null check (type in ('income','expense','cogs')),
  parent_id uuid null references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_categories_business_name on public.categories (businessid, name);
create index if not exists idx_categories_parent on public.categories (parent_id);

-- RLS
alter table public.categories enable row level security;

drop policy if exists "Allow read categories for business owner" on public.categories;
create policy "Allow read categories for business owner" on public.categories
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert categories for business owner" on public.categories;
create policy "Allow insert categories for business owner" on public.categories
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update categories for business owner" on public.categories;
create policy "Allow update categories for business owner" on public.categories
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete categories for business owner" on public.categories;
create policy "Allow delete categories for business owner" on public.categories
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = categories.businessid
        and b.ownerid = auth.uid()
    )
  );

grant select, insert, update, delete on table public.categories to authenticated;

-- PostgREST schema cache reload (no-op in psql, but useful as a reminder)
-- select pg_notify('pgrst', 'reload schema');



-- ---- 2025-09-11_fix_document_status_enum_label.sql ----

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



-- ---- 2025-09-12_add_customers_table.sql ----

-- 2025-09-12_add_customers_table.sql
-- Idempotent migration to add customers table with indexes and RLS policies
set search_path = public;

-- Table
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,

  -- display and basic info
  name text not null,
  code text,
  address text,

  -- contact type
  contact_type text not null check (contact_type in ('corporate','individual')),

  -- corporate fields
  legal_entity_type text,
  company_name text,
  branch_type text check (branch_type in ('main','branch','unspecified')),
  branch_number text,

  -- individual fields
  prefix text,
  first_name text,
  last_name text,

  -- tax and address details
  tax_id text,
  street_address text,
  subdistrict text,
  district text,
  province text,
  postal_code text,

  -- contact info
  contact_person text,
  email text,
  phone text,
  website text,
  fax text,

  created_at timestamptz not null default now()
);

-- Helpful index for filtering and ordering
create index if not exists idx_customers_business_name on public.customers (businessid, name);

-- RLS
alter table public.customers enable row level security;

drop policy if exists "Allow read customers for business owner" on public.customers;
create policy "Allow read customers for business owner" on public.customers
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert customers for business owner" on public.customers;
create policy "Allow insert customers for business owner" on public.customers
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update customers for business owner" on public.customers;
create policy "Allow update customers for business owner" on public.customers
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete customers for business owner" on public.customers;
create policy "Allow delete customers for business owner" on public.customers
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = customers.businessid
        and b.ownerid = auth.uid()
    )
  );

-- Grants
grant select, insert, update, delete on table public.customers to authenticated;

-- Reload PostgREST cache
select pg_notify('pgrst', 'reload schema');



-- ---- 2025-09-12_add_recurring_transactions_table.sql ----

-- 2025-09-12_add_recurring_transactions_table.sql
-- Idempotent migration to add recurring_transactions with indexes, FKs, RLS and grants
set search_path = public;

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,
  user_id uuid not null,
  description text not null,
  amount numeric not null,
  type text not null check (type in ('income','expense')),
  frequency text not null check (frequency in ('daily','weekly','monthly','yearly')),
  start_date date not null,
  end_date date,
  category_id uuid references public.categories(id) on delete set null,
  last_created_date date,
  next_due_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_recurring_business_created on public.recurring_transactions (businessid, created_at desc);
create index if not exists idx_recurring_business_next_due on public.recurring_transactions (businessid, next_due_date);

-- RLS
alter table public.recurring_transactions enable row level security;

drop policy if exists "Allow read recurring for business owner" on public.recurring_transactions;
create policy "Allow read recurring for business owner" on public.recurring_transactions
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert recurring for business owner" on public.recurring_transactions;
create policy "Allow insert recurring for business owner" on public.recurring_transactions
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update recurring for business owner" on public.recurring_transactions;
create policy "Allow update recurring for business owner" on public.recurring_transactions
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete recurring for business owner" on public.recurring_transactions;
create policy "Allow delete recurring for business owner" on public.recurring_transactions
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = recurring_transactions.businessid
        and b.ownerid = auth.uid()
    )
  );

-- Grants
grant select, insert, update, delete on table public.recurring_transactions to authenticated;

-- Reload PostgREST cache
select pg_notify('pgrst', 'reload schema');



-- ---- 2025-09-12_add_services_table.sql ----

-- 2025-09-12_add_services_table.sql
-- Idempotent migration to add services table with indexes and RLS policies
set search_path = public;

-- Table
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  businessid uuid not null,
  name text not null,
  description text,
  unitprice numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Helpful index for filtering and ordering
create index if not exists idx_services_business_name on public.services (businessid, name);

-- RLS
alter table public.services enable row level security;

drop policy if exists "Allow read services for business owner" on public.services;
create policy "Allow read services for business owner" on public.services
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow insert services for business owner" on public.services;
create policy "Allow insert services for business owner" on public.services
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow update services for business owner" on public.services;
create policy "Allow update services for business owner" on public.services
  for update using (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  );

drop policy if exists "Allow delete services for business owner" on public.services;
create policy "Allow delete services for business owner" on public.services
  for delete using (
    exists (
      select 1 from public.businesses b
      where b.id = services.businessid
        and b.ownerid = auth.uid()
    )
  );

-- Grants
grant select, insert, update, delete on table public.services to authenticated;

-- Reload PostgREST cache
select pg_notify('pgrst', 'reload schema');



-- ---- 2025-09-12_alter_document_counters_add_user_id.sql ----

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



-- ---- 2025-09-12_rls_sales_documents_and_transactions.sql ----

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



-- ---- 2025-09-12_storage_policies.sql ----

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



-- ================= APP FUNCTIONS =================

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



-- ================= SALES DOCUMENT FUNCTIONS =================

-- sql/sales_document_functions.sql
-- Supabase RPC functions for sales documents
-- Deploy via Supabase SQL Editor: copy all and Run

-- Safety: ensure we are in public schema
set search_path = public;

-- Ensure required columns exist (idempotent)
alter table if exists public.sales_documents
  add column if not exists accepted_date timestamptz;

-- Backfill accepted_date for already accepted quotations (idempotent)
update public.sales_documents
   set accepted_date = coalesce(accepted_date, issuedate)
 where lower(type::text) = 'quotation'
   and status = 'ยอมรับแล้ว'
   and accepted_date is null;

-- Helpful indexes for common queries
create index if not exists idx_sales_documents_biz_type_issuedate_desc
  on public.sales_documents (businessid, type, issuedate desc);
create index if not exists idx_sales_documents_relatedinvoiceid
  on public.sales_documents (relatedinvoiceid);
create index if not exists idx_sales_documents_relatedreceiptid
  on public.sales_documents (relatedreceiptid);

-- Clean re-deploy: drop functions if they exist (to allow return type changes)
drop function if exists public.create_sales_document(
  uuid, text, jsonb, timestamptz, timestamptz, uuid,
  text, text, timestamptz, numeric, numeric, numeric, numeric, numeric, text, text, jsonb
);
-- Also drop the short/legacy signature to avoid RPC ambiguity
drop function if exists public.create_sales_document(
  uuid, text, jsonb, timestamptz, timestamptz, uuid
);
drop function if exists public.record_payment_and_create_receipt(uuid, uuid);
drop function if exists public.record_invoice_payment(uuid);
drop function if exists public.create_receipt_from_invoice(uuid, uuid, timestamptz);
drop function if exists public.get_sales_document_summary(uuid, int);
drop function if exists public.get_document_timeline(uuid);
drop function if exists public._next_docnumber(uuid, text, timestamptz);

-- Helper: generate next document number by type and year per business
create or replace function public._next_docnumber(
  p_business_id uuid,
  p_doc_type text,
  p_issue_date timestamptz default now()
)
returns text
language plpgsql
as $$
declare
  v_prefix text;
  v_year text := to_char(coalesce(p_issue_date, now()), 'YYYY');
  v_next int;
begin
  v_prefix := case lower(p_doc_type)
                when 'quotation' then 'QT'
                when 'invoice' then 'INV'
                when 'receipt' then 'RC'
                else 'DOC'
              end;

  -- Compute next sequence within year for business and type
  -- Use docnumber-based year parsing to avoid mismatches with issuedate year
  -- NOTE: Postgres regex is POSIX; use [0-9] instead of \d
  select coalesce(max((regexp_replace(docnumber, '^.*-', '')::int)), 0) + 1
    into v_next
  from sales_documents
  where businessid = p_business_id
    and docnumber ~ ('^' || v_prefix || '-' || v_year || '-[0-9]{4}$');

  return format('%s-%s-%s', v_prefix, v_year, lpad(v_next::text, 4, '0'));
end;
$$;

grant execute on function public._next_docnumber(uuid, text, timestamptz) to anon, authenticated, service_role;


-- 1.0) Accept quotation RPC: set status + accepted_date atomically
create or replace function public.accept_quotation(
  p_doc_id uuid,
  p_acceptance_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc sales_documents%rowtype;
begin
  select * into v_doc from sales_documents where id = p_doc_id for update;
  if not found then
    raise exception 'Quotation not found' using errcode = 'P0001';
  end if;
  if lower(v_doc.type::text) <> 'quotation' then
    raise exception 'Document is not a quotation' using errcode = 'P0001';
  end if;

  -- Idempotent: if already accepted and date present, return
  if v_doc.status = 'ยอมรับแล้ว' and v_doc.accepted_date is not null then
    return v_doc.id;
  end if;

  update sales_documents
     set status = 'ยอมรับแล้ว'::document_status,
         accepted_date = coalesce(p_acceptance_date, now())
   where id = v_doc.id;

  return v_doc.id;
end;
$$;

grant execute on function public.accept_quotation(uuid, timestamptz) to anon, authenticated, service_role;


-- 1) Create Sales Document
create or replace function public.create_sales_document(
  p_business_id uuid,
  p_doc_type text,
  p_common_data jsonb default '{}'::jsonb,
  p_due_date timestamptz default null,
  p_expiry_date timestamptz default null,
  p_source_doc_id uuid default null,
  -- compatibility explicit params (optional)
  p_customername text default null,
  p_customeraddress text default null,
  p_issuedate timestamptz default null,
  p_subtotal numeric default null,
  p_discountamount numeric default null,
  p_vatamount numeric default null,
  p_withholdingtaxamount numeric default null,
  p_grandtotal numeric default null,
  p_status text default null,
  p_notes text default null,
  p_items jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_issue_date timestamptz := coalesce(p_issuedate, (p_common_data->>'issuedate')::timestamptz, now());
  v_due_date  timestamptz := coalesce(p_due_date, (p_common_data->>'duedate')::timestamptz);
  v_expiry_date timestamptz := coalesce(p_expiry_date, (p_common_data->>'expirydate')::timestamptz);
  v_docnumber text := public._next_docnumber(p_business_id, p_doc_type, v_issue_date);
  v_customername text := coalesce(p_customername, p_common_data->>'customername', '');
  v_customeraddress text := coalesce(p_customeraddress, p_common_data->>'customeraddress', '');
  v_items jsonb := coalesce(p_items, p_common_data->'items', '[]'::jsonb);
  v_subtotal numeric := coalesce(p_subtotal, (p_common_data->>'subtotal')::numeric, 0);
  v_discountamount numeric := coalesce(p_discountamount, (p_common_data->>'discountamount')::numeric, 0);
  v_vatamount numeric := coalesce(p_vatamount, (p_common_data->>'vatamount')::numeric, 0);
  v_withholdingtaxamount numeric := coalesce(p_withholdingtaxamount, (p_common_data->>'withholdingtaxamount')::numeric, 0);
  v_grandtotal numeric := coalesce(p_grandtotal, (p_common_data->>'grandtotal')::numeric, 0);
  v_status text := coalesce(p_status, p_common_data->>'status', 'ฉบับร่าง');
  v_notes text := coalesce(p_notes, p_common_data->>'notes', '');
begin
  -- Insert with retry on unique_violation to avoid docnumber collision
  declare
    v_attempts int := 0;
  begin
    loop
      begin
        if lower(p_doc_type) = 'invoice' then
          insert into sales_documents (
            businessid, type, docnumber,
            customername, customeraddress,
            issuedate, duedate,
            items, subtotal, discountamount, vatamount, withholdingtaxamount, grandtotal,
            status, notes
          ) values (
            p_business_id, p_doc_type::sales_doc_type, v_docnumber,
            v_customername, v_customeraddress,
            v_issue_date, coalesce(v_due_date, v_issue_date),
            v_items, v_subtotal, v_discountamount, v_vatamount, v_withholdingtaxamount, v_grandtotal,
            v_status::document_status, v_notes
          ) returning id into v_id;
        else
          insert into sales_documents (
            businessid, type, docnumber,
            customername, customeraddress,
            issuedate, expirydate,
            items, subtotal, discountamount, vatamount, withholdingtaxamount, grandtotal,
            status, notes
          ) values (
            p_business_id, p_doc_type::sales_doc_type, v_docnumber,
            v_customername, v_customeraddress,
            v_issue_date, coalesce(v_expiry_date, v_issue_date),
            v_items, v_subtotal, v_discountamount, v_vatamount, v_withholdingtaxamount, v_grandtotal,
            v_status::document_status, v_notes
          ) returning id into v_id;
        end if;
        exit; -- success
      exception when unique_violation then
        v_attempts := v_attempts + 1;
        if v_attempts > 5 then
          raise; -- give up after a few attempts
        end if;
        -- recompute next docnumber and retry
        v_docnumber := public._next_docnumber(p_business_id, p_doc_type, v_issue_date);
      end;
    end loop;
  end;

  -- Link to source doc if provided (e.g., quotation -> invoice)
  if p_source_doc_id is not null and lower(p_doc_type) = 'invoice' then
    update sales_documents
      set relatedinvoiceid = v_id
      where id = p_source_doc_id and lower(type::text) = 'quotation';
  end if;

  return jsonb_build_object('id', v_id);
end;
$$;

grant execute on function public.create_sales_document(
  uuid, text, jsonb, timestamptz, timestamptz, uuid,
  text, text, timestamptz, numeric, numeric, numeric, numeric, numeric, text, text, jsonb
) to anon, authenticated, service_role;


-- 2) Record payment and create receipt from invoice
create or replace function public.record_payment_and_create_receipt(
  p_invoice_id uuid,
  p_business_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice record;
  v_receipt_id uuid;
  v_issue_date timestamptz := now();
  v_docnumber text;
begin
  select * into v_invoice from sales_documents where id = p_invoice_id and lower(type::text) = 'invoice';
  if not found then
    raise exception 'Invoice not found' using errcode = 'P0001';
  end if;

  -- Ensure invoice is payable and avoid duplicates
  if v_invoice.status <> 'รอชำระ'::document_status then
    -- Idempotent: if already paid and receipt exists, return it
    if v_invoice.status = 'ชำระแล้ว'::document_status and v_invoice.relatedreceiptid is not null then
      return v_invoice.relatedreceiptid;
    end if;
    raise exception 'Invoice not in payable status' using errcode = 'P0001';
  end if;

  -- If a receipt already exists for this invoice, return it
  if v_invoice.relatedreceiptid is not null then
    return v_invoice.relatedreceiptid;
  end if;

  -- Double-check via lookup (defensive)
  select id into v_receipt_id from sales_documents
   where relatedinvoiceid = v_invoice.id and lower(type::text) = 'receipt'
   limit 1;
  if v_receipt_id is not null then
    -- sync link on invoice if missing
    if v_invoice.relatedreceiptid is null then
      update sales_documents set relatedreceiptid = v_receipt_id, status = 'ชำระแล้ว'::document_status where id = v_invoice.id;
    end if;
    return v_receipt_id;
  end if;

  v_docnumber := public._next_docnumber(p_business_id, 'receipt', v_issue_date);

  insert into sales_documents (
    businessid, type, docnumber,
    customername, customeraddress,
    issuedate,
    items, subtotal, discountamount, vatamount, withholdingtaxamount, grandtotal,
    status, notes, relatedinvoiceid
  ) values (
    p_business_id, 'receipt'::sales_doc_type, v_docnumber,
    v_invoice.customername, v_invoice.customeraddress,
    v_issue_date,
    v_invoice.items, v_invoice.subtotal, v_invoice.discountamount, v_invoice.vatamount, v_invoice.withholdingtaxamount, v_invoice.grandtotal,
    'สมบูรณ์'::document_status, coalesce(v_invoice.notes, ''), v_invoice.id
  ) returning id into v_receipt_id;

  update sales_documents set status = 'ชำระแล้ว'::document_status, relatedreceiptid = v_receipt_id where id = v_invoice.id;

  return v_receipt_id;
end;
$$;

grant execute on function public.record_payment_and_create_receipt(uuid, uuid) to anon, authenticated, service_role;


-- 2.1) Record invoice payment only (no receipt creation)
create or replace function public.record_invoice_payment(
  p_invoice_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice record;
begin
  select * into v_invoice from sales_documents where id = p_invoice_id and lower(type::text) = 'invoice' for update;
  if not found then
    raise exception 'Invoice not found' using errcode = 'P0001';
  end if;

  if v_invoice.status = 'ชำระแล้ว'::document_status then
    -- idempotent
    return v_invoice.id;
  end if;

  if v_invoice.status <> 'รอชำระ'::document_status then
    raise exception 'Invoice not in payable status' using errcode = 'P0001';
  end if;

  update sales_documents set status = 'ชำระแล้ว'::document_status where id = v_invoice.id;
  return v_invoice.id;
end;
$$;

grant execute on function public.record_invoice_payment(uuid) to anon, authenticated, service_role;


-- 2.2) Create receipt from an invoice (explicit user action)
create or replace function public.create_receipt_from_invoice(
  p_invoice_id uuid,
  p_business_id uuid,
  p_issue_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice record;
  v_receipt_id uuid;
  v_docnumber text;
begin
  select * into v_invoice from sales_documents where id = p_invoice_id and lower(type::text) = 'invoice' for update;
  if not found then
    raise exception 'Invoice not found' using errcode = 'P0001';
  end if;

  -- Require invoice to be marked paid first
  if v_invoice.status <> 'ชำระแล้ว'::document_status then
    raise exception 'Invoice must be paid before creating a receipt' using errcode = 'P0001';
  end if;

  -- If a receipt already exists, return it (idempotent)
  if v_invoice.relatedreceiptid is not null then
    return v_invoice.relatedreceiptid;
  end if;

  -- Defensive lookup
  select id into v_receipt_id from sales_documents
   where relatedinvoiceid = v_invoice.id and lower(type::text) = 'receipt'
   limit 1;
  if v_receipt_id is not null then
    update sales_documents set relatedreceiptid = v_receipt_id where id = v_invoice.id and relatedreceiptid is null;
    return v_receipt_id;
  end if;

  v_docnumber := public._next_docnumber(p_business_id, 'receipt', coalesce(p_issue_date, now()));

  insert into sales_documents (
    businessid, type, docnumber,
    customername, customeraddress,
    issuedate,
    items, subtotal, discountamount, vatamount, withholdingtaxamount, grandtotal,
    status, notes, relatedinvoiceid
  ) values (
    p_business_id, 'receipt'::sales_doc_type, v_docnumber,
    v_invoice.customername, v_invoice.customeraddress,
    coalesce(p_issue_date, now()),
    v_invoice.items, v_invoice.subtotal, v_invoice.discountamount, v_invoice.vatamount, v_invoice.withholdingtaxamount, v_invoice.grandtotal,
    'สมบูรณ์'::document_status, coalesce(v_invoice.notes, ''), v_invoice.id
  ) returning id into v_receipt_id;

  update sales_documents set relatedreceiptid = v_receipt_id where id = v_invoice.id;
  return v_receipt_id;
end;
$$;

grant execute on function public.create_receipt_from_invoice(uuid, uuid, timestamptz) to anon, authenticated, service_role;


-- 3) Sales document summary (lightweight example)
create or replace function public.get_sales_document_summary(
  p_business_id uuid,
  p_period_days int default 30
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with recent as (
    select *
    from sales_documents
    where businessid = p_business_id
      and issuedate >= now() - make_interval(days => p_period_days)
  )
  select jsonb_build_object(
    'total', (select count(*) from recent),
  'quotation', (select count(*) from recent where lower(type::text) = 'quotation'),
  'invoice', (select count(*) from recent where lower(type::text) = 'invoice'),
  'receipt', (select count(*) from recent where lower(type::text) = 'receipt'),
    'sum_grandtotal', (select coalesce(sum(grandtotal),0) from recent)
  );
$$;

grant execute on function public.get_sales_document_summary(uuid, int) to anon, authenticated, service_role;


-- 4) Document timeline for a given document id
create or replace function public.get_document_timeline(
  p_doc_id uuid
)
returns setof sales_documents
language plpgsql
stable
set search_path = public
as $$
declare
  v_doc sales_documents%rowtype;
begin
  select * into v_doc from sales_documents where id = p_doc_id;
  if not found then
    return; -- empty set
  end if;

  -- Always return the current document first
  return next v_doc;

  if lower(v_doc.type::text) = 'quotation' then
    -- find linked invoice
    return query
      select * from sales_documents
    where relatedinvoiceid is not null and id = v_doc.relatedinvoiceid and lower(type::text) = 'invoice';
  elsif lower(v_doc.type::text) = 'invoice' then
    -- find originating quotation (if any)
    return query
      select * from sales_documents
    where relatedinvoiceid = v_doc.id and lower(type::text) = 'quotation';

    -- find receipt (if any)
    return query
      select * from sales_documents
    where id = v_doc.relatedreceiptid and lower(type::text) = 'receipt';
  elsif lower(v_doc.type::text) = 'receipt' then
    -- return linked invoice
    return query
      select * from sales_documents
      where id = v_doc.relatedinvoiceid;
  end if;
end;
$$;

grant execute on function public.get_document_timeline(uuid) to anon, authenticated, service_role;

-- Ask PostgREST to reload schema so new columns/functions are visible immediately
select pg_notify('pgrst', 'reload schema');

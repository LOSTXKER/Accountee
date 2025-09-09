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

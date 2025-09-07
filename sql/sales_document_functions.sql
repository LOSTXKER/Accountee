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

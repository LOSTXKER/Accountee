/**
 * E2E Sales Smoke Test
 * Usage: node scripts/e2e-sales-smoke.js <businessId>
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };

async function ensureBusiness(businessId) {
  const { data, error } = await supabase.from('businesses').select('*').eq('id', businessId).single();
  if (error) throw new Error('Business not found or error fetching business: ' + error.message);
  return data;
}

function buildItems() {
  const items = [
    { description: 'บริการทดสอบ', quantity: 1, unitPrice: 1000, amount: 1000 },
    { description: 'ค่าบริการเพิ่มเติม', quantity: 2, unitPrice: 250, amount: 500 }
  ];
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const discount = 0;
  const vat = +( (subtotal - discount) * 0.07 ).toFixed(2);
  const wht = 0;
  const grand = subtotal - discount + vat - wht;
  return { items, subtotal, discount, vat, wht, grand };
}

async function createQuotation(businessId) {
  const { items, subtotal, discount, vat, wht, grand } = buildItems();
  const issueDate = new Date();

  const payload = {
    p_business_id: businessId,
    p_doc_type: 'quotation',
    p_common_data: {
      customername: 'ลูกค้าทดสอบ',
      customeraddress: '123 ถนนสุขุมวิท กรุงเทพฯ',
      issuedate: issueDate.toISOString(),
      items,
      subtotal,
      discountamount: discount,
      vatamount: vat,
      withholdingtaxamount: wht,
      grandtotal: grand,
      status: 'รอตอบรับ',
      notes: 'E2E smoke test'
    }
  };

  const { data, error } = await supabase.rpc('create_sales_document', payload);
  if (error) throw error;
  const id = data.id;
  const { data: doc, error: fetchErr } = await supabase.from('sales_documents').select('*').eq('id', id).single();
  if (fetchErr) throw fetchErr;
  return doc;
}

async function acceptQuotation(quotationId) {
  const { error } = await supabase.rpc('accept_quotation', { p_doc_id: quotationId, p_acceptance_date: new Date().toISOString() });
  if (error) throw error;
}

async function createInvoiceFromQuotation(businessId, quotationDoc) {
  const { items, subtotal, discount, vat, wht, grand } = buildItems();
  const issueDate = new Date();
  const dueDate = addDays(issueDate, 7);

  const payload = {
    p_business_id: businessId,
    p_doc_type: 'invoice',
    p_common_data: {
      customername: quotationDoc.customername || 'ลูกค้าทดสอบ',
      customeraddress: quotationDoc.customeraddress || '123 ถนนสุขุมวิท กรุงเทพฯ',
      issuedate: issueDate.toISOString(),
      items,
      subtotal,
      discountamount: discount,
      vatamount: vat,
      withholdingtaxamount: wht,
      grandtotal: grand,
      status: 'รอชำระ',
      notes: 'E2E smoke test (invoice)'
    },
    p_due_date: dueDate.toISOString(),
    p_source_doc_id: quotationDoc.id
  };

  const { data, error } = await supabase.rpc('create_sales_document', payload);
  if (error) throw error;
  const id = data.id;
  const { data: doc, error: fetchErr } = await supabase.from('sales_documents').select('*').eq('id', id).single();
  if (fetchErr) throw fetchErr;
  return doc;
}

async function recordPayment(businessId, invoiceId) {
  const { data, error } = await supabase.rpc('record_payment_and_create_receipt', {
    p_invoice_id: invoiceId,
    p_business_id: businessId,
  });
  if (error) throw error;
  const receiptId = data;
  const { data: doc, error: fetchErr } = await supabase.from('sales_documents').select('*').eq('id', receiptId).single();
  if (fetchErr) throw fetchErr;
  return doc;
}

(async function main() {
  try {
    const businessId = process.argv[2];
    if (!businessId) {
      console.error('Usage: node scripts/e2e-sales-smoke.js <businessId>');
      process.exit(1);
    }

    console.log('🔍 Checking business..');
    const biz = await ensureBusiness(businessId);
    console.log('✅ Business found:', biz.businessname || biz.name || biz.id);

    console.log('\n🧾 Creating quotation..');
    const quotation = await createQuotation(businessId);
    console.log('✅ Quotation:', quotation.docnumber || quotation.doc_number, quotation.status);

    console.log('✔ Mark as accepted..');
    await acceptQuotation(quotation.id);
    await sleep(300);
    const { data: q2 } = await supabase.from('sales_documents').select('status').eq('id', quotation.id).single();
    console.log('✅ Quotation status:', q2?.status);

    console.log('\n🧾 Creating invoice from quotation..');
    const invoice = await createInvoiceFromQuotation(businessId, quotation);
    console.log('✅ Invoice:', invoice.docnumber || invoice.doc_number, invoice.status);

    console.log('\n💳 Recording payment (create receipt)..');
    const receipt = await recordPayment(businessId, invoice.id);
    console.log('✅ Receipt:', receipt.docnumber || receipt.doc_number, receipt.status);

    console.log('\n🎉 E2E smoke test completed successfully');
  } catch (err) {
    console.error('❌ E2E failed:', err.message, err);
    process.exit(1);
  }
})();

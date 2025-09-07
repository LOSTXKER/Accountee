/**
 * Health check for RPCs and key columns.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔎 Health check start');
  // Column check via a simple select limited
  const { data: colsErr, error: err1 } = await supabase
    .from('sales_documents')
    .select('id, status, issuedate, accepted_date, relatedinvoiceid, relatedreceiptid')
    .limit(1);
  console.log('Columns visible:', err1 ? '❌' : '✅');

  // RPC existence checks
  const rpcList = [
    { name: 'create_sales_document', args: { p_business_id: '00000000-0000-0000-0000-000000000000', p_doc_type: 'quotation' } },
    { name: 'record_payment_and_create_receipt', args: { p_invoice_id: '00000000-0000-0000-0000-000000000000', p_business_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'record_invoice_payment', args: { p_invoice_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'create_receipt_from_invoice', args: { p_invoice_id: '00000000-0000-0000-0000-000000000000', p_business_id: '00000000-0000-0000-0000-000000000000', p_issue_date: new Date().toISOString() } },
    { name: 'get_sales_document_summary', args: { p_business_id: '00000000-0000-0000-0000-000000000000', p_period_days: 7 } },
    { name: 'get_document_timeline', args: { p_doc_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'accept_quotation', args: { p_doc_id: '00000000-0000-0000-0000-000000000000', p_acceptance_date: new Date().toISOString() } },
  ];

  for (const rpc of rpcList) {
    const { error } = await supabase.rpc(rpc.name, rpc.args);
    if (!error) {
      console.log(`RPC ${rpc.name}: ✅`);
      continue;
    }
    // Treat missing function as failure
    if (error.code === '42883' || error.code === 'PGRST202') {
      console.log(`RPC ${rpc.name}: ❌ missing (${error.code})`);
      continue;
    }
    // Other errors imply function exists but bad args/data
    console.log(`RPC ${rpc.name}: ✅ (exists, returned ${error.code})`);
  }

  console.log('✅ Health check done');
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

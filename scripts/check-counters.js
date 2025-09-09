/**
 * Check existence and access to document_counters table
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔎 Checking document_counters table...');
  const { data, error } = await supabase
    .from('document_counters')
    .select('business_id, invoice_next_number, quotation_next_number, receipt_next_number')
    .limit(1);

  if (error) {
    console.log(`❌ Error: ${error.code || ''} ${error.message}`);
    if ((error.code || '').toUpperCase() === 'PGRST205' || /does not exist/i.test(error.message)) {
      console.log('Hint: Table may be missing. Apply sql/migrations/2025-09-10_add_document_counters_table.sql or run sql/bootstrap_schema.sql');
    }
    process.exit(1);
  }

  console.log('✅ Table exists. Sample rows:', data?.length || 0);
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { main };

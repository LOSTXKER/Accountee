const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async function main() {
  try {
    const payload = {
      businessname: 'E2E Test Business',
      company_address: '123 ถนนสุขุมวิท กรุงเทพฯ',
      tax_id: '0105555555555',
      invoice_prefix: 'INV-TEST-',
      quotation_prefix: 'QT-TEST-',
      receipt_prefix: 'RC-TEST-'
    };
    const { data, error } = await supabase
      .from('businesses')
      .insert(payload)
      .select('id, businessname')
      .single();
    if (error) throw error;
    console.log('✅ Created business:', data.id, data.businessname);
  } catch (e) {
    console.error('Failed to create test business:', e.message);
    process.exit(1);
  }
})();

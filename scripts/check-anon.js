const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, anon);

(async function main() {
  try {
    console.log('🔎 Checking anon connectivity...');
    const { data, error } = await supabase.rpc('get_dashboard_stats', {
      p_business_id: '00000000-0000-0000-0000-000000000000',
      p_period_days: 7,
    });
    if (error) {
      console.log('⚠️ RPC error (this can be okay if policies/data restrict):', error.code, error.message);
    } else {
      console.log('✅ RPC reachable via anon');
    }

    const { error: tblErr } = await supabase.from('businesses').select('id').limit(1);
    if (tblErr) {
      console.log('⚠️ Table query error (likely RLS/policy):', tblErr.code, tblErr.message);
    } else {
      console.log('✅ Table reachable via anon (policies allow)');
    }
  } catch (e) {
    console.error('❌ Failed to reach Supabase with anon:', e.message);
    process.exit(1);
  }
})();

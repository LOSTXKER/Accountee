/**
 * Check existence and basic access to recurring_transactions table
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
  console.log('🔎 Checking recurring_transactions table...');
  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .limit(1);

  if (error) {
    console.log(`❌ Error: ${error.code || ''} ${error.message}`);
    console.log('Hint: If code is PGRST205, the table does not exist in this project yet.');
    process.exit(1);
  }

  console.log('✅ Table exists and is accessible. Sample rows:', data?.length || 0);
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { main };

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async function main(){
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, businessname, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('No businesses found.');
      process.exit(0);
    }

    console.log('Businesses:');
    for (const b of data) {
      console.log(`- ${b.id} | ${b.businessname || ''} | ${b.created_at}`);
    }
  } catch (e) {
    console.error('Failed to list businesses:', e.message);
    process.exit(1);
  }
})();

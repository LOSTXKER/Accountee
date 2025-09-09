const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

(async function main(){
  try {
    const businessId = process.argv[2];
    const ownerId = process.argv[3];
    if (!businessId || !ownerId) {
      console.log('Usage: node scripts/set-business-owner.js <businessId> <ownerUserId>');
      process.exit(1);
    }
    const { error } = await supabase
      .from('businesses')
      .update({ ownerid: ownerId })
      .eq('id', businessId);
    if (error) throw error;
    console.log('✅ Set ownerid for business', businessId, 'to', ownerId);
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  }
})();

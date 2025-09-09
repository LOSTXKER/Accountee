/**
 * Bootstrap required Supabase Storage buckets for this app.
 * Usage: node scripts/bootstrap-storage.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function ensureBucket(name, options) {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw listErr;
  const exists = buckets?.some(b => b.name === name);
  if (exists) {
    console.log(`✓ Bucket exists: ${name}`);
    return;
  }
  console.log(`➕ Creating bucket: ${name}`);
  const { error: createErr } = await supabase.storage.createBucket(name, options);
  if (createErr) throw createErr;
  console.log(`✓ Created bucket: ${name}`);
}

async function main() {
  try {
    // Buckets used in codebase
    await ensureBucket('attachments', { public: true });
    await ensureBucket('wht_certificates', { public: true, allowedMimeTypes: ['application/pdf'], fileSizeLimit: 10 * 1024 * 1024 });
    await ensureBucket('business_assets', { public: true });
    await ensureBucket('files', { public: true });
    console.log('✅ Storage bootstrap completed');
  } catch (e) {
    console.error('❌ Bootstrap failed:', e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

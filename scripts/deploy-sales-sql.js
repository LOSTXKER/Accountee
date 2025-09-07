/**
 * Script to prepare deployment of sales-related SQL functions to Supabase
 * Usage: node scripts/deploy-sales-sql.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

(async function main() {
  try {
    const sqlPath = path.join(__dirname, '../sql/sales_document_functions.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ SQL file not found:', sqlPath);
      process.exit(1);
    }

    const content = fs.readFileSync(sqlPath, 'utf8');
    const tempPath = path.join(__dirname, '../temp-deploy.sql');
    fs.writeFileSync(tempPath, content);

    console.log('🚀 Sales SQL ready for deploy');
    console.log('📄 Source:', sqlPath);
    console.log('📝 Temp copy:', tempPath);

    console.log('\n📋 Manual Deployment Steps:');
    console.log('  1) Open Supabase Dashboard → SQL Editor');
    console.log('  2) Copy content from sql/sales_document_functions.sql');
    console.log('  3) Click Run');

    if (supabaseUrl) {
      const hint = `${supabaseUrl}`;
      console.log('\n🔗 Project URL (hint):');
      console.log('   ' + hint);
    }

    console.log('\nℹ️ This script does NOT execute SQL automatically (no execute_sql API).');
    console.log('   It prepares files and prints the exact steps for safety.');
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  }
})();

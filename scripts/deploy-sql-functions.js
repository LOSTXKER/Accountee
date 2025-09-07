/**
 * Script to deploy SQL performance functions to Supabase
 * Usage: node scripts/deploy-sql-functions.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deploySqlFunctions() {
    try {
        console.log('🚀 Deploying SQL performance functions to Supabase...\n');

        // Read the SQL file
        const sqlPath = path.join(__dirname, '../sql/performance_functions.sql');
        
        if (!fs.existsSync(sqlPath)) {
            throw new Error(`SQL file not found: ${sqlPath}`);
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📂 SQL file loaded successfully');
        console.log(`📏 File size: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);

        // Since Supabase doesn't have execute_sql, we'll provide instructions
        console.log('📋 Manual Deployment Instructions:');
        console.log('   1. Open Supabase Dashboard → SQL Editor');
        console.log('   2. Create a new query');
        console.log('   3. Copy and paste the SQL content from: sql/performance_functions.sql');
        console.log('   4. Click "Run" to execute the SQL');
        console.log('\n🔗 Supabase SQL Editor URL:');
        console.log(`   ${supabaseUrl.replace('supabase.co', 'supabase.co/project/' + supabaseUrl.split('.')[0].split('//')[1] + '/sql')}`);

        // Test if functions exist by calling them
        console.log('\n🧪 Testing existing functions...');
        
        // Test a simple function call
        try {
            const { data, error } = await supabase.rpc('get_dashboard_stats', {
                p_business_id: 'test',
                p_period_days: 30
            });
            
            if (error && error.code === '42883') {
                console.log('❌ Functions not found - manual deployment needed');
            } else if (error) {
                console.log('⚠️  Functions exist but may have errors:', error.message);
            } else {
                console.log('✅ Functions are working correctly!');
            }
        } catch (testError) {
            console.log('❌ Cannot test functions - deployment needed');
        }

        console.log('\n📝 SQL Content Preview:');
        console.log('─'.repeat(60));
        console.log(sqlContent.substring(0, 500) + '...');
        console.log('─'.repeat(60));

        // Write SQL to a temporary file for easy copying
        const tempSqlPath = path.join(__dirname, '../temp-deploy.sql');
        fs.writeFileSync(tempSqlPath, sqlContent);
        console.log(`\n📄 SQL file ready for copy-paste: ${tempSqlPath}`);

    } catch (error) {
        console.error('❌ Deployment preparation failed:', error.message);
        process.exit(1);
    }
}

// Alternative deployment method using psql (for reference)
function generatePsqlCommand() {
    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    
    if (dbUrl) {
        console.log('\n📋 Alternative: Deploy using psql command:');
        console.log(`   psql "${dbUrl}" -f sql/performance_functions.sql`);
    }
}

// Run the deployment
if (require.main === module) {
    deploySqlFunctions()
        .then(() => {
            generatePsqlCommand();
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Fatal error:', error.message);
            process.exit(1);
        });
}

module.exports = { deploySqlFunctions };

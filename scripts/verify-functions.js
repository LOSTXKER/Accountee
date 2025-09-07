/**
 * Simple script to verify SQL functions are deployed
 * Usage: node scripts/verify-functions.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyFunctions() {
    console.log('🔍 Verifying SQL functions...\n');

    const testBusinessId = '00000000-0000-0000-0000-000000000000'; // UUID null pattern for testing

    const functions = [
        {
            name: 'create_sales_document',
            test: () => supabase.rpc('create_sales_document', {
                p_business_id: testBusinessId,
                p_doc_type: 'quotation',
                p_common_data: { test: true }
            })
        },
        {
            name: 'get_document_timeline',
            test: () => supabase.rpc('get_document_timeline', {
                p_doc_id: testBusinessId
            })
        },
        {
            name: 'get_sales_document_summary',
            test: () => supabase.rpc('get_sales_document_summary', {
                p_business_id: testBusinessId,
                p_period_days: 30
            })
        },
        {
            name: 'get_dashboard_stats',
            test: () => supabase.rpc('get_dashboard_stats', {
                p_business_id: testBusinessId,
                p_period_days: 30
            })
        },
        {
            name: 'get_profit_loss_summary',
            test: () => supabase.rpc('get_profit_loss_summary', {
                p_business_id: testBusinessId,
                p_start_date: '2024-01-01',
                p_end_date: '2024-12-31'
            })
        }
    ];

    let allGood = true;

    for (const func of functions) {
        try {
            const { error } = await func.test();
            
            if (error && error.code === '42883') {
                console.log(`❌ ${func.name}: Function not found`);
                allGood = false;
            } else if (error && error.code === 'PGRST202') {
                console.log(`❌ ${func.name}: Function not found (PGRST202)`);
                allGood = false;
            } else if (error) {
                console.log(`⚠️  ${func.name}: Function exists but returned error (${error.code}): ${error.message}`);
                // This is actually good - function exists but test data caused an error
            } else {
                console.log(`✅ ${func.name}: Working correctly`);
            }
        } catch (testError) {
            console.log(`❌ ${func.name}: Test failed - ${testError.message}`);
            allGood = false;
        }
    }

    console.log('\n' + '='.repeat(50));
    if (allGood) {
        console.log('✅ All functions are deployed and accessible!');
    } else {
        console.log('❌ Some functions are missing. Please deploy the SQL functions:');
        console.log('   1. Open Supabase Dashboard → SQL Editor');
        console.log('   2. Copy content from sql/all_functions_deploy.sql');
        console.log('   3. Run the SQL query');
    }
}

if (require.main === module) {
    verifyFunctions().catch(console.error);
}

module.exports = { verifyFunctions };

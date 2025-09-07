/**
 * Check sales_documents table structure by querying actual data
 */

const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStructure() {
    console.log('📋 Checking sales_documents table structure...\n');

    try {
        // Try to get one record to see the structure
        const { data, error } = await supabase
            .from('sales_documents')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching data:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('Sample record structure:');
            console.log('========================');
            const record = data[0];
            Object.keys(record).forEach(key => {
                const value = record[key];
                const type = value === null ? 'null' : typeof value;
                console.log(`${key.padEnd(25)} | ${type.padEnd(15)} | ${value}`);
            });
        } else {
            console.log('No records found in sales_documents table');
            
            // Try to create a test record to see what columns are required
            console.log('\n🧪 Testing column requirements...');
            const testData = {
                businessid: '00000000-0000-0000-0000-000000000000',
                type: 'quotation',
                docnumber: 'TEST-001',
                customername: 'Test Customer',
                status: 'รอตอบรับ'
            };

            const { error: insertError } = await supabase
                .from('sales_documents')
                .insert(testData)
                .select();

            if (insertError) {
                console.log('Insert error reveals required columns:', insertError.message);
            }
        }

    } catch (error) {
        console.error('Table structure check failed:', error);
    }
}

if (require.main === module) {
    checkTableStructure().catch(console.error);
}

module.exports = { checkTableStructure };

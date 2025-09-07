/**
 * Check database schema for sales_documents table
 */

const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('📋 Checking sales_documents table schema...\n');

    try {
        // Check table columns
        const { data: columns, error } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'sales_documents')
            .order('ordinal_position');

        if (error) {
            console.error('Error fetching schema:', error);
            return;
        }

        console.log('Columns in sales_documents table:');
        console.log('=====================================');
        columns.forEach(col => {
            console.log(`${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Check for specific fields mentioned in error
        const problemFields = ['converted_to_invoice_id', 'relatedreceiptid', 'relatedinvoiceid'];
        console.log('\n🔍 Checking for specific relationship fields:');
        problemFields.forEach(field => {
            const exists = columns.find(col => col.column_name === field);
            console.log(`${field}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
        });

    } catch (error) {
        console.error('Schema check failed:', error);
    }
}

if (require.main === module) {
    checkSchema().catch(console.error);
}

module.exports = { checkSchema };

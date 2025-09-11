// Test script for WHT certificate generation with Thai text
const fetch = require('node-fetch');

async function testWHTGeneration() {
    try {
        console.log('🧪 Testing WHT certificate generation with Thai text...');
        
        // Mock data with Thai characters
        const testData = {
            transactionId: 'test-123',
            vendorData: {
                name: 'บริษัท ทดสอบ จำกัด',
                address: '123 ถนนสุขุมวิท กรุงเทพมหานคร 10110',
                taxId: '1234567890123'
            }
        };
        
        const response = await fetch('http://localhost:3001/api/generate-wht-certificate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ WHT certificate generated successfully!');
            console.log('📄 PDF URL:', result.url);
        } else {
            console.log('❌ Error:', result.error);
            console.log('📋 Details:', result.details);
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

// Note: This is a basic test script. 
// In a real scenario, you'd need valid transaction ID and database setup
console.log('⚠️  Note: This test requires a valid transaction ID in the database.');
console.log('📝 For actual testing, use the web interface with real data.');
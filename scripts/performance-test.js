// scripts/performance-test.js
// สคริปต์สำหรับทดสอบประสิทธิภาพของระบบรายงาน

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// ใช้ UUID ที่ถูกต้องสำหรับทดสอบ หรือจะหา business ID จริงจากฐานข้อมูล
const TEST_BUSINESS_ID = process.env.TEST_BUSINESS_ID || '00000000-0000-0000-0000-000000000000';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class PerformanceTest {
    constructor() {
        this.results = {};
        this.testBusinessId = null;
    }

    // หา business ID จริงจาก database
    async findTestBusinessId() {
        try {
            const { data: businesses, error } = await supabase
                .from('businesses')
                .select('id')
                .limit(1);

            if (error) throw error;

            if (businesses && businesses.length > 0) {
                this.testBusinessId = businesses[0].id;
                console.log(`📊 ใช้ Test Business ID: ${this.testBusinessId}`);
                return this.testBusinessId;
            }

            // ถ้าไม่มี business ใน database ให้สร้าง test business
            console.log('⚠️  ไม่พบ business ในฐานข้อมูล - ใช้ dummy UUID สำหรับทดสอบ');
            this.testBusinessId = '00000000-0000-0000-0000-000000000000';
            return this.testBusinessId;

        } catch (error) {
            console.log('⚠️  ไม่สามารถหา business ID ได้ - ใช้ dummy UUID:', error.message);
            this.testBusinessId = '00000000-0000-0000-0000-000000000000';
            return this.testBusinessId;
        }
    }

    async timeFunction(name, fn) {
        console.log(`🧪 Testing: ${name}`);
        const start = performance.now();
        
        try {
            const result = await fn();
            const end = performance.now();
            const duration = end - start;
            
            this.results[name] = {
                duration: duration.toFixed(2),
                status: 'success',
                dataSize: JSON.stringify(result).length
            };
            
            console.log(`✅ ${name}: ${duration.toFixed(2)}ms`);
            return result;
        } catch (error) {
            const end = performance.now();
            const duration = end - start;
            
            this.results[name] = {
                duration: duration.toFixed(2),
                status: 'error',
                error: error.message
            };
            
            console.log(`❌ ${name}: ${duration.toFixed(2)}ms (Error: ${error.message})`);
            throw error;
        }
    }

    // ทดสอบการดึงข้อมูลแบบเก่า (Client-side processing)
    async testOldProfitLoss() {
        return this.timeFunction('Old Profit Loss (Client-side)', async () => {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('type, amount')
                .eq('businessid', this.testBusinessId)
                .gte('date', '2024-01-01')
                .lte('date', '2024-12-31')
                .eq('isdeleted', false);

            if (error) throw error;

            // Client-side calculations
            const totalRevenue = transactions
                .filter(t => t.type === 'income')
                .reduce((acc, t) => acc + t.amount, 0);
            
            const totalCogs = transactions
                .filter(t => t.type === 'cogs')
                .reduce((acc, t) => acc + t.amount, 0);
                
            const totalExpenses = transactions
                .filter(t => t.type === 'expense')
                .reduce((acc, t) => acc + t.amount, 0);

            return {
                totalRevenue,
                totalCogs,
                totalExpenses,
                grossProfit: totalRevenue - totalCogs,
                netProfit: totalRevenue - totalCogs - totalExpenses,
                transactionCount: transactions.length
            };
        });
    }

    // ทดสอบการดึงข้อมูลแบบใหม่ (Server-side aggregation)
    async testNewProfitLoss() {
        return this.timeFunction('New Profit Loss (Server-side)', async () => {
            const { data, error } = await supabase.rpc('get_profit_loss_summary', {
                p_business_id: this.testBusinessId,
                p_start_date: '2024-01-01',
                p_end_date: '2024-12-31'
            });

            if (error) throw error;
            return data;
        });
    }

    // ทดสอบ WHT Report
    async testWhtReport() {
        return this.timeFunction('WHT Report', async () => {
            const { data, error } = await supabase.rpc('get_wht_summary', {
                p_business_id: this.testBusinessId
            });

            if (error) throw error;
            return data;
        });
    }

    // ทดสอบ Dashboard Stats
    async testDashboardStats() {
        return this.timeFunction('Dashboard Stats', async () => {
            const { data, error } = await supabase.rpc('get_dashboard_stats', {
                p_business_id: this.testBusinessId,
                p_period_days: 30
            });

            if (error) throw error;
            return data;
        });
    }

    // ทดสอบการดึงข้อมูล Transactions แบบ Pagination
    async testPaginatedTransactions() {
        return this.timeFunction('Paginated Transactions', async () => {
            const { data, error } = await supabase.rpc('get_export_transactions', {
                p_business_id: this.testBusinessId,
                p_start_date: '2024-01-01',
                p_end_date: '2024-12-31',
                p_limit: 100,
                p_offset: 0
            });

            if (error) throw error;
            return data;
        });
    }

    // ทดสอบ API Endpoints
    async testApiEndpoints() {
        const baseUrl = 'http://localhost:3000'; // ปรับตาม environment
        
        // ทดสอบ Profit Loss API
        await this.timeFunction('Profit Loss API', async () => {
            const response = await fetch(`${baseUrl}/api/reports/profit-loss`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId: this.testBusinessId,
                    startDate: '2024-01-01',
                    endDate: '2024-12-31'
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        });

        // ทดสอบ WHT API
        await this.timeFunction('WHT Report API', async () => {
            const response = await fetch(`${baseUrl}/api/reports/withholding-tax`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId: this.testBusinessId
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        });

        // ทดสอบ Dashboard Stats API
        await this.timeFunction('Dashboard Stats API', async () => {
            const response = await fetch(`${baseUrl}/api/dashboard/stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId: this.testBusinessId,
                    periodDays: 30
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        });
    }

    // รันการทดสอบทั้งหมด
    async runAllTests() {
        console.log('🚀 เริ่มการทดสอบประสิทธิภาพ...\n');

        try {
            // Database RPC Tests
            console.log('📊 ทดสอบ Database RPC Functions:');
            await this.testNewProfitLoss();
            await this.testWhtReport();
            await this.testDashboardStats();
            await this.testPaginatedTransactions();

            console.log('\n📈 ทดสอบเปรียบเทียบ (เก่า vs ใหม่):');
            await this.testOldProfitLoss();

            console.log('\n🌐 ทดสอบ API Endpoints:');
            await this.testApiEndpoints();

        } catch (error) {
            console.error('💥 การทดสอบล้มเหลว:', error);
        }

        this.generateReport();
    }

    // สร้างรายงานผลการทดสอบ
    generateReport() {
        console.log('\n📋 สรุปผลการทดสอบประสิทธิภาพ:');
        console.log('='.repeat(60));

        const tableData = [];
        for (const [name, result] of Object.entries(this.results)) {
            tableData.push({
                'Test Name': name,
                'Duration (ms)': result.duration,
                'Status': result.status,
                'Data Size (bytes)': result.dataSize || 'N/A'
            });
        }

        console.table(tableData);

        // คำนวณ Performance Improvements
        const oldProfitLoss = this.results['Old Profit Loss (Client-side)'];
        const newProfitLoss = this.results['New Profit Loss (Server-side)'];

        if (oldProfitLoss && newProfitLoss && oldProfitLoss.status === 'success' && newProfitLoss.status === 'success') {
            const improvement = ((oldProfitLoss.duration - newProfitLoss.duration) / oldProfitLoss.duration * 100).toFixed(1);
            console.log(`\n🎯 การปรับปรุงประสิทธิภาพ Profit Loss Report: ${improvement}%`);
        }

        // สร้างรายงาน JSON
        const report = {
            timestamp: new Date().toISOString(),
            testResults: this.results,
            summary: {
                totalTests: Object.keys(this.results).length,
                successfulTests: Object.values(this.results).filter(r => r.status === 'success').length,
                averageDuration: (Object.values(this.results).reduce((sum, r) => sum + parseFloat(r.duration), 0) / Object.keys(this.results).length).toFixed(2)
            }
        };

        // บันทึกรายงาน
        const fs = require('fs');
        fs.writeFileSync('performance-test-results.json', JSON.stringify(report, null, 2));
        console.log('\n📁 รายงานถูกบันทึกเป็น performance-test-results.json');
    }
}

// รันการทดสอบ
async function main() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('❌ กรุณาตั้งค่า environment variables: NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY');
        process.exit(1);
    }

    const tester = new PerformanceTest();
    
    // หา business ID จริงก่อนทดสอบ
    await tester.findTestBusinessId();
    
    await tester.runAllTests();
}

// รันเมื่อเรียกใช้ script โดยตรง
if (require.main === module) {
    main().catch(console.error);
}

module.exports = PerformanceTest;

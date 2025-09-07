// src/app/api/export-tax-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Transaction } from '@/types';
import ExcelJS from 'exceljs';

export async function POST(req: NextRequest) {
    try {
        const { businessId, startDate, endDate } = await req.json();

        if (!businessId || !startDate || !endDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Supabase handles date strings directly.
        // Ensure the end date includes the whole day.
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        const endDateISO = endOfDay.toISOString();

        const { data, error } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('businessid', businessId)
            .gte('date', startDate)
            .lte('date', endDateISO)
            .gt('vat_amount', 0)
            .eq('isdeleted', false)
            .neq('status', 'ยกเลิก');

        if (error) {
            console.error('Supabase query error:', error);
            throw new Error(`Supabase query failed: ${error.message}`);
        }

        const transactions = data.map(t => ({
            ...t,
            date: new Date(t.date), // Convert string date to JS Date object for ExcelJS
        } as unknown as Transaction));

        const salesTaxTransactions = transactions.filter(t => t.type === 'income');
        const purchaseTaxTransactions = transactions.filter(t => t.type === 'expense' || t.type === 'cogs');

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Accountee';
        workbook.created = new Date();

        // --- Create Sales Tax Sheet (ภาษีขาย) ---
        const salesSheet = workbook.addWorksheet('ภาษีขาย');
        salesSheet.columns = [
            { header: 'วันที่', key: 'date', width: 15 },
            { header: 'รายละเอียด', key: 'description', width: 40 },
            { header: 'หมวดหมู่', key: 'category', width: 25 },
            { header: 'ยอดก่อน VAT', key: 'subtotal', width: 15 },
            { header: 'ยอด VAT', key: 'vat_amount', width: 15 },
            { header: 'ยอดรวม', key: 'amount', width: 15 },
        ];
        salesSheet.getRow(1).font = { bold: true };
        salesTaxTransactions.forEach(t => {
            salesSheet.addRow({
                date: t.date,
                description: t.description,
                category: t.category,
                subtotal: t.subtotal,
                vat_amount: t.vat_amount,
                amount: t.amount,
            });
        });
        salesSheet.getColumn('subtotal').numFmt = '#,##0.00';
        salesSheet.getColumn('vat_amount').numFmt = '#,##0.00';
        salesSheet.getColumn('amount').numFmt = '#,##0.00';

        // --- Create Purchase Tax Sheet (ภาษีซื้อ) ---
        const purchaseSheet = workbook.addWorksheet('ภาษีซื้อ');
        purchaseSheet.columns = [
            { header: 'วันที่', key: 'date', width: 15 },
            { header: 'รายละเอียด', key: 'description', width: 40 },
            { header: 'หมวดหมู่', key: 'category', width: 25 },
            { header: 'ยอดก่อน VAT', key: 'subtotal', width: 15 },
            { header: 'ยอด VAT', key: 'vat_amount', width: 15 },
            { header: 'ยอดรวม', key: 'amount', width: 15 },
        ];
        purchaseSheet.getRow(1).font = { bold: true };
        purchaseTaxTransactions.forEach(t => {
            purchaseSheet.addRow({
                date: t.date,
                description: t.description,
                category: t.category,
                subtotal: t.subtotal,
                vat_amount: t.vat_amount,
                amount: t.amount,
            });
        });
        purchaseSheet.getColumn('subtotal').numFmt = '#,##0.00';
        purchaseSheet.getColumn('vat_amount').numFmt = '#,##0.00';
        purchaseSheet.getColumn('amount').numFmt = '#,##0.00';
        
        const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Accountee_Tax_Report_${startDate}_to_${endDate}.xlsx"`,
            },
        });

    } catch (error) {
        console.error('Export failed:', error);
        return NextResponse.json({ error: `An error occurred during export: ${(error as Error).message}` }, { status: 500 });
    }
}
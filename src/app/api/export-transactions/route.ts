// src/app/api/export-transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Transaction } from '@/types';
import ExcelJS from 'exceljs';

export async function POST(req: NextRequest) {
    const supabase = createClient();

    try {
        const { businessId, startDate, endDate, pageType } = await req.json();

        if (!businessId || !startDate || !endDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        let queryBuilder = supabase
            .from('transactions')
            .select('*')
            .eq('businessid', businessId)
            .gte('date', new Date(startDate).toISOString())
            .lte('date', endOfDay.toISOString())
            .neq('status', 'ยกเลิก')
            .order('date', { ascending: false });
        
        if (pageType === 'income') {
            queryBuilder = queryBuilder.eq('type', 'income');
        } else if (pageType === 'expense') {
            queryBuilder = queryBuilder.in('type', ['expense', 'cogs']);
        }

        const { data: transactionsData, error } = await queryBuilder;

        if (error) {
            console.error('Supabase query failed:', error);
            throw new Error(error.message);
        }

        const transactions = transactionsData.map(t => ({
            ...t,
            date: new Date(t.date)
        } as Transaction));
        
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Accountee';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Transactions');
        sheet.columns = [
            { header: 'วันที่', key: 'date', width: 15 },
            { header: 'รายละเอียด', key: 'description', width: 40 },
            { header: 'หมวดหมู่', key: 'category', width: 25 },
            { header: 'ประเภท', key: 'type', width: 15 },
            { header: 'ยอดก่อน VAT', key: 'subtotal', width: 15 },
            { header: 'ยอด VAT', key: 'vat_amount', width: 15 },
            { header: 'ยอดหัก ณ ที่จ่าย', key: 'withholdingtax', width: 15 },
            { header: 'ยอดรวมสุทธิ', key: 'amount', width: 15 },
            { header: 'สถานะ', key: 'status', width: 20 },
        ];
        sheet.getRow(1).font = { bold: true };
        
        transactions.forEach(t => {
            sheet.addRow({
                date: t.date,
                description: t.description,
                category: t.category,
                type: t.type,
                subtotal: t.subtotal,
                vat_amount: t.vat_amount || 0,
                withholdingtax: t.withholdingtax || 0,
                amount: t.amount,
                status: t.status,
            });
        });

        ['subtotal', 'vat_amount', 'withholdingtax', 'amount'].forEach(key => {
            const col = sheet.getColumn(key);
            if (col) {
                col.numFmt = '#,##0.00';
            }
        });
        
        const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Accountee_Transactions_${startDate}_to_${endDate}.xlsx"`,
            },
        });

    } catch (error) {
        console.error('Export failed:', error);
        return NextResponse.json({ error: `An error occurred during export: ${(error as Error).message}` }, { status: 500 });
    }
}

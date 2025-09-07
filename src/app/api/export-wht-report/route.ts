// src/app/api/export-wht-report/route.ts
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

        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        const endDateISO = endOfDay.toISOString();

        const { data, error } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('businessid', businessId)
            .gte('date', startDate)
            .lte('date', endDateISO)
            .gt('withholdingtax', 0)
            .eq('isdeleted', false)
            .neq('status', 'ยกเลิก');

        if (error) {
            console.error('Supabase query error:', error);
            throw new Error(`Supabase query failed: ${error.message}`);
        }

    const transactions = data.map(t => ({
            ...t,
            date: new Date(t.date)
    } as unknown as Transaction & { withholdingtax_rate: number | null, withholdingtax: number | null })); // Cast for type safety
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Accountee';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('รายงานหัก ณ ที่จ่าย');
        sheet.columns = [
            { header: 'วันที่', key: 'date', width: 15 },
            { header: 'รายละเอียด', key: 'description', width: 50 },
            { header: 'ยอดเงินก่อนหักภาษี', key: 'subtotal', width: 20 },
            { header: 'อัตราภาษี (%)', key: 'whtRate', width: 15 },
            { header: 'ยอดภาษีที่หัก', key: 'whtAmount', width: 20 },
        ];
        sheet.getRow(1).font = { bold: true };
        
        transactions.forEach(t => {
            sheet.addRow({
                date: t.date,
                description: t.description,
                subtotal: t.subtotal,
                whtRate: (t as any).withholdingtax_rate,
                whtAmount: (t as any).withholdingtax,
            });
        });

        sheet.getColumn('subtotal').numFmt = '#,##0.00';
        sheet.getColumn('whtAmount').numFmt = '#,##0.00';
        
        const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Accountee_WHT_Report_${startDate}_to_${endDate}.xlsx"`,
            },
        });

    } catch (error) {
        console.error('Export failed:', error);
        return NextResponse.json({ error: `An error occurred during export: ${(error as Error).message}` }, { status: 500 });
    }
}
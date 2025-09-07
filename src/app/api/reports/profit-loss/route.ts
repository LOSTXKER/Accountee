// src/app/api/reports/profit-loss/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
    try {
        const { businessId, startDate, endDate } = await req.json();

        if (!businessId || !startDate || !endDate) {
            return NextResponse.json(
                { error: 'Missing required fields: businessId, startDate, endDate' },
                { status: 400 }
            );
        }

        // ใช้ RPC function แทนการ query และคำนวณฝั่ง client
        const { data, error } = await supabaseAdmin.rpc('get_profit_loss_summary', {
            p_business_id: businessId,
            p_start_date: startDate,
            p_end_date: endDate
        });

        if (error) {
            console.error('Supabase RPC error:', error);
            return NextResponse.json(
                { error: 'Failed to generate profit loss report' },
                { status: 500 }
            );
        }

        // เพิ่ม metadata สำหรับ caching
        const response = NextResponse.json({
            success: true,
            data,
            meta: {
                generatedAt: new Date().toISOString(),
                businessId,
                dateRange: { startDate, endDate }
            }
        });

        // เพิ่ม cache headers
        response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        
        return response;

    } catch (error) {
        console.error('Profit Loss API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

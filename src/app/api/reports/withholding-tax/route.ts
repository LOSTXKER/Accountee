// src/app/api/reports/withholding-tax/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
    try {
        const { businessId, startDate, endDate } = await req.json();

        if (!businessId) {
            return NextResponse.json(
                { error: 'Missing required field: businessId' },
                { status: 400 }
            );
        }

        // ใช้ RPC function สำหรับ WHT report
        const { data, error } = await supabaseAdmin.rpc('get_wht_summary', {
            p_business_id: businessId,
            p_start_date: startDate || null,
            p_end_date: endDate || null
        });

        if (error) {
            console.error('Supabase RPC error:', error);
            return NextResponse.json(
                { error: 'Failed to generate WHT report' },
                { status: 500 }
            );
        }

        const response = NextResponse.json({
            success: true,
            data,
            meta: {
                generatedAt: new Date().toISOString(),
                businessId,
                dateRange: { startDate, endDate }
            }
        });

        // Cache สำหรับ WHT report
        response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
        
        return response;

    } catch (error) {
        console.error('WHT Report API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

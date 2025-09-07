// src/app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
    try {
        const { businessId, periodDays = 30 } = await req.json();

        if (!businessId) {
            return NextResponse.json(
                { error: 'Missing required field: businessId' },
                { status: 400 }
            );
        }

        // ใช้ RPC function สำหรับ dashboard stats
        const { data, error } = await supabaseAdmin.rpc('get_dashboard_stats', {
            p_business_id: businessId,
            p_period_days: periodDays
        });

        if (error) {
            console.error('Supabase RPC error:', error);
            return NextResponse.json(
                { error: 'Failed to get dashboard stats' },
                { status: 500 }
            );
        }

        const response = NextResponse.json({
            success: true,
            data,
            meta: {
                generatedAt: new Date().toISOString(),
                businessId,
                periodDays
            }
        });

        // Short cache for dashboard data
        response.headers.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=360');
        
        return response;

    } catch (error) {
        console.error('Dashboard Stats API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

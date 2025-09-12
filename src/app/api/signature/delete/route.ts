// src/app/api/signature/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE(req: NextRequest) {
    try {
        const { businessId } = await req.json();

        if (!businessId) {
            return NextResponse.json({ 
                error: 'Missing businessId' 
            }, { status: 400 });
        }

        // รับข้อมูลธุรกิจปัจจุบัน
        const { data: business, error: fetchError } = await supabaseAdmin
            .from('businesses')
            .select('signature_url')
            .eq('id', businessId)
            .single();

        if (fetchError) {
            return NextResponse.json({ 
                error: 'Business not found' 
            }, { status: 404 });
        }

        // ลบไฟล์จาก storage (ถ้ามี URL)
        if (business.signature_url) {
            try {
                // แยกเอา file path จาก URL
                const url = new URL(business.signature_url);
                const pathParts = url.pathname.split('/');
                const filePath = pathParts.slice(2).join('/'); // ลบ /storage/v1/object/public/business_assets/

                await supabaseAdmin.storage
                    .from('business_assets')
                    .remove([filePath]);

                console.log(`🗑️ Deleted signature file: ${filePath}`);
            } catch (error) {
                console.log('Warning: Could not delete signature file from storage:', error);
            }
        }

        // อัปเดต signature_url เป็น null
        const { error: updateError } = await supabaseAdmin
            .from('businesses')
            .update({ signature_url: null })
            .eq('id', businessId);

        if (updateError) {
            return NextResponse.json({ 
                error: 'Failed to update database' 
            }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true,
            message: 'Signature deleted successfully'
        });

    } catch (error) {
        console.error('Signature delete error:', error);
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}
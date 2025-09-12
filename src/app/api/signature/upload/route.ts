// src/app/api/signature/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildStoragePath } from '@/lib/storage-utils';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const businessId = formData.get('businessId') as string;

        if (!file || !businessId) {
            return NextResponse.json({ 
                error: 'Missing file or businessId' 
            }, { status: 400 });
        }

        // ตรวจสอบประเภทไฟล์
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ 
                error: 'File must be an image' 
            }, { status: 400 });
        }

        // ตรวจสอบขนาดไฟล์ (1MB)
        if (file.size > 1024 * 1024) {
            return NextResponse.json({ 
                error: 'File size must be less than 1MB' 
            }, { status: 400 });
        }

        // สร้างชื่อไฟล์ใหม่
        const fileExtension = file.name.split('.').pop() || 'png';
        const fileName = `signature_${Date.now()}.${fileExtension}`;
        const filePath = buildStoragePath('signatures', businessId, fileName);

        // อัปโหลดไฟล์
        const { error: uploadError } = await supabaseAdmin.storage
            .from('business_assets')
            .upload(filePath, file, {
                upsert: true,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return NextResponse.json({ 
                error: 'Failed to upload file' 
            }, { status: 500 });
        }

        // รับ URL สาธารณะ
        const { data: urlData } = supabaseAdmin.storage
            .from('business_assets')
            .getPublicUrl(filePath);

        // อัปเดต signature_url ในฐานข้อมูล
        const { error: updateError } = await supabaseAdmin
            .from('businesses')
            .update({ signature_url: urlData.publicUrl })
            .eq('id', businessId);

        if (updateError) {
            console.error('Database update error:', updateError);
            return NextResponse.json({ 
                error: 'Failed to update database' 
            }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true,
            signature_url: urlData.publicUrl 
        });

    } catch (error) {
        console.error('Signature upload error:', error);
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}
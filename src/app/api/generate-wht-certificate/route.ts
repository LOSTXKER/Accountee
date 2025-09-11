// src/app/api/generate-wht-certificate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PDFDocument, rgb, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';

// --- ฟังก์ชันแปลงตัวเลขเป็นข้อความภาษาไทย (คงเดิม) ---
function numberToThaiText(num: number): string {
    const ThaiNumbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const ThaiUnits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    function convertInteger(n: string): string {
        let result = '';
        const len = n.length;
        if (len === 0 || parseInt(n) === 0) return '';

        for (let i = 0; i < len; i++) {
            const digit = parseInt(n[i]);
            if (digit !== 0) {
                if (i === len - 1 && digit === 1 && len > 1) {
                    result += 'เอ็ด';
                } else if (i === len - 2 && digit === 2) {
                    result += 'ยี่';
                } else if (i === len - 2 && digit === 1) {
                    result += '';
                } else {
                    result += ThaiNumbers[digit];
                }
                result += ThaiUnits[len - i - 1];
            }
        }
        return result;
    }

    const numStr = num.toFixed(2);
    const [integerPart, decimalPart] = numStr.split('.');

    let bahtText = convertInteger(integerPart) + 'บาท';

    if (decimalPart === '00' || parseInt(decimalPart) === 0) {
        return bahtText + 'ถ้วน';
    } else {
        const satangText = convertInteger(decimalPart);
        return bahtText + satangText + 'สตางค์';
    }
}
// --- สิ้นสุดฟังก์ชัน ---

// Helper to split a string into an array of characters
const splitChars = (str: string | undefined | null): string[] => {
    if (!str) return Array(13).fill('');
    return str.split('');
};

export async function POST(req: NextRequest) {
    try {
        console.log('🚀 Starting WHT certificate generation with full P.N.D. support...');

        const { transactionId, vendorData, whtCategory, pndType } = await req.json();
        
        // Validate required fields
        if (!transactionId || !vendorData) {
            return NextResponse.json({ 
                error: 'Missing required fields', 
                details: 'transactionId และ vendorData จำเป็นต้องระบุ' 
            }, { status: 400 });
        }
        const { data: transaction, error: txError } = await supabaseAdmin.from('transactions').select('*').eq('id', transactionId).single();
        if (txError || !transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        const { data: businessData, error: businessError } = await supabaseAdmin.from('businesses').select('*').eq('id', transaction.businessid).single();
        if (businessError || !businessData) return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        
        // ... (ส่วน load PDF และ font เหมือนเดิม) ...
        const templatePath = path.join(process.cwd(), 'public', 'approve_wh3_081156.pdf');
        const templateBytes = await fs.readFile(templatePath);
        const pdfDoc = await PDFDocument.load(templateBytes);
        pdfDoc.registerFontkit(fontkit);
        const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Sarabun-Regular.ttf');
        const fontBytes = await fs.readFile(fontPath);
        const customFont = await pdfDoc.embedFont(fontBytes);

        const page = pdfDoc.getPages()[0];
        const { height } = page.getSize();
        const FONT_SIZE = 10; // Default font size
        const FONT_COLOR = rgb(0, 0, 0);

        const drawText = (text: string, x: number, y: number, size = FONT_SIZE) => {
            page.drawText(text, { x, y: height - y, font: customFont, size, color: FONT_COLOR });
        };
        const drawTextRightAligned = (text: string, rightX: number, y: number, size = FONT_SIZE) => {
            const textWidth = customFont.widthOfTextAtSize(text, size);
            const x = rightX - textWidth;
            page.drawText(text, { x, y: height - y, font: customFont, size, color: FONT_COLOR });
        };

        // 3. Draw all data onto the template
        
        // --- ✨ LOGIC ใหม่สำหรับติ๊กช่อง ภ.ง.ด. ---
        // นี่คือ "แผนที่" ของตำแหน่ง checkbox ทั้ง 7 ประเภท คุณสามารถปรับค่า x, y ได้ที่นี่
        const pndMap: { [key: string]: { x: number, y: number } } = {
            'ภ.ง.ด.1ก':       { x: 380, y: 250 },
            'ภ.ง.ด.1ก พิเศษ': { x: 480, y: 250 },
            'ภ.ง.ด.2':         { x: 380, y: 264 },
            'ภ.ง.ด.3':         { x: 480, y: 264 },
            'ภ.ง.ด.53':        { x: 380, y: 278 },
            'ภ.ง.ด.2ก':        { x: 480, y: 278 },
            'ภ.ง.ด.3ก':        { x: 380, y: 292 },
        };

        // อ่านค่า pnd_type จาก request หรือใช้ค่าเริ่มต้น
        const finalPndType = pndType || 'ภ.ง.ด.53';
        const pndCoords = pndMap[finalPndType];
        if (pndCoords) {
            drawText('✓', pndCoords.x, pndCoords.y, 14);
        }
        // --- สิ้นสุด LOGIC ใหม่ ---
        
        // --- แผนที่ตำแหน่งแกน X สำหรับเลขประจำตัวผู้เสียภาษี 13 หลัก ---
        const taxId_X_Positions = [
            381, 397, 413, 429, 445, 461, 477, 493, 509, 525, 541, 557, 573
        ];
        // --- สิ้นสุดส่วนปรับแก้ ---

        // Payer Info (ผู้มีหน้าที่หักภาษี)
        drawText(businessData.businessname || '', 70, 111);
        drawText(businessData.company_address || '', 70, 134, 8);
        const businessTaxIdChars = splitChars(businessData.tax_id);
        businessTaxIdChars.forEach((char, i) => {
            if (taxId_X_Positions[i]) {
                drawText(char, taxId_X_Positions[i], 91);
            }
        });

        // Payee Info (ผู้ถูกหักภาษี)
        drawText(vendorData.name, 70, 183);
        drawText(vendorData.address || '', 70, 210, 8);
        const vendorTaxIdChars = splitChars(vendorData.taxId);
        vendorTaxIdChars.forEach((char, i) => {
            if (taxId_X_Positions[i]) {
                drawText(char, taxId_X_Positions[i], 160);
            }
        });
        
        // Financial Details Table
        const issueDate = new Date(transaction.date);
        const totalAmount = transaction.subtotal || 0;
        const withholdingAmount = transaction.withholdingtax || 0;
        
        // ใช้ whtCategory จาก request หรือค่าเริ่มต้น
        const finalWhtCategory = whtCategory || 'ค่าบริการ';

        const categoryMap: { [key: string]: { type: 'simple' | 'text_5' | 'text_6', y: number } } = {
            'เงินเดือน ค่าจ้าง':         { type: 'simple', y: 303 },
            'ค่าธรรมเนียม ค่านายหน้า':   { type: 'simple', y: 317 },
            'ค่าแห่งลิขสิทธิ์':        { type: 'simple', y: 331 },
            'ค่าดอกเบี้ย':             { type: 'simple', y: 346 },
            'เงินปันผล':              { type: 'simple', y: 360 },
            'ค่าเช่า':                 { type: 'text_5', y: 563 },
            'ค่าวิชาชีพอิสระ':        { type: 'text_5', y: 563 },
            'ค่ารับเหมา':             { type: 'text_5', y: 563 },
            'ค่าบริการ':               { type: 'text_5', y: 563 },
            'ค่าโฆษณา':               { type: 'text_5', y: 563 },
            'ค่าขนส่ง':               { type: 'simple', y: 621 },
            'อื่นๆ':                   { type: 'text_6', y: 638 },
        };

        const selectedCategory = categoryMap[finalWhtCategory] || categoryMap['ค่าบริการ'];
        const dataY = selectedCategory.y + 4;

        drawText('✓', 35, selectedCategory.y, 14);

        if (selectedCategory.type === 'text_5') {
            drawText(`${finalWhtCategory} (${transaction.description || ''})`, 159, 565);
        } else if (selectedCategory.type === 'text_6') {
            drawText(`${finalWhtCategory} (${transaction.description || ''})`, 107, 638);
        }
        
        drawText(format(issueDate, 'dd/MM/yy'), 350, dataY);
        drawTextRightAligned(totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 488, dataY);
        drawTextRightAligned(withholdingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 559, dataY);

        // Totals
        drawTextRightAligned(totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 488, 660);
        drawTextRightAligned(withholdingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 559, 660);
        const amountInWords = numberToThaiText(withholdingAmount);
        drawText(amountInWords, 204, 681);

        // Final Checkboxes
        drawText('✓', 82, 721, 17);
        drawText('✓', 283, 721, 17);
        
        // Signature and Date
        drawText(format(issueDate, 'dd'), 345, 765);
        drawText(format(issueDate, 'MM'), 394, 765);
        drawText(format(issueDate, 'yyyy'), 445, 765);

        // 4. Save and Upload
        const pdfResultBytes = await pdfDoc.save();
        const fileName = `${transaction.businessid}/wht_certificates/${transactionId}_${Date.now()}.pdf`;
        const { error: uploadError } = await supabaseAdmin.storage.from('wht_certificates').upload(fileName, pdfResultBytes, { contentType: 'application/pdf', upsert: true });
        if (uploadError) throw new Error(`Supabase Storage Error: ${uploadError.message}`);

        const { data: urlData } = supabaseAdmin.storage.from('wht_certificates').getPublicUrl(fileName);
        const attachment = { name: `WHT Certificate - ${vendorData.name}.pdf`, url: urlData.publicUrl, type: 'application/pdf' };
        
        // บันทึกข้อมูลเพิ่มเติม: attachment, wht_category, pnd_type และ status
        await supabaseAdmin.from('transactions').update({ 
            wht_certificate_attachment: attachment,
            wht_category: finalWhtCategory,
            pnd_type: finalPndType,
            status: 'เสร็จสมบูรณ์' 
        }).eq('id', transactionId);

        console.log('✅ WHT certificate generated on official template and URL saved successfully.');
        return NextResponse.json({ success: true, url: urlData.publicUrl });

    } catch (error) {
        console.error('💥 OVERALL CATCH:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Failed to generate certificate', details: errorMessage }, { status: 500 });
    }
}


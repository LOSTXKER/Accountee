// src/app/api/generate-wht-certificate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PDFDocument, rgb, PDFFont, PDFImage } from 'pdf-lib';
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

// Helper to clean description text (remove vendor info in parentheses)
const cleanDescription = (description: string | undefined | null): string => {
    if (!description) return '';
    // ลบข้อความในรูปแบบ (คู่ค้า: ชื่อ) ออก
    return description.replace(/\s*\(คู่ค้า:.*?\)\s*$/g, '').trim();
};

// Helper to format number with exactly 2 decimal places
const formatCurrency = (amount: number): string => {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 🤖 Smart Auto-Selection Functions
const smartPndTypeSelection = (transaction: any, vendorData: any): string => {
    // กฎการเลือก ภ.ง.ด. แบบอัจฉริยะ
    const amount = Math.abs(transaction.amount);
    const category = transaction.category?.toLowerCase() || '';
    const description = transaction.description?.toLowerCase() || '';
    
    // ภ.ง.ด.53 - ภาษีหัก ณ ที่จ่าย (เงินเดือน ค่าจ้าง บำนาญ)
    if (category.includes('เงินเดือน') || category.includes('ค่าจ้าง') || 
        description.includes('เงินเดือน') || description.includes('ค่าจ้าง') ||
        description.includes('บำนาญ') || description.includes('salary')) {
        return 'ภ.ง.ด.1ก';
    }
    
    // ภ.ง.ด.3 - ภาษีหัก ณ ที่จ่าย (ดอกเบี้ย เงินปันผล ฯลฯ)
    if (category.includes('ดอกเบี้ย') || category.includes('เงินปันผล') ||
        description.includes('ดอกเบี้ย') || description.includes('dividend') ||
        description.includes('interest')) {
        return 'ภ.ง.ด.3';
    }
    
    // ภ.ง.ด.2 - ภาษีหัก ณ ที่จ่าย (การขาย การให้เช่า)
    if (category.includes('ค่าเช่า') || category.includes('ขาย') ||
        description.includes('ค่าเช่า') || description.includes('rent') ||
        description.includes('sale')) {
        return 'ภ.ง.ด.2';
    }
    
    // Default: ภ.ง.ด.53 สำหรับค่าบริการทั่วไป
    return 'ภ.ง.ด.53';
};

const smartWhtCategorySelection = (transaction: any, vendorData: any): string => {
    // กฎการเลือกประเภทเงินได้แบบอัจฉริยะ
    const category = transaction.category?.toLowerCase() || '';
    const description = transaction.description?.toLowerCase() || '';
    
    // ค่าเช่า
    if (category.includes('ค่าเช่า') || description.includes('ค่าเช่า') || 
        description.includes('rent') || category.includes('เช่า')) {
        return 'ค่าเช่า';
    }
    
    // ค่าวิชาชีพอิสระ
    if (category.includes('วิชาชีพ') || description.includes('วิชาชีพ') ||
        description.includes('ที่ปรึกษา') || description.includes('consultant') ||
        category.includes('อิสระ')) {
        return 'ค่าวิชาชีพอิสระ';
    }
    
    // ค่ารับเหมา
    if (category.includes('รับเหมา') || description.includes('รับเหมา') ||
        description.includes('construction') || description.includes('contractor')) {
        return 'ค่ารับเหมา';
    }
    
    // ค่าโฆษณา
    if (category.includes('โฆษณา') || description.includes('โฆษณา') ||
        description.includes('advertising') || description.includes('marketing')) {
        return 'ค่าโฆษณา';
    }
    
    // ค่าขนส่ง
    if (category.includes('ขนส่ง') || description.includes('ขนส่ง') ||
        description.includes('transport') || description.includes('delivery') ||
        category.includes('จัดส่ง')) {
        return 'ค่าขนส่ง';
    }
    
    // Default: ค่าบริการ
    return 'ค่าบริการ';
};

export async function POST(req: NextRequest) {
    try {
        console.log('🚀 Starting WHT certificate generation with full P.N.D. support...');

        const { transactionId, vendorData, whtCategory, pndType, previewMode } = await req.json();
        
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
        
        // 🤖 Smart Auto-Selection (ระบบเลือกอัตโนมัติ)
        const smartPndType = smartPndTypeSelection(transaction, vendorData);
        const smartWhtCategory = smartWhtCategorySelection(transaction, vendorData);
        
        // ใช้ค่าที่ผู้ใช้เลือก หรือค่าที่ระบบแนะนำ
        const finalPndType = pndType || smartPndType;
        const finalWhtCategory = whtCategory || smartWhtCategory;
        
        console.log(`🤖 Smart Selection:
          - Recommended PND: ${smartPndType} ${pndType ? '(User Override: ' + pndType + ')' : '(Auto)'}
          - Recommended WHT Category: ${smartWhtCategory} ${whtCategory ? '(User Override: ' + whtCategory + ')' : '(Auto)'}
          - Transaction Category: ${transaction.category || 'N/A'}
          - Description: ${transaction.description || 'N/A'}`);
        
        // ตรวจสอบผลการตัดสินใจ
        console.log(`✅ Final Selection: PND=${finalPndType}, WHT=${finalWhtCategory}`);
        
        // หากเป็น preview mode ให้ส่งค่าแนะนำกลับไปเท่านั้น
        if (previewMode) {
            return NextResponse.json({
                suggestions: {
                    pndType: smartPndType,
                    whtCategory: smartWhtCategory,
                    reasoning: {
                        pndType: `วิเคราะห์จาก: ${transaction.category || 'N/A'} - ${transaction.description || 'N/A'}`,
                        whtCategory: `วิเคราะห์จาก: ${transaction.category || 'N/A'} - ${transaction.description || 'N/A'}`
                    }
                }
            });
        }
        
        // ... (ส่วน load PDF และ font เหมือนเดิม) ...
        const templatePath = path.join(process.cwd(), 'public', 'approve_wh3_081156.pdf');
        const templateBytes = await fs.readFile(templatePath);
        const pdfDoc = await PDFDocument.load(templateBytes);
        pdfDoc.registerFontkit(fontkit);
        const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Sarabun-Regular.ttf');
        const fontBytes = await fs.readFile(fontPath);
        const customFont = await pdfDoc.embedFont(fontBytes);

        // โหลดรูปติ๊กถูก
        const checkmarkPath = path.join(process.cwd(), 'public', '123235.png');
        const checkmarkBytes = await fs.readFile(checkmarkPath);
        const checkmarkImage = await pdfDoc.embedPng(checkmarkBytes);
        console.log('✅ Checkmark image loaded successfully');

        // โหลดลายเซ็น (ถ้ามี)
        let signatureImage: PDFImage | null = null;
        if (businessData.signature_url) {
            try {
                console.log('🖋️ Loading signature from:', businessData.signature_url);
                const signatureResponse = await fetch(businessData.signature_url);
                if (signatureResponse.ok) {
                    const signatureBytes = await signatureResponse.arrayBuffer();
                    const uint8Array = new Uint8Array(signatureBytes);
                    
                    // ตรวจสอบประเภทไฟล์จาก URL หรือ content-type
                    const contentType = signatureResponse.headers.get('content-type');
                    if (contentType?.includes('png') || businessData.signature_url.toLowerCase().includes('.png')) {
                        signatureImage = await pdfDoc.embedPng(uint8Array);
                    } else {
                        signatureImage = await pdfDoc.embedJpg(uint8Array);
                    }
                    console.log('✅ Signature image loaded successfully');
                } else {
                    console.log('⚠️ Could not load signature image:', signatureResponse.status);
                }
            } catch (error) {
                console.log('⚠️ Error loading signature:', error);
            }
        } else {
            console.log('📝 No signature URL provided');
        }

        const page = pdfDoc.getPages()[0];
        const { height } = page.getSize();
        const FONT_SIZE = 9; // Default font size
        const FONT_COLOR = rgb(0, 0, 0);

        const drawText = (text: string, x: number, y: number, size = FONT_SIZE) => {
            page.drawText(text, { x, y: height - y, font: customFont, size, color: FONT_COLOR });
        };
        const drawTextRightAligned = (text: string, rightX: number, y: number, size = FONT_SIZE) => {
            const textWidth = customFont.widthOfTextAtSize(text, size);
            const x = rightX - textWidth;
            page.drawText(text, { x, y: height - y, font: customFont, size, color: FONT_COLOR });
        };
        
        // ฟังก์ชันสำหรับวางรูปติ๊กถูก
        const drawCheckmark = (x: number, y: number, size = 12) => {
            page.drawImage(checkmarkImage, {
                x: x,
                y: height - y - size, // ปรับตำแหน่ง y เพื่อให้รูปอยู่ตำแหน่งที่ถูกต้อง
                width: size,
                height: size,
            });
        };

        // ฟังก์ชันสำหรับวางลายเซ็น
        const drawSignature = (x: number, y: number, width = 60, maxHeight = 30) => {
            if (signatureImage) {
                // คำนวณขนาดที่เหมาะสม โดยรักษาสัดส่วน
                const { width: imgWidth, height: imgHeight } = signatureImage.scale(1);
                const aspectRatio = imgWidth / imgHeight;
                
                let finalWidth = width;
                let finalHeight = width / aspectRatio;
                
                // ถ้าสูงเกินกว่าที่กำหนด ให้ปรับขนาด
                if (finalHeight > maxHeight) {
                    finalHeight = maxHeight;
                    finalWidth = maxHeight * aspectRatio;
                }
                
                page.drawImage(signatureImage, {
                    x: x,
                    y: height - y - finalHeight,
                    width: finalWidth,
                    height: finalHeight,
                });
                console.log(`🖋️ Signature placed at (${x}, ${y}) size: ${finalWidth}x${finalHeight}`);
            }
        };

        // 3. Draw all data onto the template
        
        // --- ✨ LOGIC สำหรับติ๊กช่อง ภ.ง.ด. (ปรับปรุงแล้ว) ---
        // นี่คือ "แผนที่" ของตำแหน่ง checkbox ทั้ง 7 ประเภท ปรับแล้วให้แม่นยำขึ้น
        const pndMap: { [key: string]: { x: number, y: number } } = {
            'ภ.ง.ด.1ก':       { x: 210, y: 225 },
            'ภ.ง.ด.1ก พิเศษ': { x: 288, y: 225 },
            'ภ.ง.ด.2':         { x: 396, y: 225 },
            'ภ.ง.ด.3':         { x: 473, y: 225 },
            'ภ.ง.ด.53':        { x: 396, y: 244 },
            'ภ.ง.ด.2ก':        { x: 210, y: 244 },
            'ภ.ง.ด.3ก':        { x: 288, y: 244 },
        };

        // อ่านค่า pnd_type จาก Smart Selection
        console.log(`📋 PND Type selected: ${finalPndType}`);
        
        const pndCoords = pndMap[finalPndType];
        if (pndCoords) {
            // ใช้รูปติ๊กถูกจากไฟล์ 123235.png แทนข้อความ
            drawCheckmark(pndCoords.x, pndCoords.y, 14);
            console.log(`✅ PND checkbox marked with image at position (${pndCoords.x}, ${pndCoords.y})`);
        } else {
            console.warn(`⚠️  Invalid PND type: ${finalPndType}`);
        }
        // --- สิ้นสุด LOGIC ใหม่ ---
        
        // --- แผนที่ตำแหน่งแกน X สำหรับเลขประจำตัวผู้เสียภาษี 13 หลัก ---
        const taxId_X_Positions = [
            378, 396, 408, 420, 432, 450, 462, 474, 486, 498, 517, 529, 548
        ];
        // --- สิ้นสุดส่วนปรับแก้ ---

        // Payer Info (ผู้มีหน้าที่หักภาษี)
        drawText(businessData.businessname || '', 70, 111);
        drawText(businessData.company_address || '', 70, 134, 8);
        const businessTaxIdChars = splitChars(businessData.tax_id);
        businessTaxIdChars.forEach((char, i) => {
            if (taxId_X_Positions[i]) {
                drawText(char, taxId_X_Positions[i], 94);
            }
        });

        // Payee Info (ผู้ถูกหักภาษี)
        drawText(vendorData.name, 70, 183);
        drawText(vendorData.address || '', 70, 210, 8);
        const vendorTaxIdChars = splitChars(vendorData.taxId);
        vendorTaxIdChars.forEach((char, i) => {
            if (taxId_X_Positions[i]) {
                drawText(char, taxId_X_Positions[i], 163);
            }
        });
        
        // Financial Details Table
        const issueDate = new Date(transaction.date);
        const totalAmount = transaction.subtotal || 0;
        const withholdingAmount = transaction.withholdingtax || 0;
        
        // ใช้ whtCategory จาก Smart Selection
        console.log(`💰 WHT Category selected from Smart System: ${finalWhtCategory}`);

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

        // ไม่ติ๊กช่องประเภทเงินได้พึงประเมินที่จ่าย (ตามที่ผู้ใช้ต้องการ)
        console.log(`💰 WHT Category selected: ${finalWhtCategory} - ไม่ติ๊กช่อง`);

        if (selectedCategory.type === 'text_5') {
            const cleanedDescription = cleanDescription(transaction.description);
            const categoryText = cleanedDescription 
                ? `${finalWhtCategory} (${cleanedDescription})`
                : finalWhtCategory;
            drawText(categoryText, 159, 568);
        } else if (selectedCategory.type === 'text_6') {
            const cleanedDescription = cleanDescription(transaction.description);
            const categoryText = cleanedDescription 
                ? `${finalWhtCategory} (${cleanedDescription})`
                : finalWhtCategory;
            drawText(categoryText, 107, 585); // ปรับจาก 641 เป็น 585 ให้ใกล้กับ text_5 มากขึ้น
        }
        
        drawText(format(issueDate, 'dd/MM/yy'), 350, dataY);
        drawTextRightAligned(formatCurrency(totalAmount), 488, dataY);
        drawTextRightAligned(formatCurrency(withholdingAmount), 559, dataY);

        // Totals
        drawTextRightAligned(formatCurrency(totalAmount), 488, 660);
        drawTextRightAligned(formatCurrency(withholdingAmount), 559, 660);
        const amountInWords = numberToThaiText(withholdingAmount);
        drawText(amountInWords, 204, 681);

        // Final Checkboxes - ติ๊กเฉพาะช่อง "หักภาษี ณ ที่จ่าย" เท่านั้น
        console.log('📋 Marking checkbox: หักภาษี ณ ที่จ่าย (ไม่ติ๊ก "ออกให้ครั้งเดียว")');
        drawCheckmark(82, 707, 16);   // หักภาษี ณ ที่จ่าย
        // ไม่ติ๊กช่อง "ออกให้ครั้งเดียว" ตามที่ผู้ใช้ต้องการ
        console.log('✅ หักภาษี ณ ที่จ่าย checkbox marked successfully');
        
        // Signature and Date
        drawText(format(issueDate, 'dd'), 345, 765);
        drawText(format(issueDate, 'MM'), 394, 765);
        drawText(format(issueDate, 'yyyy'), 445, 765);

        // 🖋️ Digital Signature - วางลายเซ็นด้านซ้ายของวันที่
        if (signatureImage) {
            drawSignature(380, 730, 45, 45); // ปรับตำแหน่งและขนาดตามต้องการ
            console.log('🖋️ Digital signature added to WHT certificate');
        }

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
        console.log('📋 Certificate Summary:');
        console.log(`   - PND Type: ${finalPndType}`);
        console.log(`   - WHT Category: ${finalWhtCategory}`);
        console.log(`   - Vendor: ${vendorData.name}`);
        console.log(`   - Amount: ${totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
        console.log(`   - Withholding Tax: ${withholdingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
        
        return NextResponse.json({ 
            success: true, 
            url: urlData.publicUrl,
            message: 'หนังสือรับรองหัก ณ ที่จ่ายถูกสร้างและอัปโหลดสำเร็จ',
            attachment: attachment,
            fileName: `WHT Certificate - ${vendorData.name}.pdf`,
            pndType: finalPndType,
            whtCategory: finalWhtCategory
        });

    } catch (error) {
        console.error('💥 OVERALL CATCH:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Failed to generate certificate', details: errorMessage }, { status: 500 });
    }
}


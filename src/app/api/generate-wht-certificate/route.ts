// src/app/api/generate-wht-certificate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PDFDocument, PDFFont } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';

// Simple Thai to Roman transliteration with comprehensive character mapping
const transliterateThaiToRoman = (thaiText: string): string => {
    const thaiToRoman: { [key: string]: string } = {
        // Thai consonants
        'ก': 'k', 'ข': 'kh', 'ฃ': 'kh', 'ค': 'kh', 'ฅ': 'kh', 'ฆ': 'kh', 'ง': 'ng',
        'จ': 'j', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's', 'ฌ': 'ch', 'ญ': 'y',
        'ฎ': 'd', 'ฏ': 't', 'ฐ': 'th', 'ฑ': 'th', 'ฒ': 'th', 'ณ': 'n',
        'ด': 'd', 'ต': 't', 'ถ': 'th', 'ท': 'th', 'ธ': 'th', 'น': 'n',
        'บ': 'b', 'ป': 'p', 'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph', 'ฟ': 'f', 'ภ': 'ph', 'ม': 'm',
        'ย': 'y', 'ร': 'r', 'ฤ': 'rue', 'ล': 'l', 'ฦ': 'lue',
        'ว': 'w', 'ศ': 's', 'ษ': 's', 'ส': 's', 'ห': 'h', 'ฬ': 'l', 'อ': 'o', 'ฮ': 'h',
        
        // Thai vowels
        'ะ': 'a', 'ั': 'a', 'า': 'a', 'ำ': 'am', 'ิ': 'i', 'ี': 'i', 'ึ': 'ue', 'ื': 'ue',
        'ุ': 'u', 'ู': 'u', 'เ': 'e', 'แ': 'ae', 'โ': 'o', 'ใ': 'ai', 'ไ': 'ai',
        
        // Thai tone marks and special characters
        '่': '', '้': '', '๊': '', '๋': '', '์': '', 'ํ': '',
        '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
        '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
        '฿': 'baht', 'ฯ': '...'
    };
    
    return thaiText.split('').map(char => {
        // Check if character is in Thai Unicode range
        const charCode = char.charCodeAt(0);
        if (charCode >= 0x0E00 && charCode <= 0x0E7F) {
            return thaiToRoman[char] || '?';
        }
        return char; // Keep non-Thai characters as is
    }).join('');
};

// Enhanced safe text setting with multiple fallback strategies
const setTextSafely = (form: any, fieldName: string, text: string) => {
    try {
        const field = form.getTextField(fieldName);
        if (field) {
            console.log(`🔤 Setting field ${fieldName} with text: "${text}"`);
            
            // Check if text contains Thai characters
            const hasThaiChars = /[\u0E00-\u0E7F]/.test(text);
            
            if (hasThaiChars) {
                console.log(`🇹🇭 Thai characters detected in field ${fieldName}, using safe encoding strategies`);
                
                // Strategy 1: Try romanization
                try {
                    const romanizedText = transliterateThaiToRoman(text);
                    field.setText(romanizedText);
                    console.log(`✅ Set field ${fieldName} with romanized text: ${romanizedText}`);
                    return;
                } catch (romanError) {
                    console.warn(`⚠️ Romanization failed for ${fieldName}:`, romanError);
                }
                
                // Strategy 2: Try ASCII-safe replacement
                try {
                    const asciiSafeText = text.replace(/[\u0E00-\u0E7F]/g, '?');
                    field.setText(asciiSafeText);
                    console.log(`⚠️ Set field ${fieldName} with ASCII-safe text: ${asciiSafeText}`);
                    return;
                } catch (asciiError) {
                    console.warn(`⚠️ ASCII replacement failed for ${fieldName}:`, asciiError);
                }
                
                // Strategy 3: Use descriptive placeholder
                try {
                    const placeholder = `Thai_Text_${text.length}chars`;
                    field.setText(placeholder);
                    console.log(`⚠️ Set field ${fieldName} with placeholder: ${placeholder}`);
                    return;
                } catch (placeholderError) {
                    console.warn(`⚠️ Placeholder failed for ${fieldName}:`, placeholderError);
                }
                
                // Strategy 4: Empty field
                try {
                    field.setText('');
                    console.log(`🔄 Set field ${fieldName} to empty as last resort`);
                    return;
                } catch (emptyError) {
                    console.error(`❌ Even empty text failed for ${fieldName}:`, emptyError);
                }
                
            } else {
                // Safe non-Thai text
                try {
                    field.setText(text);
                    console.log(`✅ Set field ${fieldName} (non-Thai): ${text}`);
                } catch (nonThaiError) {
                    console.warn(`⚠️ Non-Thai text failed for ${fieldName}, trying empty:`, nonThaiError);
                    field.setText('');
                }
            }
        } else {
            console.warn(`⚠️ Field ${fieldName} not found in PDF form`);
        }
    } catch (error) {
        console.error(`❌ Complete error setting field ${fieldName}:`, error);
    }
};

// Helper to split a string into an array of characters
const splitString = (str: string | undefined | null): string[] => {
    if (!str) return [];
    return str.split('');
};

export async function POST(req: NextRequest) {
    try {
        console.log('🚀 Starting WHT certificate generation...');
        
        const { transactionId, vendorData } = await req.json();
        console.log('📝 Request data:', { transactionId, vendorData });

        if (!transactionId || !vendorData || !vendorData.name || !vendorData.taxId) {
            console.error('❌ Missing required fields');
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch Transaction and Business data
        console.log('🔍 Fetching transaction data...');
        const { data: transaction, error: txError } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (txError || !transaction) {
            console.error('❌ Transaction not found:', txError);
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }
        console.log('✅ Transaction found:', transaction.id);

        console.log('🔍 Fetching business data...');
        const { data: businessData, error: businessError } = await supabaseAdmin
            .from('businesses')
            .select('*')
            .eq('id', transaction.businessid)
            .single();

        if (businessError || !businessData) {
            console.error('❌ Business not found:', businessError);
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }
        console.log('✅ Business found:', businessData.businessname);

        // 2. Load the PDF template and embed Thai font
        console.log('📄 Loading PDF template...');
        const templatePath = path.join(process.cwd(), 'public', 'approve_wh3_081156.pdf');
        console.log('📁 Template path:', templatePath);
        
        const pdfBytes = await fs.readFile(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        // Register fontkit for custom font support
        const fontkit = require('fontkit');
        pdfDoc.registerFontkit(fontkit);
        console.log('✅ PDF template loaded successfully');

        const form = pdfDoc.getForm();
        
        // 3. Prepare data for filling
        console.log('📊 Preparing data for PDF...');
        const issueDate = new Date(transaction.date);
        const totalAmount = transaction.subtotal || 0;
        const withholdingAmount = transaction.withholdingtax || 0;
        const withholdingRate = transaction.wht_rate || 0;

        console.log('💰 Financial data:', {
            totalAmount,
            withholdingAmount,
            withholdingRate,
            issueDate: issueDate.toLocaleDateString('th-TH')
        });

        // Validate required data
        if (totalAmount <= 0) {
            console.error('❌ Invalid total amount:', totalAmount);
            return NextResponse.json({ error: 'Invalid transaction amount' }, { status: 400 });
        }

        if (withholdingAmount <= 0) {
            console.error('❌ Invalid withholding amount:', withholdingAmount);
            return NextResponse.json({ error: 'Invalid withholding tax amount' }, { status: 400 });
        }

        // --- Use helper to fill fields safely ---
        setTextSafely(form, 'name1', businessData.businessname || '');
        setTextSafely(form, 'add1', businessData.company_address || '');
        
        const businessTaxIdChars = splitString(businessData.tax_id);
        for (let i = 0; i < 13; i++) {
            setTextSafely(form, `pay1.${i}`, businessTaxIdChars[i] || '');
        }

        setTextSafely(form, 'name2', vendorData.name);
        setTextSafely(form, 'add2', vendorData.address || '');

        const vendorTaxIdChars = splitString(vendorData.taxId);
        for (let i = 0; i < 13; i++) {
            setTextSafely(form, `tax1.${i}`, vendorTaxIdChars[i] || '');
        }

        setTextSafely(form, 'date_pay', format(issueDate, 'dd'));
        setTextSafely(form, 'month_pay', format(issueDate, 'MM'));
        setTextSafely(form, 'year_pay', format(issueDate, 'yyyy'));

        form.getCheckBox('chk5').check();
        setTextSafely(form, 'spec1', `ค่าบริการ`);
        setTextSafely(form, 'date8', format(issueDate, 'dd/MM/yyyy'));
        setTextSafely(form, 'date9', totalAmount.toFixed(2));
        setTextSafely(form, 'date10', withholdingAmount.toFixed(2));
        setTextSafely(form, 'rate1', withholdingRate.toString());

        setTextSafely(form, 'total', withholdingAmount.toFixed(2));
        
        // Convert number to Thai text
        try {
            const bahttext = require('bahttext');
            const amountInWords = bahttext(withholdingAmount);
            setTextSafely(form, 'Text1.1.0', amountInWords);
            console.log('💰 Amount in words:', amountInWords);
        } catch (bahtError) {
            console.warn('⚠️ Failed to convert amount to Thai text:', bahtError);
            setTextSafely(form, 'Text1.1.0', `${withholdingAmount.toFixed(2)} บาท`);
        }

        try {
            form.getCheckBox('chk8').check();
        } catch (checkboxError) {
            console.warn('⚠️ Checkbox chk8 not found:', checkboxError);
        }

        // 4. Flatten the form and save
        form.flatten();
        const pdfResultBytes = await pdfDoc.save();

        // 5. Upload PDF to Supabase Storage
        const fileName = `${transaction.businessid}/wht_certificates/${transactionId}_${Date.now()}.pdf`;
        
        // Check if bucket exists and create it if needed
        const { data: buckets, error: bucketListError } = await supabaseAdmin.storage.listBuckets();
        if (bucketListError) {
            console.error('Error listing buckets:', bucketListError);
        }
        
        const bucketExists = buckets?.some(bucket => bucket.name === 'wht_certificates');
        if (!bucketExists) {
            console.log('Creating wht_certificates bucket...');
            const { error: createBucketError } = await supabaseAdmin.storage.createBucket('wht_certificates', {
                public: true,
                allowedMimeTypes: ['application/pdf'],
                fileSizeLimit: 10485760 // 10MB
            });
            if (createBucketError) {
                console.error('Error creating bucket:', createBucketError);
                // Continue anyway, bucket might already exist
            }
        }

        const { error: uploadError } = await supabaseAdmin.storage
            .from('wht_certificates')
            .upload(fileName, pdfResultBytes, {
                contentType: 'application/pdf',
                upsert: true,
            });

        if (uploadError) {
            console.error('Upload error details:', uploadError);
            throw new Error(`Supabase Storage Error: ${uploadError.message}`);
        }

        // 6. Get Public URL
        const { data: urlData } = supabaseAdmin.storage
            .from('wht_certificates')
            .getPublicUrl(fileName);

        // 7. Update Transaction with PDF URL
        const attachment = {
            name: `WHT Certificate - ${vendorData.name}.pdf`,
            url: urlData.publicUrl,
            type: 'application/pdf',
        };
        
        const { error: updateError } = await supabaseAdmin
            .from('transactions')
            .update({
                wht_certificate_attachment: attachment,
                status: 'เสร็จสมบูรณ์',
            })
            .eq('id', transactionId);

        if (updateError) {
            throw new Error(`Supabase Update Error: ${updateError.message}`);
        }

        return NextResponse.json({ success: true, url: urlData.publicUrl });

    } catch (error) {
        console.error('💥 Failed to generate WHT certificate:', error);
        
        // More detailed error logging
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
            error: 'Failed to generate certificate', 
            details: errorMessage,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
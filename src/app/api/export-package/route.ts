// src/app/api/export-package/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Transaction, SalesDoc, Attachment, Quotation, Invoice } from '@/types';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const sanitizeFilename = (name: string) => {
    let s = (name || '').normalize('NFKC').trim();
    s = s.replace(/[^\p{L}\p{N}\s._-]/gu, '_');
    s = s.replace(/\s+/g, '-');
    s = s.replace(/_{2,}/g, '_').replace(/-{2,}/g, '-');
    s = s.replace(/^[_\-.]+|[_\-.]+$/g, '');
    if (!s) s = 'file';
    return s.slice(0, 80);
};

const getSalesDocumentHtml = (docData: SalesDoc, businessName: string): string => {
    const docTypeLabel = docData.type === 'invoice' ? 'ใบแจ้งหนี้ / INVOICE' : 'ใบเสนอราคา / QUOTATION';
    const docTypeLabelOriginal = docData.type === 'invoice' ? '(ต้นฉบับ)' : '';

    const itemsHtml = docData.items.map((item, index) => `
        <tr class="border-b">
            <td class="p-2">${index + 1}</td>
            <td class="p-2">${item.description}</td>
            <td class="p-2 text-right">${item.quantity}</td>
            <td class="p-2 text-right">${item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td class="p-2 text-right">${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><title>${docData.doc_number}</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet"><style>body { font-family: 'Sarabun', sans-serif; }</style></head>
        <body class="p-8 bg-white text-gray-800">
            <header class="flex justify-between items-start pb-4 border-b-2 border-gray-800">
                <div><h1 class="text-2xl font-bold">${businessName}</h1><p class="text-sm">ที่อยู่บริษัทของคุณ...</p><p class="text-sm">เลขประจำตัวผู้เสียภาษี: ...</p></div>
                <div class="text-right"><h2 class="text-3xl font-bold">${docTypeLabel}</h2><p class="text-lg font-semibold">${docTypeLabelOriginal}</p><p class="text-sm mt-4"><strong>เลขที่:</strong> ${docData.doc_number}</p><p class="text-sm"><strong>วันที่:</strong> ${new Date(docData.issue_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
            </header>
            <section class="mt-6 grid grid-cols-2 gap-4">
                <div><h3 class="font-semibold text-gray-600">ลูกค้า:</h3><p class="font-bold">${docData.customer_name}</p><p class="text-sm whitespace-pre-line">${docData.customer_address}</p></div>
                ${docData.type === 'invoice' && docData.due_date ? `<div class="text-right"><h3 class="font-semibold text-gray-600">ครบกำหนดชำระ:</h3><p>${new Date(docData.due_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>` : ''}
            </section>
            <section class="mt-8"><table class="w-full text-sm"><thead class="bg-gray-800 text-white"><tr><th class="p-2 text-left font-semibold">#</th><th class="p-2 text-left font-semibold w-1/2">รายละเอียด</th><th class="p-2 text-right font-semibold">จำนวน</th><th class="p-2 text-right font-semibold">ราคา/หน่วย</th><th class="p-2 text-right font-semibold">ยอดรวม</th></tr></thead><tbody>${itemsHtml}</tbody></table></section>
            <section class="mt-6 flex justify-end"><div class="w-2/5 space-y-2 text-sm"><div class="flex justify-between"><span class="text-gray-600">รวมเป็นเงิน:</span><span class="font-semibold">${docData.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div><div class="flex justify-between"><span class="text-gray-600">ภาษีมูลค่าเพิ่ม (7%):</span><span class="font-semibold">${docData.vat_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div><div class="flex justify-between font-bold text-lg bg-gray-800 text-white p-2 rounded"><span>ยอดชำระสุทธิ:</span><span>${docData.grand_total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div></div></section>
        </body></html>
    `;
};


export async function POST(req: NextRequest) {
    let browser = null;
    try {
        const {
            businessId,
            startDate,
            endDate,
            documentTypes,
            reports,
            categories
        } = await req.json();

        if (!businessId || !startDate || !endDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        const endDateISO = endOfDay.toISOString();
        
        const masterZip = new JSZip();
        
        let transactionQuery = supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('businessid', businessId)
            .gte('date', startDate)
                .lte('date', endDateISO)
                .eq('isdeleted', false)
                .neq('status', 'ยกเลิก');

        if (categories && categories.length > 0) {
            transactionQuery = transactionQuery.in('category', categories);
        }
        
        const { data: allTransactions, error: transError } = await transactionQuery;

        if (transError) throw new Error(`Supabase transaction query failed: ${transError.message}`);

        const transactionsWithDate = allTransactions.map(t => ({ ...t, date: new Date(t.date) }));

        if (documentTypes && Object.values(documentTypes).some(v => v)) {
            const docZip = new JSZip();
            const filePromises: Promise<void>[] = [];

            const parseDesc = (desc?: string) => {
                if (!desc) return { reference: '', partner: '' } as any;
                const refMatch = desc.match(/\(อ้างอิง:\s*([^\)]+)\)/);
                const partnerMatch = desc.match(/\(คู่ค้า:\s*([^\)]+)\)/);
                return { reference: refMatch?.[1]?.trim() || '', partner: partnerMatch?.[1]?.trim() || '' };
            };
            transactionsWithDate.forEach(transaction => {
                const date = transaction.date as Date;
                const datePrefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const { reference, partner } = parseDesc(transaction.description);
                const contactSlug = partner ? sanitizeFilename(partner).slice(0, 20) : '';
                const primary = reference ? sanitizeFilename(reference) : '';

                const addFileToZip = (att: Attachment, folder: string, type: string) => {
                    if (!att || !att.url) return;
                    filePromises.push(
                        fetch(att.url).then(res => res.arrayBuffer()).then(buffer => {
                            const extension = att.url.split('.').pop()?.split('?')[0] || 'file';
                            const firstToken = primary || contactSlug || sanitizeFilename(String(transaction.id));
                            const secondToken = primary && contactSlug ? contactSlug : '';
                            const parts = [datePrefix, firstToken, secondToken, type].filter(Boolean);
                            const fileName = `${parts.join('_')}.${extension}`;
                            docZip.folder(folder)!.file(fileName, buffer);
                        }).catch(e => console.error(`Failed to fetch ${att.url}:`, e))
                    );
                };

                if (documentTypes.slips && transaction.slip_attachments) {
                    (transaction.slip_attachments as Attachment[]).forEach(att => addFileToZip(att, '5. สลิปและเอกสารทั่วไป (Slips & Others)', 'slip'));
                }
                if (documentTypes.receipts && transaction.document_attachments) {
                    const taxFolder = transaction.type === 'income' ? '1. ภาษีขาย (Sales Tax)' : '2. ภาษีซื้อ (Purchase Tax)';
                    (transaction.document_attachments as Attachment[]).forEach(att => addFileToZip(att, taxFolder, 'tax-invoice'));
                }
                if (documentTypes.wht && transaction.wht_certificate_attachment) {
                    addFileToZip(transaction.wht_certificate_attachment as Attachment, '3. หนังสือรับรองหัก ณ ที่จ่าย (WHT Certs)', 'wht-cert');
                }
            });

            if (documentTypes.salesDocs) {
                      const { data: salesDocs, error: salesDocsError } = await supabaseAdmin
                    .from('sales_documents')
                    .select('*')
                          .eq('businessid', businessId)
                          .gte('issuedate', startDate)
                          .lte('issuedate', endDateISO);
                 
                 if (salesDocsError) throw new Error(`Supabase sales_documents query failed: ${salesDocsError.message}`);

                 if (salesDocs && salesDocs.length > 0) {
                     const getBrowser = async () => {
                        if (process.env.NODE_ENV === 'development') {
                            const puppeteerFull = await import('puppeteer');
                            return puppeteerFull.launch({ headless: true });
                        }
                        return puppeteer.launch({
                            args: chromium.args,
                            defaultViewport: chromium.defaultViewport,
                            executablePath: await chromium.executablePath(),
                            headless: chromium.headless,
                        });
                    };
                    
                     browser = await getBrowser();
                     const { data: businessData, error: businessError } = await supabaseAdmin
                        .from('businesses')
                        .select('businessname')
                        .eq('id', businessId)
                        .single();
                     
                     if(businessError) throw new Error(`Failed to fetch business name: ${businessError.message}`);
                     const businessName = businessData?.businessname || 'My Business';

                    for (const salesDoc of salesDocs) {
                        const page = await browser.newPage();
                        await page.setContent(getSalesDocumentHtml({
                            ...(salesDoc as any),
                            issue_date: (salesDoc as any).issue_date ?? (salesDoc as any).issuedate,
                            due_date: (salesDoc as any).due_date ?? (salesDoc as any).duedate,
                        } as SalesDoc, businessName), { waitUntil: 'networkidle0' });
                        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
                        await page.close();
                        const issue = new Date(((salesDoc as any).issue_date ?? (salesDoc as any).issuedate));
                        const datePrefix = `${issue.getFullYear()}-${String(issue.getMonth() + 1).padStart(2, '0')}-${String(issue.getDate()).padStart(2, '0')}`;
                        docZip.folder('4. เอกสารขาย (ใบแจ้งหนี้-ใบเสนอราคา)')!.file(`${datePrefix}_${(salesDoc as any).doc_number}_${sanitizeFilename((salesDoc as any).customer_name)}.pdf`, pdfBuffer);
                    }
                }
            }
            
            await Promise.all(filePromises);
            const docZipContent = await docZip.generateAsync({ type: 'nodebuffer' });
            masterZip.file('document_files.zip', docZipContent);
        }

        if (reports && reports.tax) {
            const taxTransactions = transactionsWithDate.filter(t => t.vat_amount && t.vat_amount > 0);
            const salesTaxTransactions = taxTransactions.filter(t => t.type === 'income');
            const purchaseTaxTransactions = taxTransactions.filter(t => t.type === 'expense' || t.type === 'cogs');
            const workbook = new ExcelJS.Workbook();
            
            const salesSheet = workbook.addWorksheet('ภาษีขาย');
            salesSheet.columns = [{ header: 'วันที่', key: 'date', width: 15 }, { header: 'รายละเอียด', key: 'description', width: 40 }, { header: 'หมวดหมู่', key: 'category', width: 25 }, { header: 'ยอดก่อน VAT', key: 'subtotal', width: 15 }, { header: 'ยอด VAT', key: 'vat_amount', width: 15 }, { header: 'ยอดรวม', key: 'amount', width: 15 }];
            salesSheet.getRow(1).font = { bold: true };
            salesTaxTransactions.forEach(t => salesSheet.addRow(t));
            ['subtotal', 'vat_amount', 'amount'].forEach(key => salesSheet.getColumn(key).numFmt = '#,##0.00');

            const purchaseSheet = workbook.addWorksheet('ภาษีซื้อ');
            purchaseSheet.columns = [{ header: 'วันที่', key: 'date', width: 15 }, { header: 'รายละเอียด', key: 'description', width: 40 }, { header: 'หมวดหมู่', key: 'category', width: 25 }, { header: 'ยอดก่อน VAT', key: 'subtotal', width: 15 }, { header: 'ยอด VAT', key: 'vat_amount', width: 15 }, { header: 'ยอดรวม', key: 'amount', width: 15 }];
            purchaseSheet.getRow(1).font = { bold: true };
            purchaseTaxTransactions.forEach(t => purchaseSheet.addRow(t));
            ['subtotal', 'vat_amount', 'amount'].forEach(key => purchaseSheet.getColumn(key).numFmt = '#,##0.00');

            const buffer = await workbook.xlsx.writeBuffer();
            masterZip.file(`Accountee_Tax_Report_${startDate}_to_${endDate}.xlsx`, buffer);
        }

        if (reports && reports.wht) {
            const whtTransactions = transactionsWithDate.filter(t => t.withholding_tax && t.withholding_tax > 0);
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('รายงานหัก ณ ที่จ่าย');
            sheet.columns = [{ header: 'วันที่', key: 'date', width: 15 }, { header: 'รายละเอียด', key: 'description', width: 50 }, { header: 'ยอดเงินก่อนหักภาษี', key: 'subtotal', width: 20 }, { header: 'อัตราภาษี (%)', key: 'whtRate', width: 15 }, { header: 'ยอดภาษีที่หัก', key: 'whtAmount', width: 20 }];
            sheet.getRow(1).font = { bold: true };
            whtTransactions.forEach(t => sheet.addRow({ date: t.date, description: t.description, subtotal: t.subtotal, whtRate: t.withholding_tax_rate, whtAmount: t.withholding_tax }));
            ['subtotal', 'whtAmount'].forEach(key => sheet.getColumn(key).numFmt = '#,##0.00');
            const buffer = await workbook.xlsx.writeBuffer();
            masterZip.file(`Accountee_WHT_Report_${startDate}_to_${endDate}.xlsx`, buffer);
        }

        const content = await masterZip.generateAsync({ type: 'arraybuffer' });

    return new NextResponse(Buffer.from(content), {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="Accountee_Export_Package_${startDate}_to_${endDate}.zip"`,
            },
        });

    } catch (error) {
        console.error('Export failed:', error);
        return NextResponse.json({ error: `An error occurred during export: ${(error as Error).message}` }, { status: 500 });
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
}

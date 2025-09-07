// src/app/api/export-preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Attachment } from '@/types';

// Function to sanitize filenames
const sanitizeFilename = (name: string) => {
    let s = (name || '').normalize('NFKC').trim();
    s = s.replace(/[^\p{L}\p{N}\s._-]/gu, '_');
    s = s.replace(/\s+/g, '-');
    s = s.replace(/_{2,}/g, '_').replace(/-{2,}/g, '-');
    s = s.replace(/^[_\-.]+|[_\-.]+$/g, '');
    if (!s) s = 'file';
    return s.slice(0, 80);
};

// Extract base/partner/reference from description suffix style
const parseDesc = (desc?: string) => {
    if (!desc) return { base: '', partner: '', reference: '' };
    let base = desc;
    const partnerMatch = base.match(/\(คู่ค้า:\s*([^\)]+)\)/);
    const refMatch = base.match(/\(อ้างอิง:\s*([^\)]+)\)/);
    base = base.replace(/\s*\(คู่ค้า:[^\)]*\)/g, '').replace(/\s*\(อ้างอิง:[^\)]*\)/g, '').trim();
    return { base, partner: partnerMatch?.[1]?.trim() || '', reference: refMatch?.[1]?.trim() || '' };
};

export interface FilePreview {
    folder: string;
    fileName: string;
}

export async function POST(req: NextRequest) {
    try {
        const {
            businessId,
            startDate,
            endDate,
            documentTypes,
            categories
        } = await req.json();

        if (!businessId || !startDate || !endDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        const endDateISO = endOfDay.toISOString();
        
        const fileList: FilePreview[] = [];

        // --- Fetch Transactions ---
        let transactionQuery = supabaseAdmin
            .from('transactions')
            .select('id, date, description, slip_attachments, document_attachments, wht_certificate_attachment')
            .eq('businessid', businessId)
            .gte('date', startDate)
                .lte('date', endDateISO)
                .eq('isdeleted', false)
                .neq('status', 'ยกเลิก');

        if (categories && categories.length > 0) {
            transactionQuery = transactionQuery.in('category', categories);
        }

        const { data: transactionsData, error: transactionError } = await transactionQuery;

        if (transactionError) {
            console.error('Supabase transaction query error:', transactionError);
            throw new Error(`Supabase transaction query failed: ${transactionError.message}`);
        }

    transactionsData.forEach(transaction => {
            try {
                const date = new Date(transaction.date);
                const datePrefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const folderName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const { reference, partner } = parseDesc(transaction.description);
    const contactSlug = partner ? sanitizeFilename(partner).slice(0, 20) : '';
    const primary = reference ? sanitizeFilename(reference) : '';

                const addFileToList = (att: Attachment, type: string) => {
                    if (!att || !att.url) return;
                    const extension = att.url.split('.').pop()?.split('?')[0] || 'file';
                    // If reference exists -> include both reference and contact; else use contact alone; fallback to transaction id only if both missing
                    const firstToken = primary || contactSlug || sanitizeFilename(String(transaction.id));
                    const secondToken = primary && contactSlug ? contactSlug : '';
                    const parts = [datePrefix, firstToken, secondToken, type].filter(Boolean);
                    const fileName = `${parts.join('_')}.${extension}`;
                    fileList.push({ folder: folderName, fileName });
                };

                if (documentTypes.slips && transaction.slip_attachments) {
                    (transaction.slip_attachments as Attachment[]).forEach(att => addFileToList(att, 'slip'));
                }
                if (documentTypes.receipts && transaction.document_attachments) {
                    (transaction.document_attachments as Attachment[]).forEach(att => addFileToList(att, 'tax-invoice'));
                }
                if (documentTypes.wht && transaction.wht_certificate_attachment) {
                    addFileToList(transaction.wht_certificate_attachment as Attachment, 'wht-cert');
                }
            } catch (e) {
                console.error(`Error processing transaction ${transaction.id}:`, e);
            }
        });
        
        // --- Fetch Sales Documents ---
        if (documentTypes.salesDocs) {
                 const { data: salesDocsData, error: salesDocsError } = await supabaseAdmin
                .from('sales_documents')
                     .select('doc_number, customer_name, issuedate')
                     .eq('businessid', businessId)
                     .gte('issuedate', startDate)
                     .lte('issuedate', endDateISO);

            if (salesDocsError) {
                console.error('Supabase sales_documents query error:', salesDocsError);
                throw new Error(`Supabase sales_documents query failed: ${salesDocsError.message}`);
            }

            salesDocsData.forEach(salesDoc => {
                const date = new Date((salesDoc as any).issuedate);
                const datePrefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const folderName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const fileName = `${datePrefix}_${salesDoc.doc_number}_${sanitizeFilename(salesDoc.customer_name)}.pdf`;
                fileList.push({ folder: folderName, fileName });
            });
        }
        
        fileList.sort((a, b) => (a.folder + a.fileName).localeCompare(b.folder + b.fileName));

        return NextResponse.json(fileList);

    } catch (error) {
        console.error('Preview generation failed:', error);
        return NextResponse.json({ error: `An error occurred during preview generation: ${(error as Error).message}` }, { status: 500 });
    }
}
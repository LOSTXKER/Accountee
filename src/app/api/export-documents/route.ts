// src/app/api/export-documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Attachment, SalesDoc } from '@/types';
import JSZip from 'jszip';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Sanitize filenames to avoid invalid characters (allow Unicode letters/numbers incl. Thai)
const sanitizeFilename = (name: string) => {
	let s = (name || '').normalize('NFKC').trim();
	// Replace illegal chars with underscore, allow letters/numbers/space/._-
	s = s.replace(/[^\p{L}\p{N}\s._-]/gu, '_');
	// Collapse whitespace to single hyphen for readability
	s = s.replace(/\s+/g, '-');
	// Collapse repeated separators
	s = s.replace(/_{2,}/g, '_').replace(/-{2,}/g, '-');
	// Trim leading/trailing separators
	s = s.replace(/^[_\-.]+|[_\-.]+$/g, '');
	if (!s) s = 'file';
	return s.slice(0, 80);
};

// Generate simple printable HTML for sales documents (quotation/invoice/receipt)
const getSalesDocumentHtml = (docData: SalesDoc, businessName: string): string => {
	const typeMap: Record<SalesDoc['type'], { th: string; en: string; isOriginal?: boolean }> = {
		quotation: { th: 'ใบเสนอราคา', en: 'QUOTATION' },
		proforma: { th: 'ใบแจ้งหนี้ (Proforma)', en: 'PROFORMA INVOICE' },
		invoice: { th: 'ใบแจ้งหนี้', en: 'INVOICE', isOriginal: true },
		'credit-note': { th: 'ใบลดหนี้', en: 'CREDIT NOTE' },
		'debit-note': { th: 'ใบเพิ่มหนี้', en: 'DEBIT NOTE' },
		receipt: { th: 'ใบเสร็จรับเงิน', en: 'RECEIPT', isOriginal: true },
	};
	const typeInfo = typeMap[docData.type];

	const itemsHtml = docData.items
		.map(
			(item, i) => `
				<tr class="border-b">
					<td class="p-2">${i + 1}</td>
					<td class="p-2">${item.description}</td>
					<td class="p-2 text-right">${item.quantity}</td>
					<td class="p-2 text-right">${item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
					<td class="p-2 text-right">${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
				</tr>`
		)
		.join('');

	return `<!DOCTYPE html><html><head><meta charset="UTF-8" />
		<title>${docData.doc_number}</title>
		<script src="https://cdn.tailwindcss.com"></script>
		<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet" />
		<style>body{font-family:'Sarabun',sans-serif}</style>
	</head>
	<body class="p-8 bg-white text-gray-800">
		<header class="flex justify-between items-start pb-4 border-b-2 border-gray-800">
			<div>
				<h1 class="text-2xl font-bold">${businessName}</h1>
			</div>
			<div class="text-right">
				<h2 class="text-3xl font-bold">${typeInfo.th} / ${typeInfo.en}</h2>
				${typeInfo.isOriginal ? '<p class="text-sm font-semibold">(ต้นฉบับ)</p>' : ''}
				<p class="text-sm mt-4"><strong>เลขที่:</strong> ${docData.doc_number}</p>
				<p class="text-sm"><strong>วันที่:</strong> ${new Date(docData.issue_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
			</div>
		</header>
		<section class="mt-6 grid grid-cols-2 gap-4">
			<div>
				<h3 class="font-semibold text-gray-600">ลูกค้า:</h3>
				<p class="font-bold">${docData.customer_name}</p>
				<p class="text-sm whitespace-pre-line">${docData.customer_address || ''}</p>
			</div>
			${docData.type === 'invoice' && docData.due_date ? `<div class="text-right"><h3 class="font-semibold text-gray-600">ครบกำหนดชำระ:</h3><p>${new Date(docData.due_date).toLocaleDateString('th-TH')}</p></div>` : ''}
		</section>
		<section class="mt-8">
			<table class="w-full text-sm">
				<thead class="bg-gray-800 text-white">
					<tr><th class="p-2 text-left">#</th><th class="p-2 text-left w-1/2">รายละเอียด</th><th class="p-2 text-right">จำนวน</th><th class="p-2 text-right">ราคา/หน่วย</th><th class="p-2 text-right">ยอดรวม</th></tr>
				</thead>
				<tbody>${itemsHtml}</tbody>
			</table>
		</section>
		<section class="mt-6 flex justify-end">
			<div class="w-2/5 space-y-2 text-sm">
				<div class="flex justify-between"><span class="text-gray-600">รวมเป็นเงิน:</span><span class="font-semibold">${docData.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>
				<div class="flex justify-between"><span class="text-gray-600">ภาษีมูลค่าเพิ่ม:</span><span class="font-semibold">${docData.vat_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>
				<div class="flex justify-between font-bold text-lg bg-gray-800 text-white p-2 rounded"><span>ยอดชำระสุทธิ:</span><span>${docData.grand_total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>
			</div>
		</section>
	</body></html>`;
};

export async function POST(req: NextRequest) {
	let browser: import('puppeteer-core').Browser | import('puppeteer').Browser | null = null;
	try {
		const { businessId, startDate, endDate, documentTypes } = await req.json();

		if (!businessId || !startDate || !endDate) {
			return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
		}

		const endOfDay = new Date(endDate);
		endOfDay.setHours(23, 59, 59, 999);
		const endDateISO = endOfDay.toISOString();

		const zip = new JSZip();

		// --- Fetch transactions in range ---
			const { data: transactions, error: transError } = await supabaseAdmin
				.from('transactions')
				.select('*')
				.eq('businessid', businessId)
				.gte('date', startDate)
				.lte('date', endDateISO)
				.eq('isdeleted', false)
				.neq('status', 'ยกเลิก');

		if (transError) {
			throw new Error(`Supabase transaction query failed: ${transError.message}`);
		}

		const fileTasks: Promise<void>[] = [];

		if (documentTypes && Object.values(documentTypes).some(Boolean)) {
			const parseDesc = (desc?: string) => {
				if (!desc) return { reference: '', partner: '' } as any;
				const refMatch = desc.match(/\(อ้างอิง:\s*([^\)]+)\)/);
				const partnerMatch = desc.match(/\(คู่ค้า:\s*([^\)]+)\)/);
				return { reference: refMatch?.[1]?.trim() || '', partner: partnerMatch?.[1]?.trim() || '' };
			};
			transactions.forEach((t: any) => {
				const date = new Date(t.date);
				const datePrefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
				const { reference, partner } = parseDesc(t.description);
				const contactSlug = partner ? sanitizeFilename(partner).slice(0, 20) : '';
				const primary = reference ? sanitizeFilename(reference) : '';

				const addFile = (att: Attachment, folder: string, type: string) => {
					if (!att || !att.url) return;
					fileTasks.push(
						fetch(att.url)
							.then((res) => res.arrayBuffer())
							.then((buffer) => {
								const extension = att.url.split('.').pop()?.split('?')[0] || 'file';
								const firstToken = primary || contactSlug || sanitizeFilename(String(t.id));
								const secondToken = primary && contactSlug ? contactSlug : '';
								const parts = [datePrefix, firstToken, secondToken, type].filter(Boolean);
								const fileName = `${parts.join('_')}.${extension}`;
								zip.folder(folder)!.file(fileName, buffer);
							})
							.catch((e) => console.error(`Failed to fetch ${att.url}:`, e))
					);
				};

				if (documentTypes.slips && t.slip_attachments) {
					(t.slip_attachments as Attachment[]).forEach((att) => addFile(att, '5. สลิปและเอกสารทั่วไป (Slips & Others)', 'slip'));
				}
				if (documentTypes.receipts && t.document_attachments) {
					const taxFolder = t.type === 'income' ? '1. ภาษีขาย (Sales Tax)' : '2. ภาษีซื้อ (Purchase Tax)';
					(t.document_attachments as Attachment[]).forEach((att) => addFile(att, taxFolder, 'tax-invoice'));
				}
				if (documentTypes.wht && t.wht_certificate_attachment) {
					addFile(t.wht_certificate_attachment as Attachment, '3. หนังสือรับรองหัก ณ ที่จ่าย (WHT Certs)', 'wht-cert');
				}
			});
		}

		// --- Include Sales Documents as PDFs if requested ---
		if (documentTypes?.salesDocs) {
							const { data: salesDocs, error: salesDocsError } = await supabaseAdmin
						.from('sales_documents')
						.select('*')
						.eq('businessid', businessId)
								.gte('issuedate', startDate)
								.lte('issuedate', endDateISO);

			if (salesDocsError) {
				throw new Error(`Supabase sales_documents query failed: ${salesDocsError.message}`);
			}

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

				if (businessError) throw new Error(`Failed to fetch business name: ${businessError.message}`);
				const businessName = (businessData as any)?.businessname || 'My Business';

								for (const doc of salesDocs) {
							if (!browser) throw new Error('Failed to initialize headless browser');
							const page = await browser.newPage();
									const normalizedDoc = {
										...(doc as any),
										issue_date: (doc as any).issue_date ?? (doc as any).issuedate,
										due_date: (doc as any).due_date ?? (doc as any).duedate,
									} as SalesDoc as any;
									await page.setContent(getSalesDocumentHtml(normalizedDoc as SalesDoc, businessName), { waitUntil: 'networkidle0' });
					  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
					await page.close();
					  const safeName = `${doc.doc_number}_${sanitizeFilename(doc.customer_name)}`;
					  const issue = new Date((normalizedDoc as any).issue_date);
					  const datePrefix = `${issue.getFullYear()}-${String(issue.getMonth() + 1).padStart(2, '0')}-${String(issue.getDate()).padStart(2, '0')}`;
					  zip.folder('4. เอกสารขาย (ใบแจ้งหนี้-ใบเสนอราคา)')!.file(`${datePrefix}_${safeName}.pdf`, pdfBuffer);
				}
			}
		}

		await Promise.all(fileTasks);
		const content = await zip.generateAsync({ type: 'arraybuffer' });

	return new NextResponse(Buffer.from(content), {
			status: 200,
			headers: {
				'Content-Type': 'application/zip',
		'Content-Disposition': `attachment; filename="Accountee_Documents_${startDate}_to_${endDate}.zip"`,
			},
		});
	} catch (error) {
		console.error('Export documents failed:', error);
		return NextResponse.json({ error: `An error occurred during export: ${(error as Error).message}` }, { status: 500 });
	} finally {
		if (browser) {
			try { await browser.close(); } catch {}
		}
	}
}


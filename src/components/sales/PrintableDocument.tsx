// src/components/sales/PrintableDocument.tsx
import React from 'react';
import { SalesDoc, Business, Invoice } from '@/types';

interface PrintableDocumentProps {
    docData: SalesDoc;
    businessData: Partial<Business>; 
}

// Helper to safely format dates that can be string or Date
const formatDate = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
};


export const PrintableDocument = React.forwardRef<HTMLDivElement, PrintableDocumentProps>(({ docData, businessData }, ref) => {
    
    const status: string = (docData as any).status;
    const isPaid = status === 'ชำระแล้ว' || status === 'สมบูรณ์';
    let docTypeLabel = '';
    
    switch (docData.type) {
        case 'quotation':
            docTypeLabel = 'ใบเสนอราคา / QUOTATION';
            break;
        case 'proforma':
            docTypeLabel = 'ใบแจ้งหนี้เบื้องต้น / PROFORMA INVOICE';
            break;
        case 'invoice':
            // Always render invoice as Invoice, even if paid. The paid stamp will still appear.
            docTypeLabel = 'ใบแจ้งหนี้ / INVOICE';
            break;
        case 'receipt':
            docTypeLabel = 'ใบเสร็จรับเงิน / ใบกำกับภาษี';
            break;
        case 'credit-note':
            docTypeLabel = 'ใบลดหนี้ / CREDIT NOTE';
            break;
        case 'debit-note':
            docTypeLabel = 'ใบเพิ่มหนี้ / DEBIT NOTE';
            break;
    }
    
    const docTypeLabelOriginal = '(ต้นฉบับ)';
    const invoiceData = docData as Invoice;
    const docNumber = (docData as any).docnumber || (docData as any).doc_number;
    const issueDate: any = (docData as any).issuedate || (docData as any).issue_date;
    const dueDate: any = (docData as any).duedate || (docData as any).due_date;
    const customerName: string = (docData as any).customername || (docData as any).customer_name;
    const customerAddress: string = (docData as any).customeraddress || (docData as any).customer_address;
    const subtotal: number = (docData as any).subtotal || (docData as any).subtotal;
    const discountAmount: number = (docData as any).discountamount || (docData as any).discount_amount || 0;
    const vatAmount: number = (docData as any).vatamount || (docData as any).vat_amount || 0;
    const withholdingTaxAmount: number = (docData as any).withholdingtaxamount || (docData as any).withholding_tax_amount || 0;
    const grandTotal: number = (docData as any).grandtotal || (docData as any).grand_total || 0;

    return (
        <div ref={ref} className="p-8 bg-white text-gray-800 font-sans">
            <style type="text/css" media="print">
            {`
              @page { size: A4; margin: 0; }
              body { -webkit-print-color-adjust: exact; }
            `}
            </style>
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800">
                <div>
                    {businessData.logo_url ? (
                        <img src={businessData.logo_url} alt="Company Logo" className="w-32 h-auto mb-2 object-contain" />
                    ) : (
                        <div className="w-24 h-24 bg-gray-200 mb-2 flex items-center justify-center">
                            <span className="text-sm text-gray-500">Your Logo</span>
                        </div>
                    )}
                    <h1 className="text-2xl font-bold">{businessData.businessname}</h1>
                    <p className="text-sm whitespace-pre-line">{businessData.company_address}</p>
                    <p className="text-sm">เลขประจำตัวผู้เสียภาษี: {businessData.tax_id}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold">{docTypeLabel}</h2>
                    <p className="text-lg font-semibold">{docTypeLabelOriginal}</p>
                    <p className="text-sm mt-4"><strong>เลขที่:</strong> {docNumber}</p>
                    <p className="text-sm"><strong>วันที่:</strong> {formatDate(issueDate)}</p>
                    {invoiceData.related_quotation_id && (
                        <p className="text-sm"><strong>อ้างอิง:</strong> {invoiceData.related_quotation_id}</p>
                    )}
                </div>
            </header>

            <section className="mt-6 grid grid-cols-2 gap-4">
                <div>
                    <h3 className="font-semibold text-gray-600">ลูกค้า:</h3>
                    <p className="font-bold">{customerName}</p>
                    <p className="text-sm whitespace-pre-line">{customerAddress}</p>
                </div>
                {docData.type === 'invoice' && dueDate && (
                     <div className="text-right">
                        <h3 className="font-semibold text-gray-600">ครบกำหนดชำระ:</h3>
                        <p>{formatDate(dueDate)}</p>
                    </div>
                )}
            </section>

            <section className="mt-8">
                <table className="w-full text-sm">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="p-2 text-left font-semibold">#</th>
                            <th className="p-2 text-left font-semibold w-1/2">รายละเอียด</th>
                            <th className="p-2 text-right font-semibold">จำนวน</th>
                            <th className="p-2 text-right font-semibold">ราคา/หน่วย</th>
                            <th className="p-2 text-right font-semibold">ยอดรวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(docData.items || []).map((item, index) => (
                            <tr key={index} className="border-b">
                                <td className="p-2">{index + 1}</td>
                                <td className="p-2">{item.description}</td>
                                <td className="p-2 text-right">{item.quantity}</td>
                                <td className="p-2 text-right">{item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                <td className="p-2 text-right">{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className="mt-6 flex justify-between items-end">
                {isPaid && (
                    <div className="text-green-600 font-bold border-4 border-green-600 p-4 rounded-lg transform -rotate-15 text-2xl">
                        ชำระแล้ว
                    </div>
                )}
                <div className="w-2/5 space-y-2 text-sm ml-auto">
                    <div className="flex justify-between">
                        <span className="text-gray-600">รวมเป็นเงิน:</span>
                        <span className="font-semibold">{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">ส่วนลด:</span>
                            <span className="font-semibold">{discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-gray-600">ยอดหลังหักส่วนลด:</span>
                        <span className="font-semibold">{(subtotal - discountAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">ภาษีมูลค่าเพิ่ม (7%):</span>
                        <span className="font-semibold">{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                     {withholdingTaxAmount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">หัก ณ ที่จ่าย:</span>
                            <span className="font-semibold">({withholdingTaxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })})</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-lg bg-gray-800 text-white p-2 rounded">
                        <span>ยอดชำระสุทธิ:</span>
                        <span>{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </section>

            {(docData.type === 'invoice' || docData.type === 'receipt') && businessData.bank_details && (
                 <section className="mt-8 pt-4 border-t text-sm">
                    <h3 className="font-bold mb-2">รายละเอียดการชำระเงิน:</h3>
                    <div className="whitespace-pre-line bg-slate-50 p-3 rounded-md">
                        {businessData.bank_details}
                    </div>
                </section>
            )}

             <footer className="mt-20 text-center text-xs text-gray-500 border-t pt-4">
                <p>ขอบคุณที่ใช้บริการ</p>
                <p>เอกสารนี้จัดทำโดยระบบคอมพิวเตอร์</p>
            </footer>
        </div>
    );
});

PrintableDocument.displayName = 'PrintableDocument';
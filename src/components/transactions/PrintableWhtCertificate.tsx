// src/components/transactions/PrintableWhtCertificate.tsx
import React from 'react';
import { Transaction, Business } from '@/types';

interface VendorData {
    name: string;
    address: string;
    taxId: string;
}

interface PrintableWhtProps {
    transaction: Transaction;
    business: Partial<Business>;
    vendor: VendorData;
}

export const PrintableWhtCertificate = React.forwardRef<HTMLDivElement, PrintableWhtProps>(({ transaction, business, vendor }, ref) => {
    const issueDate = (transaction.date as Date).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    
    const whtAmount = transaction.withholdingtax || 0;
    const subtotal = transaction.subtotal || 0;

    return (
        <div ref={ref} className="p-8 bg-white text-gray-800 font-sans text-sm">
            <div className="text-center mb-4">
                <h1 className="text-lg font-bold">หนังสือรับรองการหักภาษี ณ ที่จ่าย</h1>
                <h2 className="text-md">ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="font-bold">ผู้มีหน้าที่หักภาษี ณ ที่จ่าย (ผู้จ่าย)</p>
                    <p>{business.businessname || ''}</p>
                    <p className="whitespace-pre-line">{business.company_address || ''}</p>
                    <p>เลขประจำตัวผู้เสียภาษีอากร: {business.tax_id || ''}</p>
                </div>
                 <div className="text-right">
                    <p><strong>ฉบับที่ 1</strong> (สำหรับผู้ถูกหักภาษี ณ ที่จ่าย)</p>
                    <p><strong>เลขที่เอกสาร:</strong> WHT-{transaction.id.substring(0, 6)}</p>
                </div>
            </div>
            
            <div className="mt-4">
                <p className="font-bold">ผู้ถูกหักภาษี ณ ที่จ่าย (ผู้รับเงิน)</p>
                <p>{vendor.name}</p>
                <p className="whitespace-pre-line">{vendor.address}</p>
                <p>เลขประจำตัวผู้เสียภาษีอากร: {vendor.taxId}</p>
            </div>
            
            <table className="w-full mt-4 border-collapse border border-black">
                <thead>
                    <tr>
                        <th className="w-1/2 border border-black p-1">ประเภทเงินได้พึงประเมินที่จ่าย</th>
                        <th className="border border-black p-1">วันเดือนปีที่จ่าย</th>
                        <th className="border border-black p-1">จำนวนเงินที่จ่าย</th>
                        <th className="border border-black p-1">ภาษีที่หักและนำส่งไว้</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="text-center border border-black p-1">{transaction.category}</td>
                        <td className="text-center border border-black p-1">{issueDate}</td>
                        <td className="text-right border border-black p-1">{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="text-right border border-black p-1">{whtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                        <td className="text-center font-bold border border-black p-1">รวม</td>
                        <td className="border border-black p-1"></td>
                        <td className="text-right font-bold border border-black p-1">{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="text-right font-bold border border-black p-1">{whtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                </tbody>
            </table>
            
            <div className="text-center mt-4">
                <p>ขอรับรองว่าข้อความและตัวเลขดังกล่าวข้างต้นถูกต้องตรงตามความจริงทุกประการ</p>
                <div className="mt-12">
                    <p>(........................................................)</p>
                    <p>ผู้จ่ายเงิน</p>
                    <p>วันที่ออกหนังสือรับรอง: {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>
        </div>
    );
});

PrintableWhtCertificate.displayName = 'PrintableWhtCertificate';
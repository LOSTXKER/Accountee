// src/app/templates/wht/page.tsx
"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Business, Transaction } from '@/types';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// Helper to safely parse JSON
const safeJsonParse = (str: string | null) => {
    if (!str) return null;
    try {
        return JSON.parse(str);
    } catch (e) {
        console.error("Failed to parse JSON:", e);
        return null;
    }
};

// Helper to format numbers with commas
const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '-';
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

// Helper to convert number to Thai Baht text
const numberToThaiBahtText = (num: number): string => {
    const bahtText = require('bahttext');
    return bahtText(num);
};

function WhtCertificateContent() {
    const searchParams = useSearchParams();

    const business: Business | null = safeJsonParse(searchParams.get('business'));
    const transaction: Transaction | null = safeJsonParse(searchParams.get('transaction'));
    const vendor: { name: string; address: string; taxId: string } | null = safeJsonParse(searchParams.get('vendor'));

    if (!business || !transaction || !vendor) {
        return <div className="p-10 text-red-500">Error: Missing required data for certificate generation.</div>;
    }
    
    const issueDate = new Date(transaction.date);
    const thaiDate = format(issueDate, 'd MMMM yyyy', { locale: th });
    const withholdingAmount = transaction.withholdingtax || 0;
    const totalAmount = transaction.subtotal || 0;
    const withholdingRate = transaction.wht_rate || 0;
    const amountInWords = numberToThaiBahtText(withholdingAmount);

    return (
        <html lang="th">
            <head>
                <title>หนังสือรับรองการหักภาษี ณ ที่จ่าย</title>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
                    body {
                        font-family: 'Sarabun', sans-serif;
                        font-size: 12px;
                        line-height: 1.4;
                        margin: 0;
                        padding: 0;
                        background: white;
                        color: #000;
                    }
                    .page {
                        width: 210mm;
                        height: 297mm;
                        padding: 20mm;
                        margin: auto;
                        box-sizing: border-box;
                        position: relative;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .header h1 {
                        font-size: 18px;
                        font-weight: bold;
                        margin: 0;
                    }
                    .header p {
                        font-size: 14px;
                        margin: 0;
                    }
                    .garuda {
                        width: 40px;
                        position: absolute;
                        top: 20mm;
                        left: 20mm;
                    }
                    .section {
                        border: 1px solid #000;
                        padding: 10px;
                        margin-bottom: 10px;
                    }
                    .grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                    }
                    .full-width {
                        grid-column: 1 / -1;
                    }
                    .label {
                        font-weight: bold;
                    }
                    .checkbox {
                        display: inline-block;
                        width: 12px;
                        height: 12px;
                        border: 1px solid #000;
                        margin-right: 5px;
                        text-align: center;
                        line-height: 12px;
                    }
                    .table-container {
                        border: 1px solid #000;
                        margin-top: 10px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        border: 1px solid #000;
                        padding: 5px;
                        text-align: center;
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                    .signature-section {
                        margin-top: 40px;
                        text-align: center;
                    }
                    .signature-line {
                        border-bottom: 1px dotted #000;
                        width: 250px;
                        margin: 0 auto 5px auto;
                    }
                `}</style>
            </head>
            <body>
                <div className="page">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Seal_of_the_Government_of_Thailand.svg/1200px-Seal_of_the_Government_of_Thailand.svg.png" alt="Garuda" className="garuda" />
                    <div className="header">
                        <h1>หนังสือรับรองการหักภาษี ณ ที่จ่าย</h1>
                        <p>ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร</p>
                    </div>

                    <div className="section">
                        <div className="grid">
                            <div><span className="label">ผู้มีหน้าที่หักภาษี ณ ที่จ่าย:</span> {business.businessname}</div>
                            <div><span className="label">เลขประจำตัวผู้เสียภาษีอากร:</span> {business.tax_id}</div>
                            <div className="full-width"><span className="label">ที่อยู่:</span> {business.company_address}</div>
                        </div>
                    </div>

                    <div className="section">
                        <div className="grid">
                            <div><span className="label">ผู้ถูกหักภาษี ณ ที่จ่าย:</span> {vendor.name}</div>
                            <div><span className="label">เลขประจำตัวผู้เสียภาษีอากร:</span> {vendor.taxId}</div>
                            <div className="full-width"><span className="label">ที่อยู่:</span> {vendor.address}</div>
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ประเภทเงินได้พึงประเมินที่จ่าย</th>
                                    <th>วัน เดือน หรือปีภาษี ที่จ่าย</th>
                                    <th>จำนวนเงินที่จ่าย</th>
                                    <th>ภาษีที่หักและนำส่งไว้</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <div style={{ textAlign: 'left', paddingLeft: '10px' }}>
                                            <p><span className="checkbox"></span> 1. เงินเดือน ค่าจ้าง บำนาญ ฯลฯ</p>
                                            <p><span className="checkbox"></span> 2. ค่าธรรมเนียม ค่านายหน้า ฯลฯ</p>
                                            <p><span className="checkbox"></span> 3. ค่าแห่งลิขสิทธิ์ ฯลฯ</p>
                                            <p><span className="checkbox"></span> 4. ค่าดอกเบี้ย ฯลฯ</p>
                                            <p><span className="checkbox">X</span> 5. การจ่ายเงินได้ที่ต้องหักภาษี ณ ที่จ่าย ตามคำสั่งกรมสรรพากร</p>
                                            <p style={{ marginLeft: '20px' }}>- ค่าจ้างทำของ ({withholdingRate}%)</p>
                                        </div>
                                    </td>
                                    <td>{thaiDate}</td>
                                    <td>{formatNumber(totalAmount)}</td>
                                    <td>{formatNumber(withholdingAmount)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>รวมเงินภาษีที่หักนำส่ง</td>
                                    <td></td>
                                    <td>{formatNumber(withholdingAmount)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center' }}>
                                        (<span style={{ fontWeight: 'bold' }}>{amountInWords}</span>)
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="section" style={{ textAlign: 'center' }}>
                        <span className="label">ผู้จ่ายเงิน</span> <span className="checkbox">X</span> หักภาษี ณ ที่จ่าย <span className="checkbox"></span> ออกให้ตลอดไป <span className="checkbox"></span> ออกให้ครั้งเดียว
                    </div>

                    <div className="signature-section">
                        <p>ขอรับรองว่าข้อความและตัวเลขดังกล่าวถูกต้องตรงกับความจริงทุกประการ</p>
                        <div style={{ height: '50px' }}></div>
                        <div className="signature-line"></div>
                        <p>(........................................................)</p>
                        <p>ผู้มีหน้าที่หักภาษี ณ ที่จ่าย</p>
                        <p>วันที่ {thaiDate}</p>
                    </div>
                </div>
            </body>
        </html>
    );
}

export default function WhtCertificateTemplate() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WhtCertificateContent />
        </Suspense>
    );
}

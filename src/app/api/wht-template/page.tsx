// src/app/api/wht-template/page.tsx
"use client";

import { useSearchParams } from 'next/navigation';
import { PrintableWhtCertificate } from '@/components/transactions/PrintableWhtCertificate';
import { Transaction, Business } from '@/types';
import React, { Suspense } from 'react';

function WhtTemplatePageContent() {
    const searchParams = useSearchParams();

    try {
        const business = JSON.parse(searchParams.get('business') || '{}') as Partial<Business>;
        const transaction = JSON.parse(searchParams.get('transaction') || '{}') as Transaction;
        const vendor = JSON.parse(searchParams.get('vendor') || '{}');

        // แปลง string ของวันที่กลับเป็น Date object
        transaction.date = new Date(transaction.date);

        if (!transaction.id || !business.businessname || !vendor.name) {
            return <div>Error: Missing data to generate certificate.</div>;
        }

        return (
            <html>
                <head>
                    <title>WHT Certificate</title>
                    {/* เราจะใช้ Tailwind CDN ที่นี่เพื่อให้ง่ายต่อการ styling */}
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        {`@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
                          body { font-family: 'Sarabun', sans-serif; }`}
                    </style>
                </head>
                <body>
                    <PrintableWhtCertificate 
                        business={business}
                        transaction={transaction}
                        vendor={vendor}
                    />
                </body>
            </html>
        );
    } catch (error) {
        console.error("Error parsing template data:", error);
        return <div>Error: Invalid data format.</div>;
    }
}

// หน้าเว็บนี้จะถูกเรียกโดย Puppeteer เพื่อสร้าง PDF
export default function WhtTemplatePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WhtTemplatePageContent />
        </Suspense>
    );
}
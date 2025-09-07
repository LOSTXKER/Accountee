// src/app/dashboard/[businessId]/sales/print/[docId]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Business, SalesDoc } from '@/types';
import { PrintableDocument } from '@/components/sales/PrintableDocument';
import { Button } from '@/components/ui/Button';
import { Printer, X } from 'lucide-react';

export default function PrintPage() {
    const params = useParams();
    const { businessId, docId } = params as { businessId: string; docId: string };
    const supabase = createClient();

    const [docData, setDocData] = useState<SalesDoc | null>(null);
    const [businessData, setBusinessData] = useState<Partial<Business>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!docId || !businessId) return;
            try {
                const [docResult, businessResult] = await Promise.all([
                    supabase.from('sales_documents').select('*').eq('id', docId).single(),
                    supabase.from('businesses').select('*').eq('id', businessId).single()
                ]);

                const { data: docSnap, error: docError } = docResult;
                if (docError) throw new Error(`Error fetching document: ${docError.message}`);
                setDocData(docSnap as SalesDoc);

                const { data: businessSnap, error: businessError } = businessResult;
                if (businessError) throw new Error(`Error fetching business: ${businessError.message}`);
                setBusinessData(businessSnap || {});

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [docId, businessId, supabase]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen bg-slate-100">กำลังโหลดเอกสาร...</div>;
    }

    if (!docData) {
        return <div className="flex justify-center items-center h-screen bg-slate-100 text-red-500">ไม่พบเอกสาร</div>;
    }

    return (
        <div className="bg-slate-200">
            {/* --- ส่วนของปุ่มควบคุมที่จะถูกซ่อนตอนพิมพ์ --- */}
            <div className="sticky top-0 bg-white shadow-md p-4 flex justify-center items-center gap-4 z-10 print:hidden">
                <span className="font-semibold text-gray-700">ตัวอย่างก่อนพิมพ์: {docData.doc_number}</span>
                <Button onClick={handlePrint}>
                    <Printer size={16} className="mr-2" />
                    พิมพ์เอกสาร
                </Button>
                <Button variant="secondary" onClick={() => window.close()}>
                    <X size={16} className="mr-2" />
                    ปิด
                </Button>
            </div>

            {/* --- ส่วนของเอกสารที่จะถูกพิมพ์ --- */}
            <main className="max-w-4xl mx-auto my-8">
                 {/* --- ✅ [แก้ไข] เพิ่ม id="printable-area" --- */}
                 <div id="printable-area" className="bg-white shadow-lg print:shadow-none print:m-0">
                    <PrintableDocument docData={docData} businessData={businessData} />
                </div>
            </main>
        </div>
    );
}
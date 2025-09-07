// src/app/dashboard/[businessId]/settings/document-numbering/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from 'next/navigation';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2 } from "lucide-react";
import { User } from "@supabase/supabase-js";

export default function DocumentNumberingPage() {
    const params = useParams();
    const businessId = params.businessId as string;
    const supabase = createClient();

    const [invoicePrefix, setInvoicePrefix] = useState('');
    const [quotationPrefix, setQuotationPrefix] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState(1);
    const [currentQuotationNumber, setCurrentQuotationNumber] = useState(1);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    const fetchSettings = useCallback(async () => {
        if (!businessId) return;
        setIsLoading(true);

        try {
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('invoice_prefix, quotation_prefix')
                .eq('id', businessId)
                .single();

            if (businessError && businessError.code !== 'PGRST116') throw businessError; // Ignore 'not found' error

            if (businessData) {
                setInvoicePrefix(businessData.invoice_prefix || `INV-${new Date().getFullYear()}-`);
                setQuotationPrefix(businessData.quotation_prefix || `QT-${new Date().getFullYear()}-`);
            } else {
                setInvoicePrefix(`INV-${new Date().getFullYear()}-`);
                setQuotationPrefix(`QT-${new Date().getFullYear()}-`);
            }

            const { data: counterData, error: counterError } = await supabase
                .from('document_counters')
                .select('invoice_next_number, quotation_next_number')
                .eq('business_id', businessId)
                .limit(1);

            if (counterError) throw counterError;

            if (counterData && counterData.length > 0) {
                const counter = counterData[0];
                setCurrentInvoiceNumber(counter.invoice_next_number || 1);
                setCurrentQuotationNumber(counter.quotation_next_number || 1);
            } else {
                // No counter data found, use default values
                setCurrentInvoiceNumber(1);
                setCurrentQuotationNumber(1);
            }

        } catch (error) {
            console.error("Error fetching settings:", error);
            alert("เกิดข้อผิดพลาดในการโหลดการตั้งค่า");
        } finally {
            setIsLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSave = async () => {
        if (!businessId || !user) return;
        setIsSaving(true);
        try {
            const { error: businessError } = await supabase
                .from('businesses')
                .update({
                    invoice_prefix: invoicePrefix,
                    quotation_prefix: quotationPrefix
                })
                .eq('id', businessId);

            if (businessError) throw businessError;

            const { error: counterError } = await supabase
                .from('document_counters')
                .upsert({
                    business_id: businessId,
                    user_id: user.id,
                    invoice_next_number: Number(currentInvoiceNumber),
                    quotation_next_number: Number(currentQuotationNumber)
                }, { onConflict: 'business_id' });

            if (counterError) throw counterError;

            alert("บันทึกการตั้งค่าเลขที่เอกสารเรียบร้อยแล้ว");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <p className="ml-2">กำลังโหลดการตั้งค่า...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">ตั้งค่าเลขที่เอกสาร</h2>
            <p className="text-sm text-slate-500">
                กำหนดรูปแบบและเลขที่เริ่มต้นสำหรับเอกสารของคุณ ระบบจะรันเลขที่ต่อเนื่องให้โดยอัตโนมัติ
            </p>

            <div className="space-y-4 p-4 border rounded-lg bg-white">
                <h3 className="font-semibold">ใบแจ้งหนี้ (Invoice)</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700">คำนำหน้า (Prefix)</label>
                    <Input value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} placeholder="เช่น INV-, IV-" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">เลขที่ถัดไป</label>
                    <Input type="number" value={currentInvoiceNumber} onChange={e => setCurrentInvoiceNumber(Number(e.target.value))} min="1" />
                </div>
                 <p className="text-xs text-slate-500">ตัวอย่าง: {`${invoicePrefix}${String(currentInvoiceNumber).padStart(4, '0')}`}</p>
            </div>
            
            <div className="space-y-4 p-4 border rounded-lg bg-white">
                <h3 className="font-semibold">ใบเสนอราคา (Quotation)</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700">คำนำหน้า (Prefix)</label>
                    <Input value={quotationPrefix} onChange={e => setQuotationPrefix(e.target.value)} placeholder="เช่น QT-, Q-" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">เลขที่ถัดไป</label>
                    <Input type="number" value={currentQuotationNumber} onChange={e => setCurrentQuotationNumber(Number(e.target.value))} min="1" />
                </div>
                <p className="text-xs text-slate-500">ตัวอย่าง: {`${quotationPrefix}${String(currentQuotationNumber).padStart(4, '0')}`}</p>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            กำลังบันทึก...
                        </>
                    ) : 'บันทึกการตั้งค่า'}
                </Button>
            </div>
        </div>
    );
}
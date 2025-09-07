// src/components/sales/document/DocumentProcessTimeline.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SalesDoc, Invoice, Quotation, Receipt } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';
import { CheckCircle, FileX, ChevronsRight } from 'lucide-react';
import { resolveTimeline } from '@/lib/sales/timeline-utils';

type TimelineDoc = SalesDoc | Receipt;

export default function DocumentProcessTimeline({ docData, businessId }: { docData: SalesDoc, businessId: string }) {
    const supabase = createClient();
    const [timelineDocs, setTimelineDocs] = useState<{ quotation?: Quotation, invoice?: Invoice, receipt?: Receipt }>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTimeline = async () => {
            setIsLoading(true);
            const result = await resolveTimeline(supabase, docData);
            setTimelineDocs(result);
            setIsLoading(false);
        };
        fetchTimeline();
    }, [docData.id, docData.type, (docData as any)?.status]);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-4 text-center text-slate-500">
                    กำลังโหลดไทม์ไลน์...
                </CardContent>
            </Card>
        );
    }

    const { quotation, invoice, receipt } = timelineDocs;
    const steps: { name: string, doc: TimelineDoc | undefined, type: SalesDoc['type'] | 'receipt' }[] = [
        { name: 'ใบเสนอราคา', doc: quotation, type: 'quotation' },
        { name: 'ใบแจ้งหนี้', doc: invoice, type: 'invoice' },
        { name: 'ใบเสร็จรับเงิน', doc: receipt, type: 'receipt' }
    ];

    // Determine next-doc creation affordance based on current doc and timeline
    const currentType = docData.type;
    const isCurrentVoided = docData.status === 'ยกเลิก';
    const hasLinkedInvoice =
        !!invoice ||
        !!(docData as any)?.converted_to_invoice_id ||
        !!(docData as any)?.convertedtoinvoiceid ||
        !!(docData as any)?.relatedinvoiceid ||
        !!(docData as any)?.related_invoice_id;
    const hasLinkedReceipt = !!receipt || !!(docData as any)?.related_receipt_id || !!(docData as any)?.relatedreceiptid;

    let nextCta: { label: string; href: string; enabled: boolean; reason?: string } | null = null;
    if (!isCurrentVoided) {
        if (currentType === 'quotation') {
            if (!hasLinkedInvoice) {
                const accepted = docData.status === 'ยอมรับแล้ว';
                nextCta = {
                    label: 'สร้างใบแจ้งหนี้',
                    href: `/dashboard/${businessId}/sales/new?type=invoice&fromQuotationId=${docData.id}`,
                    enabled: accepted,
                    reason: accepted ? undefined : 'ต้องยอมรับใบเสนอราคาก่อน'
                };
            }
        } else if (currentType === 'invoice') {
            if (!hasLinkedReceipt) {
                const paid = docData.status === 'ชำระแล้ว';
                nextCta = {
                    label: 'สร้างใบเสร็จรับเงิน',
                    href: `/dashboard/${businessId}/sales/new?type=receipt&fromInvoiceId=${docData.id}`,
                    enabled: paid,
                    reason: paid ? undefined : 'กรุณาบันทึกการรับชำระก่อน'
                };
            }
        }
    }

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                    {steps.map((step, index) => {
                        const isCompleted = !!step.doc;
                        const isCurrent = isCompleted && step.doc!.id === docData.id;
                        const isVoided = isCompleted && step.doc!.status === 'ยกเลิก';
                        
                        let linkHref = '#';
                        // Clickable only when the document exists and isn't voided
                        const isClickable = isCompleted; // clickable only when related document exists
                        if (isClickable) {
                            linkHref = `/dashboard/${businessId}/sales/${step.doc!.id}`;
                        }

                        // Navigation-only: no create affordance in timeline.

                        return (
                            <React.Fragment key={step.name}>
                                {isClickable ? (
                                    <Link
                                        href={linkHref}
                                        aria-current={isCurrent ? 'page' : undefined}
                                        className={twMerge(
                                            "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors flex-shrink-0",
                                            isCurrent ? "bg-brand-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                                            isVoided && "bg-slate-200 text-slate-500 opacity-80"
                                        )}
                                    >
                                        {isVoided ? <FileX size={16} /> : <CheckCircle size={16} className={isCurrent ? 'text-white' : 'text-green-500'} />}
                                        {step.name}
                                    </Link>
                                ) : (
                                    <span
                                        className={twMerge(
                                            "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors flex-shrink-0 cursor-not-allowed",
                                            "bg-slate-100 text-slate-400 border-2 border-dashed border-slate-300"
                                        )}
                                    >
                                        <div className="w-4 h-4 rounded-full bg-slate-300" />
                                        {step.name}
                                    </span>
                                )}
                                {index < steps.length - 1 && <ChevronsRight className="text-slate-300 flex-shrink-0" size={20} />}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* navigation-only; creation CTA moved to header */}
            </CardContent>
        </Card>
    );
};
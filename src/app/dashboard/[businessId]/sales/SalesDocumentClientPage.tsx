// src/app/dashboard/[businessId]/sales/SalesDocumentClientPage.tsx
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Quotation, Invoice } from '@/types';
import { useSalesDocument } from '@/hooks/useSalesDocument';
import DocumentHeader from '@/components/sales/document/DocumentHeader';
import CustomerInfoSection from '@/components/sales/document/CustomerInfoSection';
import DocumentItemsTable from '@/components/sales/document/DocumentItemsTable';
import DocumentTotals from '@/components/sales/document/DocumentTotals';
import DocumentProcessTimeline from '@/components/sales/document/DocumentProcessTimeline';
import { resolveTimeline } from '@/lib/sales/timeline-utils';
import { isForwardLockedFromTimeline } from '@/lib/sales/rules';
import { createClient } from '@/lib/supabase/client';

export default function SalesDocumentClientPage() {
    const {
        mode, isLoading, isSubmitting, businessId, docId,
        docData, customers, services,
        formState,
        totals,
        handleEdit,
        handleSave,
        handleStatusChange,
        handleAcceptQuotation,
        handleRecordPayment,
        handleVoidDocument,
        handleDelete,
        handleCancel,
        sourceDocId,
    } = useSalesDocument();
    const supabase = useMemo(() => createClient(), []);

    // Resolve timeline to enforce forward-lock (previous docs locked when forward doc exists and isn't voided)
    const [timeline, setTimeline] = useState<{ quotation?: any; invoice?: any; receipt?: any }>({});
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!docData) { setTimeline({}); return; }
            try {
                const tl = await resolveTimeline(supabase, docData);
                if (!cancelled) setTimeline(tl);
            } catch {
                if (!cancelled) setTimeline({ [docData.type]: docData } as any);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [docData, supabase]);

    if (isLoading) return <div className="text-center p-10">กำลังโหลด...</div>;
    
    if (mode === 'view' && docId && !docData) {
        return <div className="text-center p-10 text-red-500">ไม่พบเอกสาร</div>;
    }

        const forwardLocked = docData ? isForwardLockedFromTimeline(docData as any, timeline as any) : false;
        const isLocked = docData ? (
            docData.type === 'receipt'
                ? (docData.status === 'ยกเลิก')
                : (docData.status === 'ยกเลิก' || forwardLocked)
        ) : false;
    const isVoid = docData ? docData.status === 'ยกเลิก' : false;

    const handlePrint = () => {
        if (!docId) return;
        window.open(`/dashboard/${businessId}/sales/print/${docId}`, '_blank');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <DocumentHeader
                mode={mode}
                docData={docData}
                isSubmitting={isSubmitting}
                isLocked={isLocked}
                isVoid={isVoid}
                docType={formState.docType}
                sourceDocId={sourceDocId}
                businessId={businessId}
                onEdit={handleEdit}
                onSave={handleSave}
                onCancel={handleCancel}
                onPrint={handlePrint}
                onStatusChange={handleStatusChange}
                onAcceptQuotation={handleAcceptQuotation}
                onRecordPayment={handleRecordPayment}
                onVoidDocument={handleVoidDocument}
                onDelete={handleDelete}
            />
            
            {docData && <DocumentProcessTimeline docData={docData} businessId={businessId} />}
            
            <Card>
                <CardContent className="p-6 space-y-6">
                    <CustomerInfoSection
                        mode={mode}
                        docData={docData}
                        formState={formState}
                        businessId={businessId}
                        customers={customers}
                    />

                    <DocumentItemsTable
                        mode={mode}
                        items={formState.items}
                        setItems={formState.setItems}
                        services={services}
                        businessId={businessId}
                    />

                    <DocumentTotals
                        mode={mode}
                        totals={totals}
                        discountAmount={formState.discountAmount}
                        setDiscountAmount={formState.setDiscountAmount}
                        withholdingTaxAmount={formState.withholdingTaxAmount}
                        setWithholdingTaxAmount={formState.setWithholdingTaxAmount}
                        vatRate={7}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
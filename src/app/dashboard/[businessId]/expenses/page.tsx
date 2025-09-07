// src/app/dashboard/[businessId]/expenses/page.tsx
"use client";

import TransactionClientPage from '@/components/transactions/TransactionClientPage';
import { notFound } from 'next/navigation';

export default function ExpensesPage({ params }: { params: { businessId: string } }) {
    const { businessId } = params;
    if (!businessId) {
        notFound();
    }
    
    // ส่ง props `pageType` เพื่อบอกให้ Component รู้ว่านี่คือหน้ารายจ่าย
    return <TransactionClientPage businessId={businessId} pageType="expense" />;
}
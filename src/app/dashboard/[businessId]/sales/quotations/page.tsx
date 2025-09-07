// src/app/dashboard/[businessId]/sales/quotations/page.tsx
"use client";

import SalesDocumentListPage from '@/components/sales/SalesDocumentListPage';

export default function QuotationsPage() {
    return <SalesDocumentListPage pageType="quotation" />;
}
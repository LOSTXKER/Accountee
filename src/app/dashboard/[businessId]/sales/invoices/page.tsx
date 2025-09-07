// src/app/dashboard/[businessId]/sales/invoices/page.tsx
"use client";

import SalesDocumentListPage from '@/components/sales/SalesDocumentListPage';

export default function InvoicesPage() {
    return <SalesDocumentListPage pageType="invoice" />;
}
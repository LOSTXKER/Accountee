// src/app/dashboard/[businessId]/sales/all/page.tsx
"use client";

import SalesDocumentListPage from '@/components/sales/SalesDocumentListPage';

export default function AllSalesDocumentsPage() {
    return <SalesDocumentListPage pageType="all" />;
}
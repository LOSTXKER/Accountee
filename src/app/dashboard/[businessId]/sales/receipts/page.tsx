// src/app/dashboard/[businessId]/sales/receipts/page.tsx
"use client";

import SalesDocumentListPage from '@/components/sales/SalesDocumentListPage';

export default function ReceiptsPage() {
    // ใช้ Component เดิม แต่ส่ง pageType ใหม่เข้าไป
    return <SalesDocumentListPage pageType="receipt" />;
}
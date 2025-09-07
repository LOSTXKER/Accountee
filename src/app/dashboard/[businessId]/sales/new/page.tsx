// src/app/dashboard/[businessId]/sales/new/page.tsx
"use client";

// --- ✅ [แก้ไข] เปลี่ยน Path การ import ให้ถูกต้อง ---
import SalesDocumentClientPage from '@/app/dashboard/[businessId]/sales/SalesDocumentClientPage';

export default function NewSalesDocumentPage() {
    return <SalesDocumentClientPage />;
}
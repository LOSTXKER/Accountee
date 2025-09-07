// src/app/dashboard/[businessId]/settings/page.tsx
import { redirect } from 'next/navigation';

// This page will redirect to the default settings tab, which is now 'profile'.
export default function SettingsPage({ params }: { params: { businessId: string } }) {
  // ✅ [แก้ไข] เปลี่ยน 'categories' เป็น 'profile'
  redirect(`/dashboard/${params.businessId}/settings/profile`);
}
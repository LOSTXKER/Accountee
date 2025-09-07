// src/app/dashboard/[businessId]/sales/page.tsx
import { redirect } from 'next/navigation';

export default function SalesRedirectPage({ params }: { params: { businessId: string } }) {
  // Redirect to the default "all" documents page
  redirect(`/dashboard/${params.businessId}/sales/all`);
}
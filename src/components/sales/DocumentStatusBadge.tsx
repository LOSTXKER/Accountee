// src/components/sales/DocumentStatusBadge.tsx
import { DocumentStatus } from '@/types';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
}

export default function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  // --- [ปรับปรุง] เพิ่มกรอบสีให้ชัดเจนยิ่งขึ้น ---
  const statusStyles: { [key in DocumentStatus]: string } = {
    'ฉบับร่าง': 'bg-slate-100 text-slate-700 border border-slate-300',
    'รอตอบรับ': 'bg-blue-100 text-blue-800 border border-blue-300', 
    'รอชำระ': 'bg-amber-100 text-amber-800 border border-amber-300',
  'ค้างชำระ': 'bg-orange-100 text-orange-800 border border-orange-300',
    'ชำระแล้ว': 'bg-green-100 text-green-800 border border-green-300',
    'เกินกำหนด': 'bg-red-100 text-red-800 border border-red-300',
    'ยกเลิก': 'bg-slate-500 text-white line-through border border-slate-600',
    'ยอมรับแล้ว': 'bg-teal-100 text-teal-800 border border-teal-300',
    'ปฏิเสธแล้ว': 'bg-orange-100 text-orange-800 border border-orange-300',
    'สมบูรณ์': 'bg-green-100 text-green-800 border border-green-300',
  };

  const style = statusStyles[status] || 'bg-gray-100 text-gray-800 border border-gray-300';

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-block ${style}`}>
      {status}
    </span>
  );
}
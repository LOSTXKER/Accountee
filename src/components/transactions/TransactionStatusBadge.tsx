// src/components/transactions/TransactionStatusBadge.tsx
import { TransactionStatus, TransactionType } from '@/types';
import ProcessBar from '@/components/ui/ProcessBar';

interface TransactionStatusBadgeProps {
  status: TransactionStatus;
  type?: TransactionType;
  variant?: 'badge' | 'process-bar';
  showProcessBar?: boolean;
}

export default function TransactionStatusBadge({ 
  status, 
  type, 
  variant = 'badge',
  showProcessBar = false 
}: TransactionStatusBadgeProps) {

  // ถ้าเลือก process-bar หรือ showProcessBar = true และมี type
  if ((variant === 'process-bar' || showProcessBar) && type && (type === 'income' || type === 'expense')) {
    return <ProcessBar currentStatus={status} type={type} />;
  }

  // แสดง Badge แบบเดิม
  const statusStyles: { [key in TransactionStatus]: string } = {
    // Expense
    'รอเอกสาร': 'bg-slate-100 text-slate-700 border border-slate-300 shadow-sm hover:shadow-slate-200',
    'รอชำระ': 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm hover:shadow-amber-200',
    'รอส่ง หัก ณ ที่จ่าย': 'bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-sm hover:shadow-indigo-200',
    // Income
    'รอรับเงิน': 'bg-blue-100 text-blue-800 border border-blue-300 shadow-sm hover:shadow-blue-200',
    'เกินกำหนด': 'bg-red-100 text-red-800 border border-red-300 shadow-sm hover:shadow-red-200 animate-pulse',
    'รอรับ หัก ณ ที่จ่าย': 'bg-purple-100 text-purple-800 border border-purple-300 shadow-sm hover:shadow-purple-200',
    // Common
    'เสร็จสมบูรณ์': 'bg-green-100 text-green-800 border border-green-300 shadow-sm hover:shadow-green-200',
    'ยกเลิก': 'bg-slate-500 text-white line-through border border-slate-600 opacity-70',
  };

  const style = statusStyles[status] || 'bg-gray-100 text-gray-800 border border-gray-300';

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-block transition-all duration-200 ${style}`}>
      {status}
    </span>
  );
}
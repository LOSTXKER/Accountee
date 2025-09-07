// src/components/dashboard/RecentTransactions.tsx
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Transaction } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation'; // Import useParams

function TransactionItem({ transaction }: { transaction: Transaction }) {
    const isIncome = transaction.type === 'income';
    const amountColor = isIncome ? 'text-green-600' : 'text-red-600';
    const sign = isIncome ? '+' : '-';
    
    return (
        <div className="flex items-center justify-between py-3">
            <div>
                <p className="font-semibold text-gray-800">{transaction.description}</p>
                <p className="text-sm text-gray-500">
                    {new Date(transaction.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
            </div>
            <p className={`text-sm font-semibold ${amountColor}`}>
                {sign} {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(transaction.amount)}
            </p>
        </div>
    );
}

// --- ✅ [แก้ไข] เพิ่ม businessId เข้ามาใน props ---
export default function RecentTransactions({ transactions, businessId }: { transactions: Transaction[]; businessId: string; }) {
    return (
        <Card>
            <CardHeader>
                <h3 className="text-lg font-semibold">รายการล่าสุด</h3>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100 px-6">
                    {transactions.length > 0 ? (
                        transactions.map(tx => <TransactionItem key={tx.id} transaction={tx} />)
                    ) : (
                        <p className="py-8 text-center text-gray-500">ยังไม่มีรายการ</p>
                    )}
                </div>
                <div className="p-4 text-center border-t border-slate-100 mt-2">
                    {/* --- ✅ [แก้ไข] อัปเดต href ให้ไปยังหน้า transactions --- */}
                    <Link href={`/dashboard/${businessId}/transactions`} className="text-sm font-semibold text-brand-600 hover:underline">
                        ดูรายการทั้งหมด
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

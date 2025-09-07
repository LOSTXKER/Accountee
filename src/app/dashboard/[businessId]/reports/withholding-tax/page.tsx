// src/app/dashboard/[businessId]/reports/withholding-tax/page.tsx
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useWhtReport } from "@/hooks/useReports";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function WithholdingTaxReportPage() {
    const params = useParams();
    const businessId = params.businessId as string;
    
    // ใช้ custom hook แทนการ fetch แบบเดิม
    const { 
        reportData, 
        loading, 
        isError, 
        refetch, 
        error 
    } = useWhtReport(businessId);

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-800">รายงานภาษีหัก ณ ที่จ่าย</h1>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            <span>กำลังโหลดข้อมูล...</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-800">รายงานภาษีหัก ณ ที่จ่าย</h1>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-red-500">
                            <p>เกิดข้อผิดพลาดในการโหลดรายงาน</p>
                            <p className="text-sm mt-2">{error?.message}</p>
                            <Button onClick={() => refetch()} className="mt-4">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                ลองใหม่
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">รายงานภาษีหัก ณ ที่จ่าย</h1>
                <Button 
                    onClick={() => refetch()} 
                    variant="outline"
                    size="sm"
                >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    รีเฟรช
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">สรุปรายการภาษีหัก ณ ที่จ่าย</h2>
                            <p className="text-gray-500 mt-1">
                                จำนวนรายการทั้งหมด: {reportData?.transactionCount || 0} รายการ
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">ยอดรวมภาษีหัก ณ ที่จ่าย</p>
                            <p className="text-2xl font-bold text-blue-600">
                                ฿{(reportData?.totalWhtAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-sm text-gray-500">
                                อัตราเฉลี่ย: {(reportData?.averageWhtRate || 0).toFixed(2)}%
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {reportData?.transactions && reportData.transactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 text-left font-semibold">วันที่</th>
                                        <th className="p-3 text-left font-semibold">รายละเอียด</th>
                                        <th className="p-3 text-left font-semibold">ผู้จ่าย</th>
                                        <th className="p-3 text-right font-semibold">ยอดเงินก่อนหัก</th>
                                        <th className="p-3 text-right font-semibold">อัตราภาษี (%)</th>
                                        <th className="p-3 text-right font-semibold">ภาษีที่หัก</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.transactions.map((transaction, index) => (
                                        <tr key={transaction.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="p-3">
                                                {new Date(transaction.date).toLocaleDateString('th-TH')}
                                            </td>
                                            <td className="p-3">
                                                {transaction.description}
                                            </td>
                                            <td className="p-3">
                                                {transaction.vendor_name || '-'}
                                            </td>
                                            <td className="p-3 text-right">
                                                ฿{transaction.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-3 text-right">
                                                {transaction.withholdingtax_rate}%
                                            </td>
                                            <td className="p-3 text-right font-semibold text-blue-600">
                                                ฿{transaction.withholdingtax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>ไม่พบรายการภาษีหัก ณ ที่จ่าย</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
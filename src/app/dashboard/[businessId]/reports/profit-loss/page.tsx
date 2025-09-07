// src/app/dashboard/[businessId]/reports/profit-loss/page.tsx
"use client";

import { useState } from "react";
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useProfitLossReport } from "@/hooks/useReports";
import { Loader2 } from "lucide-react";

export default function ProfitLossReportPage() {
    const params = useParams();
    const businessId = params.businessId as string;
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportParams, setReportParams] = useState<{startDate: string, endDate: string} | null>(null);
    
    // ใช้ custom hook แทนการ query โดยตรง
    const { 
        reportData, 
        loading, 
        isError, 
        refetch, 
        error 
    } = useProfitLossReport(
        businessId,
        reportParams?.startDate || '',
        reportParams?.endDate || ''
    );

    const generateReport = () => {
        if (!startDate || !endDate || !businessId) {
            alert("กรุณาเลือกช่วงวันที่ให้ครบถ้วน");
            return;
        }

        setReportParams({ startDate, endDate });
    };

    if (isError) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-800">รายงานกำไร-ขาดทุน</h1>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-red-500">
                            <p>เกิดข้อผิดพลาดในการโหลดรายงาน</p>
                            <p className="text-sm mt-2">{error?.message}</p>
                            <Button onClick={() => refetch()} className="mt-4">
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
            <h1 className="text-3xl font-bold text-gray-800">รายงานกำไร-ขาดทุน</h1>
            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่มต้น</label>
                            <Input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
                            <Input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                            />
                        </div>
                        <Button onClick={generateReport} disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    กำลังประมวลผล...
                                </>
                            ) : (
                                'สร้างรายงาน'
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {reportData && (
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-bold">สรุปผลประกอบการ</h2>
                        <p className="text-gray-500">
                            สำหรับช่วงวันที่ {new Date(reportParams!.startDate).toLocaleDateString('th-TH')} - {new Date(reportParams!.endDate).toLocaleDateString('th-TH')}
                        </p>
                        <p className="text-sm text-gray-400">
                            จำนวนรายการ: {reportData.transactionCount} รายการ
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-medium">รายรับทั้งหมด</span>
                            <span className="font-bold text-green-600">
                                ฿{reportData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-medium">หัก: ต้นทุนขาย (COGS)</span>
                            <span className="font-bold text-orange-600">
                                (฿{reportData.totalCogs.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b-2 border-black">
                            <span className="font-bold">กำไรขั้นต้น</span>
                            <span className="font-bold">
                                ฿{reportData.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-medium">หัก: ค่าใช้จ่าย</span>
                            <span className="font-bold text-red-600">
                                (฿{reportData.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                            </span>
                        </div>
                        <div className={`flex justify-between items-center py-3 px-4 rounded-lg ${reportData.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                            <span className="text-xl font-bold">กำไร/ขาดทุนสุทธิ</span>
                            <span className={`text-xl font-bold ${reportData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                ฿{reportData.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
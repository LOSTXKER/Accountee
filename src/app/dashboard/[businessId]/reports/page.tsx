// src/app/dashboard/[businessId]/reports/page.tsx
"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { ArrowRight, BarChart, PieChart, Tag, DownloadCloud } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const reports = [
    {
        name: "รายงานกำไร-ขาดทุน",
        description: "สรุปภาพรวมรายรับ, ค่าใช้จ่าย, และกำไรสุทธิของธุรกิจ",
        href: "/profit-loss",
        icon: BarChart
    },
    {
        name: "รายงานต้นทุนตามโปรเจกต์",
        description: "วิเคราะห์กำไรและขาดทุนสำหรับแต่ละโปรเจกต์หรืองาน",
        href: "/project-costing",
        icon: Tag
    },
    {
        name: "รายงานภาษีหัก ณ ที่จ่าย",
        description: "สรุปยอดภาษีหัก ณ ที่จ่าย (ภ.ง.ด.) ที่ต้องนำส่งรายเดือน",
        href: "/withholding-tax",
        icon: PieChart
    },
    {
        name: "ส่งออกเอกสารสำหรับบัญชี",
        description: "ดาวน์โหลดสลิป, ใบกำกับภาษี, และเอกสารทั้งหมดตามช่วงวันที่เพื่อส่งให้ฝ่ายบัญชี",
        href: "/export",
        icon: DownloadCloud
    },
]

export default function ReportsPage() {
    const params = useParams();
    const businessId = params.businessId as string;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">ศูนย์รวมรายงาน</h1>
                <p className="text-slate-500 mt-1">เลือกรายงานที่คุณต้องการดูเพื่อวิเคราะห์ข้อมูลธุรกิจ</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                    <Link key={report.name} href={`/dashboard/${businessId}/reports${report.href}`} className="group block">
                        <Card className="h-full hover:border-brand-500 hover:shadow-md transition-all">
                            <CardContent className="p-6 flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <report.icon className="h-6 w-6 text-brand-600" />
                                        </div>
                                        <h2 className="text-lg font-bold text-gray-800">{report.name}</h2>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-3">{report.description}</p>
                                </div>
                                <div className="flex justify-end items-center mt-4">
                                    <span className="text-sm font-semibold text-brand-600 group-hover:underline">ดูรายงาน</span>
                                    <ArrowRight className="h-4 w-4 ml-1 text-brand-600 transition-transform group-hover:translate-x-1" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
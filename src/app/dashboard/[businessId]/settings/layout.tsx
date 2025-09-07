// src/app/dashboard/[businessId]/settings/layout.tsx
"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/Card";

const settingsNav = [
    { name: 'ข้อมูลบริษัท', href: '/profile' },
    { name: 'เลขที่เอกสาร', href: '/document-numbering' },
    { name: 'ข้อมูลลูกค้า', href: '/customers' },
    { name: 'สินค้า/บริการ', href: '/services' },
    { name: 'หมวดหมู่', href: '/categories' },
    { name: 'รายการที่เกิดซ้ำ', href: '/recurring' },
    { name: 'AI: การเรียนรู้', href: '/ai-learning' },
    { name: 'AI: ฝึกฝน', href: '/ai-training' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const businessId = pathname.split('/')[2] || '';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">ตั้งค่า</h1>
                <p className="text-slate-500 mt-1">จัดการข้อมูลหลักสำหรับธุรกิจของคุณ</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <aside className="lg:col-span-1">
                    <Card>
                        <nav className="p-2 space-y-1">
                            {settingsNav.map((item) => {
                                const fullPath = `/dashboard/${businessId}/settings${item.href}`;
                                const isActive = pathname === fullPath;
                                return (
                                    <Link key={item.name} href={fullPath} className={`block px-3 py-2 text-sm font-medium rounded-md ${ isActive ? 'bg-slate-100 text-brand-700' : 'text-slate-600 hover:bg-slate-50' }`}>
                                        {item.name}
                                    </Link>
                                )
                            })}
                        </nav>
                    </Card>
                </aside>
                <div className="lg:col-span-3">
                    <Card>
                        <div className="p-6">{children}</div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
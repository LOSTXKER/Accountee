// src/app/dashboard/layout.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams, usePathname } from 'next/navigation';

import AuthProvider from '@/components/auth/AuthProvider';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import {
    LayoutDashboard,
    Settings,
    BarChart3,
    ShoppingBag,
    TrendingUp,
    TrendingDown,
    FileOutput,
    FileText,
    FileCheck,
    Receipt
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'ภาพรวม' },
    { href: '/income', icon: TrendingUp, label: 'สมุดรายรับ' },
    { href: '/expenses', icon: TrendingDown, label: 'สมุดรายจ่าย' },
    { 
      href: '/sales', 
      icon: ShoppingBag, 
      label: 'รายการเอกสารขาย',
      subItems: [
        { href: '/sales/all', icon: FileOutput, label: 'เอกสารทั้งหมด' },
        { href: '/sales/quotations', icon: FileText, label: 'ใบเสนอราคา' },
        { href: '/sales/invoices', icon: FileCheck, label: 'ใบแจ้งหนี้' },
        { href: '/sales/receipts', icon: Receipt, label: 'ใบเสร็จรับเงิน' },
      ]
    },
    { href: '/reports', icon: BarChart3, label: 'รายงาน' },
    { href: '/settings', icon: Settings, label: 'ตั้งค่า' },
];

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const supabase = createClient();
    const pathname = usePathname();
    
    const businessId = params.businessId as string;
    const isBusinessSelectorPage = pathname === '/dashboard';

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [businessName, setBusinessName] = useState('');

    useEffect(() => {
        const fetchBusinessName = async () => {
            if (user && businessId) {
                const { data, error } = await supabase
                    .from('businesses')
                    .select('businessname')
                    .eq('id', businessId)
                    .single();
                
                if (error) {
                    console.error('Error fetching business name:', error);
                } else if (data) {
                    setBusinessName(data.businessname);
                }
            }
        };

        if (!isBusinessSelectorPage) {
            fetchBusinessName();
        } else {
            setBusinessName('เลือกธุรกิจ');
        }
    }, [user, businessId, isBusinessSelectorPage]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">กำลังโหลดข้อมูล...</div>;
    }

    return (
        <div className="flex h-screen bg-slate-50">
            {!isBusinessSelectorPage && (
                <Sidebar navItems={navItems} open={sidebarOpen} setOpen={setSidebarOpen} />
            )}
            
            <div className={`flex-1 flex flex-col overflow-hidden ${!isBusinessSelectorPage ? 'md:ml-64' : ''}`}>
                <Header
                    user={user}
                    onMenuClick={() => setSidebarOpen(true)}
                    onLogout={handleLogout}
                    businessName={businessName}
                    businessId={businessId}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    return (
        <AuthProvider>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </AuthProvider>
    );
}
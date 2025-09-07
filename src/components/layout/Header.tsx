// src/components/layout/Header.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Menu, LogOut, Landmark, Settings } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HeaderProps {
    user: SupabaseUser | null;
    onMenuClick: () => void;
    onLogout: () => void;
    businessName?: string;
    businessId?: string;
}

export default function Header({ user, onMenuClick, onLogout, businessName, businessId }: HeaderProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const isBusinessSelectorPage = pathname === '/dashboard';

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);


    return (
        <header className="bg-white/80 sticky top-0 border-b p-4 flex justify-between items-center h-20 z-20">
            <div className="flex items-center">
                 {!isBusinessSelectorPage && (
                    <button onClick={onMenuClick} className="md:hidden text-gray-500 focus:outline-none mr-4">
                        <Menu className="h-6 w-6" />
                    </button>
                 )}
                <div className="text-lg font-semibold text-gray-800">
                    {businessName || 'กำลังโหลด...'}
                </div>
            </div>
            <div className="relative" ref={dropdownRef}>
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 hover:bg-slate-100 p-2 rounded-lg">
                    <img
                        className="h-9 w-9 rounded-full object-cover"
                        src={`https://placehold.co/100x100/4f46e5/FFFFFF?text=${user?.email?.[0].toUpperCase() || 'A'}`}
                        alt="User Avatar"
                    />
                     <span className="font-medium hidden sm:block text-gray-600 text-sm">
                        {user?.email}
                    </span>
                </button>
                {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border">
                        <div className="px-4 py-2 text-xs text-gray-400">
                            Signed in as
                            <strong className="block text-sm text-gray-700">{user?.email}</strong>
                        </div>
                        <div className="border-t border-gray-100 my-1"></div>
                        {!isBusinessSelectorPage && (
                            <>
                                <Link
                                    href={`/dashboard/${businessId}/settings`}
                                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"
                                >
                                    <Settings size={16} />
                                    ตั้งค่าธุรกิจ
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"
                                >
                                    <Landmark size={16} />
                                    เลือกธุรกิจอื่น
                                </Link>
                            </>
                        )}
                        <button
                            onClick={onLogout}
                            className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"
                        >
                            <LogOut size={16} />
                            ออกจากระบบ
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
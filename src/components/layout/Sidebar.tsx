// src/components/layout/Sidebar.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, BookOpen, ChevronDown } from 'lucide-react';

interface NavSubItem {
    href: string;
    icon: React.ElementType; 
    label: string;
}

interface NavItem {
    href: string;
    icon: React.ElementType; 
    label: string;
    subItems?: NavSubItem[];
}

interface SidebarProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    navItems: NavItem[];
}

function NavItemLink({ item, businessId, pathname }: { item: NavItem | NavSubItem, businessId: string, pathname: string }) {
    const href = item.href === '/dashboard' ? `/dashboard/${businessId}` : `/dashboard/${businessId}${item.href}`;
    const isActive = pathname === href || (item.href !== '/dashboard' && pathname.startsWith(href));
    const Icon = item.icon;

    return (
        <Link href={href}
            className={`flex items-center px-4 py-2.5 rounded-lg transition-colors ${
                isActive 
                ? 'bg-brand-50 text-brand-700 font-semibold' 
                : 'text-gray-600 hover:bg-slate-100 hover:text-gray-900'
            }`}
        >
            <Icon className={`h-5 w-5 ${isActive ? 'text-brand-600' : ''}`} />
            <span className="ml-4">{item.label}</span>
        </Link>
    );
}


export default function Sidebar({ open, setOpen, navItems }: SidebarProps) {
    const pathname = usePathname();
    const businessId = pathname.split('/')[2] || '';
    const [openSubMenu, setOpenSubMenu] = useState(pathname.startsWith(`/dashboard/${businessId}/sales`));

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setOpen(false)}
            ></div>

            <div className={`fixed z-40 inset-y-0 left-0 w-64 bg-white text-gray-800 flex flex-col transform ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out border-r border-slate-200`}>
                <div className="flex items-center justify-between h-20 px-6 border-b">
                    <div className="flex items-center gap-3">
                        <BookOpen className="h-7 w-7 text-brand-600" />
                        <span className="text-2xl font-bold text-gray-800">Accountee</span>
                    </div>
                    <button onClick={() => setOpen(false)} className="md:hidden text-gray-500">
                        <X size={24} />
                    </button>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1">
                    {navItems.map((item) => {
                        if (item.subItems) {
                            const isParentActive = pathname.startsWith(`/dashboard/${businessId}${item.href}`);
                            return (
                                <div key={item.label}>
                                    <button
                                        onClick={() => setOpenSubMenu(!openSubMenu)}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors ${
                                            isParentActive ? 'text-brand-700 font-semibold' : 'text-gray-600 hover:bg-slate-100 hover:text-gray-900'
                                        }`}
                                    >
                                        <div className="flex items-center">
                                            <item.icon className={`h-5 w-5 ${isParentActive ? 'text-brand-600' : ''}`} />
                                            <span className="ml-4">{item.label}</span>
                                        </div>
                                        <ChevronDown size={16} className={`transition-transform ${openSubMenu ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openSubMenu && (
                                        <div className="pl-6 pt-2 space-y-1">
                                            {item.subItems.map(subItem => (
                                                <NavItemLink key={subItem.label} item={subItem} businessId={businessId} pathname={pathname} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return <NavItemLink key={item.label} item={item} businessId={businessId} pathname={pathname} />;
                    })}
                </nav>
            </div>
        </>
    );
}
// src/components/sales/SalesDocumentListPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSalesDocuments } from '@/hooks/useSalesDocuments';
import { DocumentStatus, SalesDoc } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PlusCircle, FileText, FileClock, AlertTriangle, ChevronDown, Receipt as ReceiptIcon } from 'lucide-react';
import KpiCard from '@/components/dashboard/KpiCard';
import SalesActionMenu from '@/components/sales/SalesActionMenu';
import DocumentStatusBadge from '@/components/sales/DocumentStatusBadge';

interface SalesDocumentListPageProps {
    pageType: 'all' | 'quotation' | 'invoice' | 'receipt';
}

const CreateDocumentButton = ({ businessId, pageType }: { businessId: string, pageType: 'all' | 'quotation' | 'invoice' | 'receipt' }) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    const handleCreate = (type: 'quotation' | 'invoice') => {
        router.push(`/dashboard/${businessId}/sales/new?type=${type}`);
        setIsOpen(false);
    };
    
    // [ปรับปรุง] ซ่อนปุ่มสร้างในหน้าใบเสร็จ
    if (pageType === 'receipt') {
        return null;
    }

    if (pageType === 'quotation') {
        return (
            <Button onClick={() => handleCreate('quotation')}>
                <PlusCircle size={16} className="mr-2"/> สร้างใบเสนอราคา
            </Button>
        );
    }

    if (pageType === 'invoice') {
        return (
            <Button onClick={() => handleCreate('invoice')}>
                <PlusCircle size={16} className="mr-2"/> สร้างใบแจ้งหนี้
            </Button>
        );
    }
    
    return (
        <div className="relative" ref={menuRef}>
            <Button onClick={() => setIsOpen(!isOpen)}>
                <PlusCircle size={16} className="mr-2"/> สร้างเอกสารใหม่ <ChevronDown size={16} className="ml-2" />
            </Button>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                    <div className="py-1">
                        <button onClick={() => handleCreate('quotation')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                            <FileText size={14} /> ใบเสนอราคา / ใบแจ้งหนี้ชั่วคราว
                        </button>
                        <button onClick={() => handleCreate('invoice')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                            <FileClock size={14} /> ใบแจ้งหนี้ / ใบกำกับภาษี
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


export default function SalesDocumentListPage({ pageType }: SalesDocumentListPageProps) {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const businessId = params.businessId as string;
    
    const { documents, loading: isLoading } = useSalesDocuments(businessId);
    
    const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>(() => (searchParams.get('status') as DocumentStatus) || 'all');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortOption, setSortOption] = useState<
        'date_desc' | 'date_asc' |
        'amount_desc' | 'amount_asc' |
        'doc_desc' | 'doc_asc' |
        'customer_asc' | 'customer_desc'
    >('date_desc');

    // Load saved sort per page type
    useEffect(() => {
        const key = `sales_sort_${pageType}`;
        try {
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem(key) as typeof sortOption | null;
                if (saved) setSortOption(saved);
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageType]);

    // Persist sort selection
    useEffect(() => {
        const key = `sales_sort_${pageType}`;
        try {
            if (typeof window !== 'undefined') localStorage.setItem(key, sortOption);
        } catch {}
    }, [sortOption, pageType]);

    const filteredDocuments = useMemo(() => {
        const list = documents
            .filter(doc => {
                const typeMatch = pageType === 'all' || doc.type === pageType;
                
                const statusToCheck = doc.status as string;
                const filterValue = statusFilter as string;
                const statusMatch = filterValue === 'all' || statusToCheck === filterValue;

                const searchMatch = searchTerm === '' ||
                    ((doc as any).customername || (doc as any).customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    ((doc as any).docnumber || (doc as any).doc_number || '').toLowerCase().includes(searchTerm.toLowerCase());
                
                const issueDateValue = (doc as any).issuedate || (doc as any).issue_date;
                const issueDate = issueDateValue ? new Date(issueDateValue) : new Date();
                const startMatch = !startDate || issueDate >= new Date(startDate);
                const endMatch = !endDate || issueDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999));

                return typeMatch && statusMatch && searchMatch && startMatch && endMatch;
            });

        return list.sort((a, b) => {
            // ใช้ createdat สำหรับการเรียงลำดับเพื่อรวมเวลาที่แน่นอน
            const aCreated = new Date((a as any).createdat || (a as any).created_at || new Date());
            const bCreated = new Date((b as any).createdat || (b as any).created_at || new Date());
            // ใช้ issuedate สำหรับ filter และ display
            const aDate = new Date((a as any).issuedate || (a as any).issue_date || new Date());
            const bDate = new Date((b as any).issuedate || (b as any).issue_date || new Date());
            const aTotal = Number((a as any).grandtotal ?? (a as any).grand_total ?? 0);
            const bTotal = Number((b as any).grandtotal ?? (b as any).grand_total ?? 0);
            const aDoc = String((a as any).docnumber ?? (a as any).doc_number ?? '').toLowerCase();
            const bDoc = String((b as any).docnumber ?? (b as any).doc_number ?? '').toLowerCase();
            const aCust = String((a as any).customername ?? (a as any).customer_name ?? '').toLowerCase();
            const bCust = String((b as any).customername ?? (b as any).customer_name ?? '').toLowerCase();

            switch (sortOption) {
                case 'date_asc':
                    // เรียงตาม createdat (เวลาที่สร้างจริง) แทน issuedate
                    return aCreated.getTime() - bCreated.getTime();
                case 'amount_desc':
                    return bTotal - aTotal;
                case 'amount_asc':
                    return aTotal - bTotal;
                case 'doc_desc':
                    return bDoc.localeCompare(aDoc, 'th');
                case 'doc_asc':
                    return aDoc.localeCompare(bDoc, 'th');
                case 'customer_desc':
                    return bCust.localeCompare(aCust, 'th');
                case 'customer_asc':
                    return aCust.localeCompare(bCust, 'th');
                case 'date_desc':
                default:
                    // เรียงตาม createdat (เวลาที่สร้างจริง) แทน issuedate
                    return bCreated.getTime() - aCreated.getTime();
            }
        });
    }, [documents, statusFilter, pageType, searchTerm, startDate, endDate, sortOption]);

    const kpiData = useMemo(() => {
        const activeDocs = documents.filter(d => d.status !== 'ยกเลิก' && d.status !== 'ฉบับร่าง');
        const accountsReceivable = activeDocs
            .filter(d => d.type === 'invoice' && (d.status === 'รอชำระ' || d.status === 'เกินกำหนด'))
            .reduce((sum, doc) => {
                const grandTotal = (doc as any).grandtotal || (doc as any).grand_total || 0;
                return sum + grandTotal;
            }, 0);

        const pendingQuotations = activeDocs
            .filter(d => d.type === 'quotation' && d.status === 'รอตอบรับ')
            .reduce((sum, doc) => {
                const grandTotal = (doc as any).grandtotal || (doc as any).grand_total || 0;
                return sum + grandTotal;
            }, 0);
        
        const overdueCount = activeDocs.filter(d => d.status === 'เกินกำหนด').length;

        return { accountsReceivable, pendingQuotations, overdueCount };
    }, [documents]);
    
    const pageConfig = useMemo(() => {
        switch(pageType) {
            case 'quotation': return { 
                title: 'ใบเสนอราคา', 
                filters: {
                    '': ['รอตอบรับ', 'ยอมรับแล้ว', 'ปฏิเสธแล้ว', 'ฉบับร่าง', 'ยกเลิก'] as DocumentStatus[]
                }
            };
            case 'invoice': return { 
                title: 'ใบแจ้งหนี้', 
                filters: {
                    '': ['รอชำระ', 'เกินกำหนด', 'ชำระแล้ว', 'ยกเลิก'] as DocumentStatus[]
                }
            };
            // [ใหม่] เพิ่ม Config สำหรับหน้าใบเสร็จ
            case 'receipt': return {
                title: 'ใบเสร็จรับเงิน',
                filters: {
                    '': ['สมบูรณ์', 'ยกเลิก'] as DocumentStatus[]
                }
            };
            default: return { 
                title: 'เอกสารขายทั้งหมด', 
                filters: {
                    'ใบเสนอราคา': ['รอตอบรับ', 'ยอมรับแล้ว'],
                    'ใบแจ้งหนี้': ['รอชำระ', 'เกินกำหนด', 'ชำระแล้ว'],
                    'อื่นๆ': ['ฉบับร่าง', 'ยกเลิก', 'สมบูรณ์']
                } as Record<string, DocumentStatus[]>
            };
        }
    }, [pageType]);


    const getDocTypeDisplay = (type: SalesDoc['type']) => {
        switch(type) {
            case 'quotation': return { text: "ใบเสนอราคา", icon: <FileText size={16} className="text-blue-500" /> };
            case 'invoice': return { text: "ใบแจ้งหนี้", icon: <FileText size={16} className="text-green-500" /> };
            case 'receipt': return { text: "ใบเสร็จ", icon: <ReceiptIcon size={16} className="text-purple-500" /> };
            default: return { text: "เอกสาร", icon: <FileText size={16} className="text-slate-500" /> };
        }
    }
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">{pageConfig.title}</h1>
                <CreateDocumentButton businessId={businessId} pageType={pageType} />
            </div>

            {pageType === 'all' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KpiCard title="ยอดรอเก็บเงิน" value={kpiData.accountsReceivable} icon={FileClock} color="brand" />
                    <KpiCard title="ใบเสนอราคารออนุมัติ" value={kpiData.pendingQuotations} icon={FileText} color="slate" />
                    <KpiCard title="เอกสารเกินกำหนด" value={kpiData.overdueCount} icon={AlertTriangle} color="red" isCurrency={false} />
                </div>
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <Input 
                            placeholder="ค้นหาชื่อลูกค้า หรือเลขที่เอกสาร..." 
                            className="max-w-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                             <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40"/>
                             <span className="text-slate-500">ถึง</span>
                             <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40"/>
                             <div className="flex items-center gap-2 ml-2">
                                 <label className="text-sm text-slate-600">เรียงลำดับ</label>
                                 <select
                                     value={sortOption}
                                     onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                                     className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                 >
                                     <option value="date_desc">ล่าสุดก่อน (วันที่ใหม่ → เก่า)</option>
                                     <option value="date_asc">เก่าก่อน (วันที่เก่า → ใหม่)</option>
                                     <option value="amount_desc">ยอดมาก → น้อย</option>
                                     <option value="amount_asc">ยอดน้อย → มาก</option>
                                     <option value="doc_asc">เลขที่เอกสาร (ก → ฮ)</option>
                                     <option value="doc_desc">เลขที่เอกสาร (ฮ → ก)</option>
                                     <option value="customer_asc">ชื่อลูกค้า (ก → ฮ)</option>
                                     <option value="customer_desc">ชื่อลูกค้า (ฮ → ก)</option>
                                 </select>
                             </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-3 mt-4 pt-4 border-t">
                        <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>ทุกสถานะ</button>
                        
                        {Object.entries(pageConfig.filters).map(([groupName, statuses]) => (
                            <div key={groupName} className="flex items-center gap-x-2 gap-y-3 flex-wrap">
                                {pageType === 'all' && groupName && <span className="text-sm font-semibold text-slate-500 ml-2">{groupName}</span>}
                                {statuses.map(status => (
                                    <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === status ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                        {status}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                             <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase">เลขที่เอกสาร</th>
                                    {pageType === 'all' && <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase">ประเภท</th>}
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase">ลูกค้า</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase">วันที่</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase text-right">ยอดรวม</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase text-center">สถานะ</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase text-center">จัดการ</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-slate-200">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="text-center p-10 text-slate-500">กำลังโหลด...</td></tr>
                                ) : filteredDocuments.length > 0 ? (
                                    filteredDocuments.map(doc => {
                                        const docTypeInfo = getDocTypeDisplay(doc.type);
                                        return (
                                            <tr 
                                                key={doc.id} 
                                                className={`hover:bg-slate-50 cursor-pointer ${doc.status === 'เกินกำหนด' ? 'bg-red-50/50' : ''}`} 
                                                onClick={() => router.push(`/dashboard/${businessId}/sales/${doc.id}`)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <span className="text-brand-600">
                                                        {(doc as any).docnumber || (doc as any).doc_number || 'ไม่ระบุ'}
                                                    </span>
                                                </td>
                                                {pageType === 'all' && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                                                        <div className="flex items-center gap-2">
                                                            {docTypeInfo.icon}
                                                            <span>{docTypeInfo.text}</span>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                                                    {(doc as any).customername || (doc as any).customer_name || 'ไม่ระบุ'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {(() => {
                                                        const issueDateValue = (doc as any).issuedate || (doc as any).issue_date;
                                                        return issueDateValue ? new Date(issueDateValue).toLocaleDateString('th-TH') : '-';
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 text-right">
                                                    {(() => {
                                                        const grandTotal = (doc as any).grandtotal || (doc as any).grand_total || 0;
                                                        return Number(grandTotal).toLocaleString('th-TH', { minimumFractionDigits: 2 });
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-500">
                                                    <DocumentStatusBadge status={doc.status} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <SalesActionMenu doc={doc} businessId={businessId} />
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr><td colSpan={7} className="text-center p-10 text-slate-500">ไม่พบเอกสารตามเงื่อนไขที่เลือก</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
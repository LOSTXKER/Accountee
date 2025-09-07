// src/app/dashboard/[businessId]/reports/export/page.tsx
"use client";

import React, { useState, useMemo, useEffect, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useTransactions } from '@/hooks/useTransactions';
import { Transaction } from '@/types';
import { DownloadCloud, Loader2, FileText, Package, FileSpreadsheet, Folder, File, Eye } from 'lucide-react';
import FileViewerModal from '@/components/ui/FileViewerModal';

// --- [ใหม่] Component สำหรับแสดงผลตัวอย่างไฟล์ใน ZIP ---
interface FilePreview {
    folder: string;
    fileName: string;
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'cogs';
    url: string;
    fileType?: string;
    transactionId: string;
}

type DocTypes = { slips: boolean; receipts: boolean; wht: boolean; salesDocs: boolean };

// Utilities to mirror server-side filename rules
const sanitizeFilename = (name: string) => {
    let s = (name || '').normalize('NFKC').trim();
    s = s.replace(/[^\p{L}\p{N}\s._-]/gu, '_');
    s = s.replace(/\s+/g, '-');
    s = s.replace(/_{2,}/g, '_').replace(/-{2,}/g, '-');
    s = s.replace(/^[_\-.]+|[_\-.]+$/g, '');
    if (!s) s = 'file';
    return s.slice(0, 80);
};

const parseDesc = (desc?: string) => {
    if (!desc) return { base: '', partner: '', reference: '' };
    let base = desc;
    const partnerMatch = base.match(/\(คู่ค้า:\s*([^\)]+)\)/);
    const refMatch = base.match(/\(อ้างอิง:\s*([^\)]+)\)/);
    base = base.replace(/\s*\(คู่ค้า:[^\)]*\)/g, '').replace(/\s*\(อ้างอิง:[^\)]*\)/g, '').trim();
    return { base, partner: partnerMatch?.[1]?.trim() || '', reference: refMatch?.[1]?.trim() || '' };
};

const ZipFilePreview = ({ transactions, documentTypes }: { transactions: Transaction[]; documentTypes: DocTypes }) => {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerName, setViewerName] = useState<string>('');
    const [viewerType, setViewerType] = useState<string | undefined>(undefined);
    const fileList = useMemo(() => {
        const files: FilePreview[] = [];
        transactions.forEach(t => {
            const date = new Date(t.date);
            const datePrefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const { partner, reference } = parseDesc(t.description);
            const contactSlug = partner ? sanitizeFilename(partner).slice(0, 20) : '';
            const primary = reference ? sanitizeFilename(reference) : '';

            const addFile = (att: any, folder: string, fileType: string) => {
                if (!att || !att.url) return;
                const extension = att.url.split('.').pop()?.split('?')[0] || 'file';
                const firstToken = primary || contactSlug || sanitizeFilename(String(t.id));
                const secondToken = primary && contactSlug ? contactSlug : '';
                const parts = [datePrefix, firstToken, secondToken, fileType].filter(Boolean);
                const name = `${parts.join('_')}.${extension}`;
                files.push({
                    folder,
                    fileName: name,
                    description: t.description,
                    amount: t.amount,
                    type: t.type,
                    url: att.url,
                    fileType: att.type || extension,
                    transactionId: t.id,
                });
            };

            if (documentTypes.slips && t.slip_attachments) t.slip_attachments.forEach(att => addFile(att, '5. สลิปและเอกสารทั่วไป', 'slip'));
            if (documentTypes.receipts && t.document_attachments) {
                const taxFolder = t.type === 'income' ? '1. ภาษีขาย' : '2. ภาษีซื้อ';
                t.document_attachments.forEach(att => addFile(att, taxFolder, 'tax-invoice'));
            }
            if (documentTypes.wht && t.wht_certificate_attachment) addFile(t.wht_certificate_attachment, '3. หนังสือรับรองหัก ณ ที่จ่าย', 'wht-cert');
        });
        return files;
    }, [transactions, documentTypes]);

    const groupedFiles = useMemo(() => {
        return fileList.reduce((acc, file) => {
            (acc[file.folder] = acc[file.folder] || []).push(file);
            return acc;
        }, {} as Record<string, FilePreview[]>);
    }, [fileList]);

    const totals = useMemo(() => {
        const includedTxIds = new Set(fileList.map(f => f.transactionId));
        let income = 0;
        let expense = 0;
        transactions.forEach(t => {
            if (!includedTxIds.has(t.id)) return;
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        });
        return { income, expense };
    }, [fileList, transactions]);

    return (
         <div className="mt-4 border-t pt-4">
            <h3 className="font-semibold text-slate-800">ตัวอย่างไฟล์ที่จะถูกรวม ({fileList.length} ไฟล์)</h3>
            <div className="mt-2 flex items-center gap-4 text-xs">
                <div className="font-mono text-green-600">+{totals.income.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                <div className="font-mono text-red-600">-{totals.expense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="max-h-80 overflow-y-auto bg-slate-50 p-3 rounded-lg mt-2 text-xs space-y-2">
                {Object.keys(groupedFiles).sort().map(folderName => (
                    <div key={folderName}>
                        <div className="flex items-center gap-2 font-semibold text-slate-600">
                            <Folder size={14} />
                            <span>{folderName}</span>
                        </div>
                        <div className="pl-5 mt-1 space-y-1">
                            {groupedFiles[folderName].map((file, index) => {
                                const contactMatch = file.description?.match(/\(คู่ค้า:\s*([^\)]+)\)/);
                                const refMatch = file.description?.match(/\(อ้างอิง:\s*([^\)]+)\)/);
                                const base = (file.description || '')
                                    .replace(/\s*\(คู่ค้า:[^\)]*\)\s*/g, '')
                                    .replace(/\s*\(อ้างอิง:[^\)]*\)\s*/g, '')
                                    .trim();
                                const contact = contactMatch?.[1] || '';
                                const reference = refMatch?.[1] || '';
                                return (
                                <div key={index} className="flex justify-between items-start bg-white p-2 rounded shadow-sm">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-2">
                                            <File size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-slate-800" title={contact || base}>{contact || base || '—'}</p>
                                                {base && contact && (
                                                    <p className="truncate text-[11px] text-slate-500 mt-0.5" title={base}>{base}</p>
                                                )}
                                                {reference && (
                                                    <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">อ้างอิง: {reference}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-1 text-[10px] text-slate-500 font-mono break-all">{file.fileName}</div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-3">
                                        <button
                                            type="button"
                                            className="text-slate-600 hover:text-slate-800 p-1 rounded hover:bg-slate-100"
                                            title="ดูไฟล์ตัวอย่าง"
                                            onClick={() => { setViewerUrl(file.url); setViewerName(file.fileName); setViewerType(file.fileType); setViewerOpen(true); }}
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <span className={`font-mono ${file.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {(file.type === 'income' ? '+' : '-')}
                                            {file.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            );})}
                        </div>
                    </div>
                ))}
                 {fileList.length === 0 && <p className="text-center text-slate-500 p-4">ไม่พบเอกสารในช่วงวันที่ที่เลือก</p>}
            </div>
            <FileViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                fileUrl={viewerUrl}
                fileName={viewerName}
                fileType={viewerType}
            />
        </div>
    );
};


const TransactionPreviewTable = ({ data, title }: { data: Transaction[], title: string }) => (
    <div className="mt-4 border-t pt-4">
        <h3 className="font-semibold text-slate-800">{title} ({data.length} รายการ)</h3>
        <div className="max-h-60 overflow-y-auto bg-slate-50 p-2 rounded-lg mt-2">
            {data.length > 0 ? (
                <table className="w-full text-xs">
                    <tbody>
                        {data.map(t => (
                            <tr key={t.id} className="border-b">
                                <td className="p-2">{(new Date(t.date)).toLocaleDateString('th-TH')}</td>
                                <td className="p-2 text-slate-700">{t.description}</td>
                                <td className={`p-2 text-right font-mono ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {(t.type === 'income' ? '+' : '-')}{t.amount.toLocaleString('th-TH', {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : <p className="text-center text-slate-500 p-4">ไม่พบข้อมูลในช่วงวันที่ที่เลือก</p>}
        </div>
    </div>
);

const ExportCard = ({ title, description, icon: Icon, onExport, exportType, children }: {
    title: string;
    description: string;
    icon: React.ElementType;
    onExport: (type: 'zip' | 'tax' | 'wht', startDate: string, endDate: string) => Promise<void>;
    exportType: 'zip' | 'tax' | 'wht';
    children: ReactNode;
}) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSetDateRange = (type: 'thisMonth' | 'lastMonth') => {
        const now = new Date();
        let start: Date, end: Date;
        if (type === 'thisMonth') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        }
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };
    
    const handleExportClick = async () => {
        if (!startDate || !endDate) {
            alert('กรุณาระบุช่วงวันที่ให้ครบถ้วน');
            return;
        }
        setIsLoading(true);
        await onExport(exportType, startDate, endDate);
        setIsLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Icon className="h-8 w-8 text-brand-600" />
                    <div>
                        <h2 className="text-xl font-bold">{title}</h2>
                        <p className="text-sm text-slate-500">{description}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                        <Button variant="secondary" size="sm" onClick={() => handleSetDateRange('thisMonth')}>เดือนนี้</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleSetDateRange('lastMonth')}>เดือนที่แล้ว</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required aria-label="วันที่เริ่มต้น" />
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required aria-label="วันที่สิ้นสุด" />
                    </div>
                </div>
                {React.cloneElement(children as React.ReactElement, { startDate, endDate })}
            </CardContent>
            <div className="p-4 bg-slate-50 border-t text-center">
                 <Button onClick={handleExportClick} disabled={isLoading || !startDate || !endDate}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
                    {isLoading ? 'กำลังส่งออก...' : 'ดาวน์โหลด'}
                </Button>
            </div>
        </Card>
    );
};

export default function ExportPage() {
    const params = useParams();
    const businessId = params.businessId as string;
    const { transactions, loading: transactionsLoading } = useTransactions(businessId, 'all');
    const [zipDocTypes, setZipDocTypes] = useState<DocTypes>({ slips: true, receipts: true, wht: true, salesDocs: true });

    const handleDownload = async (type: 'zip' | 'tax' | 'wht', startDate: string, endDate: string) => {
        try {
            let endpoint = '';
            let fileName = '';
            const bodyPayload = { businessId, startDate, endDate, documentTypes: (type === 'zip' ? zipDocTypes : { slips: true, receipts: true, wht: true, salesDocs: true }) };

            if (type === 'zip') {
                endpoint = '/api/export-documents';
                fileName = `Accountee_Export_${startDate}_to_${endDate}.zip`;
            } else if (type === 'tax') {
                endpoint = '/api/export-tax-report';
                fileName = `tax_report_${startDate}_to_${endDate}.xlsx`;
            } else {
                endpoint = '/api/export-wht-report';
                fileName = `wht_report_${startDate}_to_${endDate}.xlsx`;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload),
            });
            if (!response.ok) {
                let message = 'เกิดข้อผิดพลาดในการสร้างไฟล์';
                try {
                    const data = await response.clone().json();
                    if (data?.error) message = data.error;
                } catch {
                    try {
                        const text = await response.text();
                        if (text) message = text;
                    } catch {}
                }
                throw new Error(message);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert((error as Error).message);
        }
    };
    
    // This component will filter transactions based on the date range from its parent ExportCard
    const FilteredPreview = ({ startDate, endDate, previewType }: { startDate: string, endDate: string, previewType: 'zip'|'tax'|'wht' }) => {
        const filtered = useMemo(() => {
            if (!startDate || !endDate || transactionsLoading) return [];
            const start = new Date(startDate).getTime();
            const end = new Date(endDate).setHours(23, 59, 59, 999);
            return transactions.filter(t => {
                const tDate = new Date(t.date).getTime();
                return tDate >= start && tDate <= end;
            });
        }, [startDate, endDate, transactions, transactionsLoading]);

        if (previewType === 'zip') {
            return <ZipFilePreview transactions={filtered} documentTypes={zipDocTypes} />;
        }
        if (previewType === 'tax') {
            const taxData = filtered.filter(t => t.vat_amount && t.vat_amount > 0);
            return <TransactionPreviewTable data={taxData} title="รายการที่จะอยู่ในรายงาน" />;
        }
        if (previewType === 'wht') {
            const whtData = filtered.filter(t => t.withholdingtax && t.withholdingtax > 0);
            return <TransactionPreviewTable data={whtData} title="รายการที่จะอยู่ในรายงาน" />;
        }
        return null;
    };


    const ZipControls = ({ startDate, endDate }: { startDate: string; endDate: string }) => (
        <div className="mt-4 pt-3 border-t space-y-3">
            <div className="flex flex-wrap gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={zipDocTypes.slips} onChange={e => setZipDocTypes(prev => ({ ...prev, slips: e.target.checked }))} />
                    <span>สลิป/เอกสารทั่วไป</span>
                </label>
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={zipDocTypes.receipts} onChange={e => setZipDocTypes(prev => ({ ...prev, receipts: e.target.checked }))} />
                    <span>ใบกำกับ/เอกสารภาษี</span>
                </label>
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={zipDocTypes.wht} onChange={e => setZipDocTypes(prev => ({ ...prev, wht: e.target.checked }))} />
                    <span>หนังสือรับรองหัก ณ ที่จ่าย</span>
                </label>
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={zipDocTypes.salesDocs} onChange={e => setZipDocTypes(prev => ({ ...prev, salesDocs: e.target.checked }))} />
                    <span>เอกสารขาย (PDF)</span>
                </label>
            </div>
            <ZipFilePreview transactions={
                useMemo(() => {
                    if (!startDate || !endDate || transactionsLoading) return [] as Transaction[];
                    const start = new Date(startDate).getTime();
                    const end = new Date(endDate).setHours(23, 59, 59, 999);
                    return transactions.filter(t => {
                        const tDate = new Date(t.date).getTime();
                        return tDate >= start && tDate <= end;
                    });
                }, [startDate, endDate, transactions, transactionsLoading])
            } documentTypes={zipDocTypes} />
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                 <h1 className="text-3xl font-bold text-gray-800">ส่งออกเอกสารสำหรับบัญชี</h1>
                 <p className="text-slate-500 mt-1">เลือกประเภทข้อมูลและช่วงวันที่ที่ต้องการเพื่อดาวน์โหลดไฟล์</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <ExportCard 
                    title="ไฟล์เอกสารต้นฉบับ"
                    description="รวมไฟล์สลิป, ใบกำกับ, และอื่นๆ ทั้งหมดในไฟล์ ZIP เดียว"
                    icon={Package}
                    onExport={handleDownload}
                    exportType="zip"
                >
                    <ZipControls startDate="" endDate="" />
                </ExportCard>
                <ExportCard 
                    title="รายงานภาษีซื้อ-ขาย"
                    description="สำหรับยื่น ภ.พ. 30 (ไฟล์ Excel)"
                    icon={FileSpreadsheet}
                    onExport={handleDownload}
                    exportType="tax"
                >
                     <FilteredPreview startDate="" endDate="" previewType="tax" />
                </ExportCard>
                <ExportCard 
                    title="รายงานหัก ณ ที่จ่าย"
                    description="สำหรับยื่น ภ.ง.ด. (ไฟล์ Excel)"
                    icon={FileSpreadsheet}
                    onExport={handleDownload}
                    exportType="wht"
                >
                     <FilteredPreview startDate="" endDate="" previewType="wht" />
                </ExportCard>
            </div>
        </div>
    );
}
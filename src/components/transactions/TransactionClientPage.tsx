// src/components/transactions/TransactionClientPage.tsx
"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Transaction, Category, Attachment, TransactionStatus } from "@/types";
import { PlusCircle, MoreVertical, Copy, LayoutGrid, List, Zap, Download, Loader2, ImageIcon, FileText, Percent, ArrowUpDown } from "lucide-react";
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import TransactionForm from "./TransactionForm";
import TransactionActionModal from "./TransactionActionModal";
import TransactionKanbanView from "./TransactionKanbanView";
import { Input } from "../ui/Input";
import { getFileIcon } from "@/lib/file-utils";
import { buildStoragePath } from "@/lib/storage-utils";
import TransactionStatusBadge from "./TransactionStatusBadge";
import FileViewerModal from "../ui/FileViewerModal";
import AiUploaderModal from './AiUploaderModal';
import FileListWithActions from "../ui/FileListWithActions";
import { deleteFileAndUpdateTransaction } from "@/lib/file-operations";

type ClientTransaction = Transaction & { date: Date };

function ExportModal({ isOpen, onClose, onExport, pageType }: { isOpen: boolean, onClose: () => void, onExport: (startDate: string, endDate: string) => void, pageType: 'income' | 'expense' | 'all' }) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const handleExportClick = async () => {
        if (!startDate || !endDate) {
            alert('กรุณาเลือกช่วงวันที่');
            return;
        }
        setIsExporting(true);
        await onExport(startDate, endDate);
        setIsExporting(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`ส่งออกรายการ${pageType === 'income' ? 'รายรับ' : 'รายจ่าย'}`}>
            <div className="space-y-4">
                <p className="text-sm text-slate-600">เลือกช่วงวันที่ของข้อมูลที่ต้องการส่งออกเป็นไฟล์ Excel</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่มต้น</label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                    <Button onClick={handleExportClick} disabled={isExporting}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isExporting ? 'กำลังส่งออก...' : 'ส่งออกเป็น Excel'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function ActionMenu({ onCopy, onCancel, canCancel }: { onCopy: () => void; onCancel: () => void; canCancel: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const menuWidth = 224; // w-56

    const updatePosition = useCallback(() => {
        const btn = buttonRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const spacing = 8;
        let left = rect.right - menuWidth;
        left = Math.min(left, window.innerWidth - menuWidth - spacing);
        left = Math.max(left, spacing);
    const top = rect.bottom + spacing;
    setPosition({ top, left });
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();
        const onClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current && !menuRef.current.contains(target) && buttonRef.current && !buttonRef.current.contains(target)) {
                setIsOpen(false);
            }
        };
        const onScroll = () => updatePosition();
        const onResize = () => updatePosition();
        document.addEventListener('mousedown', onClick);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('mousedown', onClick);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [isOpen, updatePosition]);

    const menu = isOpen ? (
        <div
            ref={menuRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: menuWidth }}
            className="origin-top-right mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[9999]"
        >
            <div className="py-1">
                <button onClick={() => { onCopy(); setIsOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                    <Copy size={14} /> คัดลอกรายการ
                </button>
                <button
                    onClick={() => { if (canCancel) { onCancel(); setIsOpen(false); } }}
                    className={`w-full text-left flex items-center gap-3 px-4 py-2 text-sm ${canCancel ? 'text-red-600 hover:bg-red-50' : 'text-slate-400 cursor-not-allowed'}`}
                    disabled={!canCancel}
                >
                    ยกเลิกรายการ
                </button>
            </div>
        </div>
    ) : null;

    return (
        <div className="relative">
            <button ref={buttonRef} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-2 rounded-md hover:bg-slate-200">
                <MoreVertical size={16} />
            </button>
            {isOpen && typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
        </div>
    );
}


export default function TransactionClientPage({ businessId, pageType }: { businessId: string, pageType: 'income' | 'expense' }) {
    const queryClient = useQueryClient();
    const { 
        transactions: filteredTransactions, 
        loading: isLoading, 
        isError,
        invalidateTransactionsQuery 
    } = useTransactions(businessId, pageType);
    const { categories, loading: categoriesLoading } = useCategories(businessId);
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [actionModalTx, setActionModalTx] = useState<ClientTransaction | null>(null);
    const [fileToView, setFileToView] = useState<string | null>(null);
    const [attachmentsToShow, setAttachmentsToShow] = useState<Attachment[] | null>(null);
    const [attachmentSourceTx, setAttachmentSourceTx] = useState<ClientTransaction | null>(null);
    const [attachmentType, setAttachmentType] = useState<'document_attachments' | 'slip_attachments' | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
    // Unified, user-friendly sort option
    const [sortOption, setSortOption] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'description_asc' | 'description_desc'>('date_desc');
    
    const searchParams = useSearchParams();
    const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>(() => {
        const statusFromUrl = searchParams.get('status');
        return (statusFromUrl as TransactionStatus) || 'all';
    });
    
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiInitialData, setAiInitialData] = useState<Partial<Transaction> | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const supabase = createClient();

    const refreshActionModal = useCallback(async (txId: string) => {
        const { data, error } = await supabase.from('transactions').select('*').eq('id', txId).single();
        if (error) {
            setActionModalTx(null);
            return;
        }
        if (data) {
            setActionModalTx({ ...data, date: new Date(data.date) } as ClientTransaction);
            invalidateTransactionsQuery(); // Invalidate to refetch list
        }
    }, [supabase, invalidateTransactionsQuery]);


    const handleDeleteFile = async (file: Attachment, type: 'slip' | 'document' | 'wht') => {
        if (!actionModalTx) return;
        
        let attachmentField: 'slip_attachments' | 'document_attachments' | 'wht_certificate_attachment' | null = null;
        if (type === 'slip') attachmentField = 'slip_attachments';
        else if (type === 'document') attachmentField = 'document_attachments';
        else if (type === 'wht') attachmentField = 'wht_certificate_attachment';

        if (!attachmentField) return;

        try {
            const bucketHint = attachmentField === 'wht_certificate_attachment' ? 'wht_certificates' : 'attachments';
            const result = await deleteFileAndUpdateTransaction(
                actionModalTx.id,
                file.url,
                attachmentField,
                bucketHint
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to delete file');
            }
            
            await refreshActionModal(actionModalTx.id);

        } catch (error) {
            console.error('Error deleting attachment:', error);
            alert(`เกิดข้อผิดพลาดในการลบไฟล์: ${(error as Error).message}`);
            // Optionally re-throw or handle UI feedback
            throw error;
        }
    };

    const handleAdvanceStatus = async () => {
        if (!actionModalTx?.id || !actionModalTx.status) return;

        const { status, type, withholdingtax, slip_attachments, document_attachments, wht_certificate_attachment } = actionModalTx;
        const hasWHT = (withholdingtax ?? 0) > 0;
        let nextStatus: TransactionStatus | null = null;

        if (type === 'income') {
            if (status === 'รอรับเงิน') {
                // อนุญาตให้ข้ามสลิปได้ โดยกดปุ่ม 'ต่อไป' จะไปสเต็ปถัดไป แม้ยังไม่มีสลิป
                nextStatus = hasWHT ? 'รอรับ หัก ณ ที่จ่าย' : 'เสร็จสมบูรณ์';
            }
            else if (status === 'รอรับ หัก ณ ที่จ่าย') {
                if (!wht_certificate_attachment) {
                    alert('กรุณาอัปโหลดหรือสร้างหนังสือรับรอง หัก ณ ที่จ่ายก่อน');
                    return;
                }
                nextStatus = 'เสร็จสมบูรณ์';
            }
        } else { // Expense
            if (status === 'รอชำระ') {
                // อนุญาตให้ข้ามสลิปได้เช่นกัน
                nextStatus = 'รอเอกสาร';
            }
            else if (status === 'รอเอกสาร') {
                 if (!document_attachments || document_attachments.length === 0) {
                    alert('กรุณาอัปโหลดเอกสารก่อนดำเนินการต่อ');
                    return;
                }
                nextStatus = hasWHT ? 'รอส่ง หัก ณ ที่จ่าย' : 'เสร็จสมบูรณ์';
            }
            else if (status === 'รอส่ง หัก ณ ที่จ่าย') {
                if (!wht_certificate_attachment) {
                    alert('กรุณาอัปโหลดหรือสร้างหนังสือรับรอง หัก ณ ที่จ่ายก่อน');
                    return;
                }
                nextStatus = 'เสร็จสมบูรณ์';
            }
        }

        if (nextStatus) {
            try {
                const resp = await fetch('/api/transactions/update-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transactionId: actionModalTx.id, businessId, status: nextStatus })
                });
                if (!resp.ok) {
                    const data = await resp.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to update status');
                }
                await refreshActionModal(actionModalTx.id);
            } catch (e) { console.error("Error advancing status", e); }
        }
    };

    // This useMemo is no longer needed as filtering is done in the hook
    // const transactions = useMemo(() => { ... });

    const isAutoGenerated = useCallback((t: ClientTransaction) => {
        // Prefer explicit linkage, fallback to description heuristic (Thai text for receipt-created income)
        return !!t.source_doc_id || /รายรับจากใบเสร็จ/i.test(t.description || '');
    }, []);

    const activeTransactions = useMemo(() => 
        filteredTransactions
            .filter(t => !t.isdeleted)
            .sort((a, b) => {
                let comparison = 0;
                switch (sortOption) {
                    case 'date_asc':
                        comparison = a.date.getTime() - b.date.getTime();
                        if (comparison === 0) {
                            // tie-breaker: prefer manual entries (no source_doc_id) over auto-created (from receipts)
                            const aAuto = isAutoGenerated(a);
                            const bAuto = isAutoGenerated(b);
                            if (aAuto !== bAuto) {
                                comparison = aAuto ? 1 : -1; // manual first
                            } else {
                                // then by created_at (newer first within same day)
                                comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                            }
                        }
                        break;
                    case 'date_desc':
                        comparison = b.date.getTime() - a.date.getTime();
                        if (comparison === 0) {
                            // tie-breaker: prefer manual entries (no source_doc_id) over auto-created (from receipts)
                            const aAuto = isAutoGenerated(a);
                            const bAuto = isAutoGenerated(b);
                            if (aAuto !== bAuto) {
                                comparison = aAuto ? 1 : -1; // manual first
                            } else {
                                // then by created_at desc (newest first)
                                comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                            }
                        }
                        break;
                    case 'amount_asc':
                        comparison = a.amount - b.amount;
                        break;
                    case 'amount_desc':
                        comparison = b.amount - a.amount;
                        break;
                    case 'description_desc':
                        comparison = b.description.localeCompare(a.description, 'th');
                        break;
                    case 'description_asc':
                    default:
                        comparison = a.description.localeCompare(b.description, 'th');
                        break;
                }
                return comparison;
            }), 
        [filteredTransactions, sortOption]
    );

    // Persist sort selection per page (income/expense)
    useEffect(() => {
        const key = `transactions_sort_${pageType}`;
        const saved = typeof window !== 'undefined' ? (localStorage.getItem(key) as typeof sortOption | null) : null;
        if (saved) setSortOption(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageType]);

    useEffect(() => {
        const key = `transactions_sort_${pageType}`;
        try {
            if (typeof window !== 'undefined') localStorage.setItem(key, sortOption);
        } catch {}
    }, [sortOption, pageType]);

    // Helper to parse description suffixes: (คู่ค้า: ...), (อ้างอิง: ...)
    const parseDesc = useCallback((desc: string) => {
        const contactMatch = desc.match(/\(คู่ค้า:\s*([^\)]+)\)/);
        const refMatch = desc.match(/\(อ้างอิง:\s*([^\)]+)\)/);
        const base = desc
            .replace(/\s*\(คู่ค้า:[^\)]+\)\s*/g, '')
            .replace(/\s*\(อ้างอิง:[^\)]+\)\s*/g, '')
            .trim();
        return {
            base,
            contact: contactMatch?.[1]?.trim() || '',
            reference: refMatch?.[1]?.trim() || '',
        };
    }, []);

    const finalFilteredTransactions = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return activeTransactions
            .filter(t => {
                if (q === '') return true;
                const { base, contact, reference } = parseDesc(t.description);
                return (
                    t.description.toLowerCase().includes(q) ||
                    base.toLowerCase().includes(q) ||
                    (contact && contact.toLowerCase().includes(q)) ||
                    (reference && reference.toLowerCase().includes(q)) ||
                    t.category.toLowerCase().includes(q) ||
                    (t.docnumber ? t.docnumber.toLowerCase().includes(q) : false)
                );
            })
            .filter(t => statusFilter === 'all' || t.status === statusFilter);
    }, [activeTransactions, searchTerm, statusFilter, parseDesc]);

    // Summary: exclude canceled from the total amount, keep count as visible rows
    const summaryTotalExcludingCanceled = useMemo(() => {
        return finalFilteredTransactions
            .filter(t => t.status !== 'ยกเลิก')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [finalFilteredTransactions]);

    const pageConfig = useMemo(() => {
        const baseStatuses: TransactionStatus[] = ['เสร็จสมบูรณ์', 'ยกเลิก'];
        if (pageType === 'income') {
            return {
                title: 'สมุดรายรับ',
                formType: 'income' as 'income' | 'expense',
                addButtonLabel: 'เพิ่มรายรับ',
                kanbanStatuses: ['รอรับเงิน', 'รอรับ หัก ณ ที่จ่าย', ...baseStatuses] as TransactionStatus[],
            };
        }
        return {
            title: 'สมุดรายจ่าย',
            formType: 'expense' as 'income' | 'expense',
            addButtonLabel: 'เพิ่มรายจ่าย',
            kanbanStatuses: ['รอชำระ', 'รอเอกสาร', 'รอส่ง หัก ณ ที่จ่าย', ...baseStatuses] as TransactionStatus[],
        };
    }, [pageType]);

    const handleAiUpload = async (file: File) => {
        setIsAiProcessing(true);
        try {
            const formData = new FormData();
            formData.append('receipt', file);

            const response = await fetch('/api/process-receipt', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process receipt');
            }

            const extractedData = await response.json();
            
            // Convert date string to Date object
            if (extractedData.date) {
                extractedData.date = new Date(extractedData.date);
            }
            
            // Rename totalAmount to amount
            if (extractedData.totalAmount) {
                extractedData.amount = extractedData.totalAmount;
                delete extractedData.totalAmount;
            }

            setAiInitialData(extractedData);
            setIsAiModalOpen(false);
            setIsAddModalOpen(true);

        } catch (error) {
            console.error("AI processing failed:", error);
            alert(`เกิดข้อผิดพลาดในการประมวลผลด้วย AI: ${(error as Error).message}`);
        } finally {
            setIsAiProcessing(false);
        }
    };

    const handleCopy = (txToCopy: ClientTransaction) => {
        const { id, ...rest } = txToCopy;
        const newTxData = { ...rest, date: new Date() };
        setAiInitialData(newTxData);
        setIsAddModalOpen(true);
    };

    const showAttachments = (transaction: ClientTransaction, attachments: Attachment[], type: 'document_attachments' | 'slip_attachments') => {
        setAttachmentSourceTx(transaction);
        setAttachmentType(type);
        setAttachmentsToShow(attachments);
    };

    const handleDeleteAttachment = async (file: Attachment) => {
        if (!attachmentSourceTx || !attachmentType) {
            console.error('Missing transaction or attachment type information');
            return;
        }

        try {
            const result = await deleteFileAndUpdateTransaction(
                attachmentSourceTx.id,
                file.url,
                attachmentType
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to delete file');
            }

            // อัพเดต attachmentsToShow โดยลบไฟล์ที่ถูกลบออก
            setAttachmentsToShow(prev => 
                prev ? prev.filter(att => att.url !== file.url) : null
            );

            // Trigger refetch by updating the query
            window.location.reload(); // Simple solution, could be optimized with better state management
            
        } catch (error) {
            console.error('Error deleting attachment:', error);
            alert(`เกิดข้อผิดพลาดในการลบไฟล์: ${(error as Error).message}`);
        }
    };

    const uploadFile = async (file: File, folder: string): Promise<Attachment> => {
        const filePath = buildStoragePath(folder, businessId, file.name);
        const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
        return { name: file.name, type: file.type, url: data.publicUrl };
    };

    const handleSaveNewTransaction = async (formData: Partial<Transaction>) => {
        try {
            // Normalize date to YYYY-MM-DD to avoid timezone drift on the server
            const dateIso = formData.date instanceof Date
                ? `${formData.date.getFullYear()}-${String(formData.date.getMonth()+1).padStart(2,'0')}-${String(formData.date.getDate()).padStart(2,'0')}`
                : (typeof formData.date === 'string' ? (formData.date as string).slice(0,10) : undefined);
            const { error } = await supabase.from('transactions').insert([{
                ...formData, 
                businessid: businessId, 
                date: dateIso,
                isdeleted: false,
            }]);
            if (error) throw error;
            setIsAddModalOpen(false);
            setAiInitialData(null);
            invalidateTransactionsQuery(); // Invalidate to refetch list
        } catch(e) { console.error(e); alert('Error saving new transaction'); }
    };

    const handleSaveDetails = async (formData: Partial<Transaction>) => {
        if (!actionModalTx?.id) return;
        try {
            const hasWHT = (formData.withholdingtax ?? 0) > 0;
            const updates: Partial<Transaction> = { ...formData };
            if (actionModalTx.status === 'เสร็จสมบูรณ์' || actionModalTx.status === 'รอส่ง หัก ณ ที่จ่าย' || actionModalTx.status === 'รอรับ หัก ณ ที่จ่าย') {
                if (!hasWHT) {
                    updates.status = (actionModalTx.document_attachments?.length || 0) > 0 ? 'เสร็จสมบูรณ์' : 'รอเอกสาร';
                }
            }
            const { error } = await supabase.from('transactions').update(updates).eq('id', actionModalTx.id);
            if (error) throw error;
            await refreshActionModal(actionModalTx.id);
        } catch (e) { console.error(e); alert('Error updating details'); }
    };
    
    const handleFileUpload = async (file: File, type: 'slip' | 'document' | 'wht') => {
        if (!actionModalTx?.id) return;
        try {
            const attachment = await uploadFile(file, type);
            const updates: any = {};

            if (type === 'slip') {
                updates.slip_attachments = [...(actionModalTx.slip_attachments || []), attachment];
            } else if (type === 'document') {
                updates.document_attachments = [...(actionModalTx.document_attachments || []), attachment];
            } else if (type === 'wht') {
                updates.wht_certificate_attachment = attachment;
            }
            
            const { error } = await supabase.from('transactions').update(updates).eq('id', actionModalTx.id);
            if (error) throw error;
            await refreshActionModal(actionModalTx.id);
        } catch(e) { console.error(e); alert('Error uploading file'); }
    };
    
    const handleSkipSlip = async () => {
        if (!actionModalTx?.id) return;
        const hasWHT = (actionModalTx.withholdingtax ?? 0) > 0;
        let newStatus: TransactionStatus;
        if (actionModalTx.type === 'income') {
            newStatus = hasWHT ? 'รอรับ หัก ณ ที่จ่าย' : 'เสร็จสมบูรณ์';
        } else {
            newStatus = 'รอเอกสาร';
        }
        const resp = await fetch('/api/transactions/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: actionModalTx.id, businessId, status: newStatus })
        });
        if (!resp.ok) {
            const data = await resp.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to update status');
        }
        await refreshActionModal(actionModalTx.id);
    }
    
    const handleRevertStatus = async () => {
        if (!actionModalTx?.id || !actionModalTx.status) return;

        const { status, type, withholdingtax } = actionModalTx;
        const hasWHT = (withholdingtax ?? 0) > 0;
        let previousStatus: TransactionStatus | null = null;

        if (type === 'income') {
            if (status === 'เสร็จสมบูรณ์') previousStatus = hasWHT ? 'รอรับ หัก ณ ที่จ่าย' : 'รอรับเงิน';
            else if (status === 'รอรับ หัก ณ ที่จ่าย') previousStatus = 'รอรับเงิน';
        } else { // Expense
            if (status === 'เสร็จสมบูรณ์') previousStatus = hasWHT ? 'รอส่ง หัก ณ ที่จ่าย' : 'รอเอกสาร';
            else if (status === 'รอส่ง หัก ณ ที่จ่าย') previousStatus = 'รอเอกสาร';
            else if (status === 'รอเอกสาร') previousStatus = 'รอชำระ';
        }

        if (previousStatus) {
            try {
                const resp = await fetch('/api/transactions/update-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transactionId: actionModalTx.id, businessId, status: previousStatus })
                });
                if (!resp.ok) {
                    const data = await resp.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to update status');
                }
                await refreshActionModal(actionModalTx.id);
            } catch (e) { console.error("Error reverting status", e); }
        }
    };

    const handleCancelTransaction = async () => {
        if (!actionModalTx?.id) return;
        if (!window.confirm('ยืนยันการยกเลิกรายการนี้หรือไม่?')) return;
        try {
            const resp = await fetch('/api/transactions/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId: actionModalTx.id, businessId, status: 'ยกเลิก' as TransactionStatus })
            });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to cancel transaction');
            }
            await refreshActionModal(actionModalTx.id);
        } catch (e) { console.error('Cancel transaction failed', e); alert('ยกเลิกรายการไม่สำเร็จ'); }
    };

    const handleCancelTransactionById = async (txId: string) => {
        if (!window.confirm('ยืนยันการยกเลิกรายการนี้หรือไม่?')) return;
        try {
            const resp = await fetch('/api/transactions/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId: txId, businessId, status: 'ยกเลิก' as TransactionStatus })
            });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to cancel transaction');
            }
            // Refresh list
            invalidateTransactionsQuery();
            // Refresh modal if same tx is open
            if (actionModalTx?.id === txId) {
                await refreshActionModal(txId);
            }
        } catch (e) { console.error('Cancel transaction failed', e); alert('ยกเลิกรายการไม่สำเร็จ'); }
    };

    const handleExport = async (startDate: string, endDate: string) => {
        // This would call a Supabase Edge Function
        try {
            const response = await fetch('/api/export-transactions', { // This API route needs to be updated
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId, startDate, endDate, pageType }),
            });
            // ... rest of the export logic
        } catch (error) {
            console.error('Export failed:', error);
            alert((error as Error).message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">{pageConfig.title}</h1>
                <div className="flex gap-2">
                    <Button onClick={() => setIsAiModalOpen(true)} variant="primary">
                        <Zap size={16} className="mr-2"/> เพิ่มด้วย AI
                    </Button>
                    <Button onClick={() => { setAiInitialData(null); setIsAddModalOpen(true); }} variant="secondary">
                        <PlusCircle size={16} className="mr-2"/> เพิ่มเอง
                    </Button>
                </div>
            </div>
            
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                            <Input 
                                placeholder="ค้นหา..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full sm:w-80" 
                            />
                            {viewMode === 'table' && (
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-slate-600">เรียงลำดับ</label>
                                    <select 
                                        value={sortOption}
                                        onChange={e => setSortOption(e.target.value as typeof sortOption)}
                                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="date_desc">ล่าสุดก่อน (วันที่ใหม่ → เก่า)</option>
                                        <option value="date_asc">เก่าก่อน (วันที่เก่า → ใหม่)</option>
                                        <option value="amount_desc">ยอดมาก → น้อย</option>
                                        <option value="amount_asc">ยอดน้อย → มาก</option>
                                        <option value="description_asc">ชื่อ (ก → ฮ)</option>
                                        <option value="description_desc">ชื่อ (ฮ → ก)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                           <Button onClick={() => setIsExportModalOpen(true)} variant="secondary" size="sm">
                                <Download size={16} className="mr-2"/> Export
                            </Button>
                            <Button variant={viewMode === 'table' ? 'primary' : 'secondary'} size="sm" onClick={() => setViewMode('table')}><List size={16} /></Button>
                            <Button variant={viewMode === 'kanban' ? 'primary' : 'secondary'} size="sm" onClick={() => setViewMode('kanban')}><LayoutGrid size={16} /></Button>
                        </div>
                    </div>
                    {viewMode === 'table' && (
                        <div className="border-t pt-4">
                            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-full overflow-x-auto">
                                <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${statusFilter === 'all' ? 'bg-white shadow' : ''}`}>ทั้งหมด</button>
                                {pageConfig.kanbanStatuses.map(status => (
                                    <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${statusFilter === status ? 'bg-white shadow' : ''}`}>
                                        {status}
                                    </button>
                                ))}

                            </div>
                        </div>
                    )}
                </CardContent>
                
                {viewMode === 'table' ? (
                    <div className="overflow-x-auto">
                        {/* Summary moved to top: total excludes canceled items */}
                        <div className="bg-slate-50 px-4 py-3 flex justify-between items-center text-sm font-semibold border-b">
                            <span className="text-slate-600">
                                รวม {finalFilteredTransactions.length} รายการ
                            </span>
                            <span className={`${pageType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                ยอดรวม: {summaryTotalExcludingCanceled.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                            </span>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    {/** helpers for header indicators **/}
                                    {(() => {
                                        const currentSortBy = sortOption.startsWith('date')
                                            ? 'date'
                                            : sortOption.startsWith('amount')
                                            ? 'amount'
                                            : 'description';
                                        const isDesc = sortOption.endsWith('desc');
                                        return (
                                            <>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase text-center">รายการที่</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase text-center">เลขที่เอกสาร</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase text-center">สถานะ</th>
                                    <th 
                                        className="px-4 py-3 text-xs font-semibold uppercase cursor-pointer hover:bg-slate-100 select-none"
                                        onClick={() => {
                                            setSortOption(prev => {
                                                if (prev.startsWith('description')) {
                                                    return prev === 'description_asc' ? 'description_desc' : 'description_asc';
                                                }
                                                return 'description_asc';
                                            });
                                        }}
                                    >
                                        <div className="flex items-center gap-1">
                                            ลูกค้า/รายละเอียด
                                            {currentSortBy === 'description' && (
                                                <ArrowUpDown size={12} className={isDesc ? 'transform rotate-180' : ''} />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase text-center">หมวดหมู่</th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase text-center">เอกสาร/ไฟล์</th>
                                    <th 
                                        className="px-4 py-3 text-xs font-semibold uppercase cursor-pointer hover:bg-slate-100 select-none text-center"
                                        onClick={() => {
                                            setSortOption(prev => {
                                                if (prev.startsWith('date')) {
                                                    return prev === 'date_desc' ? 'date_asc' : 'date_desc';
                                                }
                                                return 'date_desc';
                                            });
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            วันที่
                                            {currentSortBy === 'date' && (
                                                <ArrowUpDown size={12} className={isDesc ? 'transform rotate-180' : ''} />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-xs font-semibold uppercase text-right cursor-pointer hover:bg-slate-100 select-none"
                                        onClick={() => {
                                            setSortOption(prev => {
                                                if (prev.startsWith('amount')) {
                                                    return prev === 'amount_desc' ? 'amount_asc' : 'amount_desc';
                                                }
                                                return 'amount_desc';
                                            });
                                        }}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            ยอดรวม
                                            {currentSortBy === 'amount' && (
                                                <ArrowUpDown size={12} className={isDesc ? 'transform rotate-180' : ''} />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase text-center"></th>
                                            </>
                                        );
                                    })()}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                            {(isLoading || categoriesLoading) ? (<tr><td colSpan={9} className="text-center p-10">กำลังโหลด...</td></tr>) :
                                finalFilteredTransactions.map((t, index) => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm text-center">{finalFilteredTransactions.length - index}</td>
                                        <td className="px-4 py-3 text-xs text-center font-mono">{t.docnumber || '—'}</td>
                                        <td className="px-4 py-3 text-xs text-center"><TransactionStatusBadge status={t.status} /></td>
                                        
                                        {/* ลูกค้า/รายละเอียด */}
                                        <td className="px-4 py-3">
                                            {(() => {
                                                const info = parseDesc(t.description);
                                                const receiptMatch = t.description.match(/รายรับจากใบเสร็จ\s+([\w-]+)/);
                                                const receiptNumber = receiptMatch ? receiptMatch[1] : null;
                                                
                                                return (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-slate-800">{info.contact || info.base}</p>
                                                            {receiptNumber && (
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        try {
                                                                            const { data: receipt, error } = await supabase
                                                                                .from('sales_documents')
                                                                                .select('id')
                                                                                .eq('businessid', businessId)
                                                                                .eq('docnumber', receiptNumber)
                                                                                .eq('type', 'receipt')
                                                                                .single();
                                                                            
                                                                            if (error || !receipt) {
                                                                                window.open(`/dashboard/${businessId}/sales/receipts?search=${receiptNumber}`, '_blank');
                                                                            } else {
                                                                                window.open(`/dashboard/${businessId}/sales/${receipt.id}`, '_blank');
                                                                            }
                                                                        } catch (err) {
                                                                            console.error('Error finding receipt:', err);
                                                                            window.open(`/dashboard/${businessId}/sales/receipts?search=${receiptNumber}`, '_blank');
                                                                        }
                                                                    }}
                                                                    title={`ไปยังใบเสร็จ ${receiptNumber}`}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full border border-green-200 hover:bg-green-200 transition-colors"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                    {receiptNumber}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {info.contact && info.base && (
                                                            <p className="text-xs text-slate-600">{info.base}</p>
                                                        )}
                                                        {info.reference && (
                                                            <span className="inline-block px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full border">อ้างอิง: {info.reference}</span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        
                                        {/* หมวดหมู่ */}
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                                {t.category}
                                            </span>
                                        </td>
                                        
                                        {/* เอกสาร/ไฟล์ */}
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                                {(() => {
                                                    const slipCount = (t.slip_attachments?.length || 0);
                                                    const docCount = (t.document_attachments?.length || 0);
                                                    const whtCount = t.wht_certificate_attachment ? 1 : 0;
                                                    const hasWHT = (t.withholdingtax ?? 0) > 0;

                                                    return (
                                                        <>
                                                            {/* Slip */}
                                                            {slipCount > 0 ? (
                                                                <span
                                                                    role="button"
                                                                    title={`สลิป: ${slipCount} ไฟล์`}
                                                                    onClick={() => t.slip_attachments && showAttachments(t, t.slip_attachments, 'slip_attachments')}
                                                                    className="px-2 py-1 text-xs rounded-full border bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100"
                                                                >
                                                                    💳 {slipCount}
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-1 text-xs rounded-full border bg-gray-100 text-gray-500 border-gray-200">💳 0</span>
                                                            )}

                                                            {/* Document */}
                                                            {docCount > 0 ? (
                                                                <span
                                                                    role="button"
                                                                    title={`เอกสาร: ${docCount} ไฟล์`}
                                                                    onClick={() => t.document_attachments && showAttachments(t, t.document_attachments, 'document_attachments')}
                                                                    className="px-2 py-1 text-xs rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer hover:bg-emerald-100"
                                                                >
                                                                    📄 {docCount}
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-1 text-xs rounded-full border bg-gray-100 text-gray-500 border-gray-200">📄 0</span>
                                                            )}

                                                            {/* WHT Certificate - แสดงเฉพาะเมื่อมี WHT */}
                                                            {hasWHT && (
                                                                whtCount > 0 ? (
                                                                    <span
                                                                        role="button"
                                                                        title="หนังสือรับรองหัก ณ ที่จ่าย"
                                                                        onClick={() => t.wht_certificate_attachment && showAttachments(t, [t.wht_certificate_attachment], 'document_attachments')}
                                                                        className="px-2 py-1 text-xs rounded-full border bg-purple-50 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-100"
                                                                    >
                                                                        📋 WHT
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-1 text-xs rounded-full border bg-gray-100 text-gray-500 border-gray-200">📋 WHT</span>
                                                                )
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        
                                        {/* วันที่ */}
                                        <td className="px-4 py-3 text-sm text-center">
                                            {t.date.toLocaleDateString('th-TH', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        
                                        {/* ยอดรวม */}
                                        <td className={`px-4 py-3 text-sm font-semibold text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                        
                                        {/* การจัดการ */}
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button size="sm" onClick={() => setActionModalTx(t)}>จัดการ</Button>
                                                <ActionMenu onCopy={() => handleCopy(t)} onCancel={() => handleCancelTransactionById(t.id)} canCancel={t.status !== 'ยกเลิก'} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                            </tbody>
                        </table>
                        
                        {/* Summary moved to the top */}
                    </div>
                ) : (
                    <TransactionKanbanView transactions={finalFilteredTransactions} statuses={pageConfig.kanbanStatuses} onManage={setActionModalTx} />
                )}
            </Card>
            
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={aiInitialData ? "ตรวจสอบข้อมูลจาก AI" : pageConfig.addButtonLabel} size="5xl">
                <TransactionForm 
                    businessId={businessId} 
                    onSave={(data) => { handleSaveNewTransaction(data); }} 
                    onClose={() => setIsAddModalOpen(false)} 
                    categories={categories} 
                    transactionType={pageConfig.formType}
                    initialData={aiInitialData || undefined}
                />
            </Modal>
            
            {actionModalTx && (
                 <TransactionActionModal 
                    isOpen={!!actionModalTx}
                    onClose={() => setActionModalTx(null)}
                    transaction={actionModalTx}
                    onSaveDetails={handleSaveDetails}
                    onUploadFile={handleFileUpload}
                    onDeleteFile={handleDeleteFile}
                    onSkipSlip={handleSkipSlip}
                    onRevertStatus={handleRevertStatus}
                    onAdvanceStatus={handleAdvanceStatus}
                    onCancelTransaction={handleCancelTransaction}
                    categories={categories}
                    businessId={businessId}
                    onDataRefresh={() => refreshActionModal(actionModalTx.id)}
                 />
            )}

            <AiUploaderModal 
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                onFileUpload={handleAiUpload}
                isProcessing={isAiProcessing}
            />
            
            <ExportModal 
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExport}
                pageType={pageType}
            />

            <FileViewerModal isOpen={!!fileToView} onClose={() => setFileToView(null)} fileUrl={fileToView} />
            <Modal isOpen={!!attachmentsToShow} onClose={() => { setAttachmentsToShow(null); setAttachmentSourceTx(null); setAttachmentType(null); }} title="เอกสารแนบ">
                <div className="max-h-96 overflow-y-auto">
                    <FileListWithActions
                        files={attachmentsToShow || []}
                        onViewFile={(url) => setFileToView(url)}
                        onDeleteFile={handleDeleteAttachment}
                        title={attachmentType === 'slip_attachments' ? 'สลิปการโอนเงิน' : 'เอกสารประกอบ'}
                    />
                </div>
            </Modal>
        </div>
    );
}
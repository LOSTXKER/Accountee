// src/components/sales/document/DocumentHeader.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { SalesDoc, DocumentStatus } from '@/types';
import { canRecordPayment, hasLinkedInvoice, hasLinkedReceipt } from '@/lib/sales/rules';
import { Edit, Printer, ChevronDown, CheckCircle, FileX, CalendarCheck, Send, Trash2, Loader2, Save, Receipt as ReceiptIcon, PlusCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';

interface DocumentHeaderProps {
    mode: 'view' | 'edit' | 'new';
    docData: SalesDoc | null;
    isSubmitting: boolean;
    isLocked: boolean;
    isVoid: boolean;
    docType: SalesDoc['type'];
    sourceDocId: string | null;
    businessId?: string; // added for next-CTA links
    onEdit: () => void;
    onSave: (statusOverride?: DocumentStatus) => void;
    onCancel: () => void;
    onPrint: () => void;
    onStatusChange: (status: DocumentStatus) => void;
    onAcceptQuotation: (acceptanceDate: string) => void;
    onRecordPayment: () => void;
    onVoidDocument: () => void;
    onDelete: () => void;
}

export default function DocumentHeader({
    mode, docData, isSubmitting, isLocked, isVoid, docType, sourceDocId, businessId,
    onEdit, onSave, onCancel, onPrint, onStatusChange,
    onAcceptQuotation, onRecordPayment, onVoidDocument, onDelete
}: DocumentHeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
    const [acceptanceDate, setAcceptanceDate] = useState(new Date().toISOString().split('T')[0]);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    const getPageTitle = () => {
        const action = mode === 'new' ? 'สร้าง' : mode === 'edit' ? 'แก้ไข' : '';
        
        let docName = '';
        switch (docType) {
            case 'quotation': docName = 'ใบเสนอราคา'; break;
            case 'invoice': docName = 'ใบแจ้งหนี้'; break;
            case 'receipt': docName = 'ใบเสร็จรับเงิน'; break;
            case 'proforma': docName = 'ใบแจ้งหนี้เบื้องต้น'; break;
            default: docName = 'เอกสาร'; break;
        }

        return `${action} ${docName}`.trim();
    };

    const renderPrimaryAction = () => {
        if (mode !== 'view' || !docData) return null;

        const { type, status } = docData;
        if ((type === 'quotation' || type === 'proforma') && (status === 'รอตอบรับ')) {
            return <Button onClick={() => setIsAcceptModalOpen(true)}><CalendarCheck size={16} className="mr-2" /> ลูกค้ายอมรับ</Button>;
        }
        if (type === 'invoice') {
            const canRecord = canRecordPayment(status);
            if (canRecord) {
                return <Button onClick={onRecordPayment}><ReceiptIcon size={16} className="mr-2" /> บันทึกการรับชำระ</Button>;
            }
        }
        return null;
    };

    // Compute "Create next document" CTA: show only when conditions are met and no linked next-doc exists
    const renderCreateNextCta = () => {
        if (mode !== 'view' || !docData || isVoid || !businessId) return null;
        const type = docData.type;
        const status = docData.status;
        if (type === 'quotation') {
            const accepted = status === 'ยอมรับแล้ว';
            const linked = hasLinkedInvoice(docData);
            if (accepted && !linked) {
                const href = `/dashboard/${businessId}/sales/new?type=invoice&fromQuotationId=${docData.id}`;
                return (
                    <Link href={href} className="inline-flex">
                        <Button>
                            <PlusCircle size={16} className="mr-2" /> สร้างใบแจ้งหนี้
                        </Button>
                    </Link>
                );
            }
        }
        if (type === 'invoice') {
            const paid = status === 'ชำระแล้ว' || status === 'สมบูรณ์';
            const linked = hasLinkedReceipt(docData);
            if (paid && !linked) {
                const href = `/dashboard/${businessId}/sales/new?type=receipt&fromInvoiceId=${docData.id}`;
                return (
                    <Link href={href} className="inline-flex">
                        <Button>
                            <PlusCircle size={16} className="mr-2" /> สร้างใบเสร็จรับเงิน
                        </Button>
                    </Link>
                );
            }
        }
        return null;
    };

    const handleAccept = () => {
        onAcceptQuotation(acceptanceDate);
        setIsAcceptModalOpen(false);
    }

    return (
        <>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{getPageTitle()}</h1>
                    {docData && mode === 'view' && (
                        <p className="text-slate-500">
                            เลขที่: {(docData as any).docnumber || (docData as any).doc_number || '-'}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    {mode === 'view' ? (
                        <>
                            {renderPrimaryAction()}
                            {renderCreateNextCta()}
                            <Button variant="secondary" onClick={onEdit} disabled={!!(isVoid || isLocked)}><Edit size={16} className="mr-2" /> แก้ไข</Button>
                            <Button variant="secondary" onClick={onPrint}><Printer size={16} className="mr-2" /> พิมพ์</Button>
                            <div className="relative z-20" ref={menuRef}>
                                <Button variant="secondary" onClick={() => setIsMenuOpen(!isMenuOpen)}>เพิ่มเติม <ChevronDown size={16} className="ml-2" /></Button>
                                {isMenuOpen && docData && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border">
                                        {docData.status === 'ฉบับร่าง' && (<button onClick={() => { onStatusChange('รอตอบรับ'); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><Send size={14} /> ส่งให้ลูกค้า</button>)}
                                        {!isVoid && !isLocked && (<button onClick={() => { onVoidDocument(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"><FileX size={14} /> ยกเลิกเอกสาร</button>)}
                                        {/* ลบถาวรถูกปิดใช้งานตามนโยบายใหม่ */}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>ยกเลิก</Button>
                            <Button variant="secondary" onClick={() => onSave('ฉบับร่าง')} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={16} className="mr-2" />} บันทึกเป็นฉบับร่าง
                            </Button>
                            <Button onClick={() => onSave()} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                                {mode === 'edit' ? `บันทึกการแก้ไข` : `สร้าง${docType === 'receipt' ? 'ใบเสร็จ' : docType === 'invoice' ? 'ใบแจ้งหนี้' : 'ใบเสนอราคา'}`}
                            </Button>
                        </>
                    )}
                </div>
            </div>
            <Modal isOpen={isAcceptModalOpen} onClose={() => setIsAcceptModalOpen(false)} title="บันทึกการยอมรับใบเสนอราคา">
                <div className="space-y-4">
                    <p>กรุณาระบุวันที่ลูกค้าตอบรับใบเสนอราคานี้</p>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">วันที่ยอมรับ</label><Input type="date" value={acceptanceDate} onChange={e => setAcceptanceDate(e.target.value)} required /></div>
                </div>
                <div className="flex justify-end gap-3 pt-6 mt-4 border-t"><Button type="button" variant="secondary" onClick={() => setIsAcceptModalOpen(false)}>ยกเลิก</Button><Button type="button" onClick={handleAccept}>บันทึกลูกค้ายอมรับ</Button></div>
            </Modal>
        </>
    );
}
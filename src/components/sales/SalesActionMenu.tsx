// src/components/sales/SalesActionMenu.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MoreVertical, Edit, Printer, Copy, Trash2, FileX } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SalesDoc, Quotation } from '@/types';

interface SalesActionMenuProps {
  doc: SalesDoc;
  businessId: string;
  onDelete?: () => void;
}

export default function SalesActionMenu({ doc, businessId, onDelete }: SalesActionMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const menuWidth = 192; // w-48
    const router = useRouter();
    const supabase = createClient();

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

    const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
        setIsOpen(false);
    };

    const handleEdit = () => router.push(`/dashboard/${businessId}/sales/${doc.id}`);
    const handlePrint = () => window.open(`/dashboard/${businessId}/sales/print/${doc.id}`, '_blank');
    const handleDuplicate = () => {
        const newDocType = doc.type === 'quotation' || doc.type === 'proforma' ? 'quotation' : 'invoice';
        router.push(`/dashboard/${businessId}/sales/new?fromDocId=${doc.id}&type=${newDocType}`);
    }

    const handleDelete = async () => {
        if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารเลขที่ ${doc.doc_number}? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            try {
                const { error } = await supabase.from('sales_documents').delete().eq('id', doc.id);
                if (error) throw error;
                if (onDelete) onDelete();
                // Optionally, navigate away or show a success message
                router.refresh(); // Refresh the page to show the updated list
            } catch (error) {
                console.error("Error deleting document:", error);
                alert("เกิดข้อผิดพลาดในการลบเอกสาร");
            }
        }
    };

    const handleVoid = () => {
        // This should probably open a modal to confirm voiding, but for now, let's navigate
        router.push(`/dashboard/${businessId}/sales/${doc.id}?action=void`);
    }
    
    const isLocked = (doc.type === 'quotation' && !!(doc as Quotation).converted_to_invoice_id) || doc.status === 'ชำระแล้ว' || doc.status === 'ยกเลิก';

    const menu = isOpen ? (
        <div
            ref={menuRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: menuWidth }}
            className="origin-top-right mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[9999]"
        >
            <div className="py-1">
                <button onClick={(e) => handleAction(e, handleEdit)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                    <Edit size={14} /> แก้ไข / ดู
                </button>
                <button onClick={(e) => handleAction(e, handlePrint)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                    <Printer size={14} /> พิมพ์
                </button>
                <button onClick={(e) => handleAction(e, handleDuplicate)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                    <Copy size={14} /> สร้างซ้ำ
                </button>
                 {!isLocked && (
                    <button onClick={(e) => handleAction(e, handleVoid)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50">
                        <FileX size={14} /> ยกเลิกเอกสาร
                    </button>
                )}
                {!isLocked && (
                    <button onClick={(e) => handleAction(e, handleDelete)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <Trash2 size={14} /> ลบ
                    </button>
                )}
            </div>
        </div>
    ) : null;

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="p-2 rounded-md hover:bg-slate-200"
            >
                <MoreVertical size={16} />
            </button>
            {isOpen && typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
        </div>
    );
}
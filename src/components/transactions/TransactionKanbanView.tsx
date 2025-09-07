// src/components/transactions/TransactionKanbanView.tsx
"use client";

import React, { useMemo } from 'react'; // --- ⭐ [แก้ไข] เพิ่ม useMemo ---
import { Transaction, TransactionStatus } from "@/types";
import TransactionStatusBadge from "./TransactionStatusBadge";

type ClientTransaction = Transaction & { date: Date };

const KanbanCard = ({ tx, onManage }: { tx: ClientTransaction; onManage: (tx: ClientTransaction) => void }) => {
    const contactMatch = tx.description.match(/\(คู่ค้า:\s*([^\)]+)\)/);
    const refMatch = tx.description.match(/\(อ้างอิง:\s*([^\)]+)\)/);
    const base = tx.description
        .replace(/\s*\(คู่ค้า:[^\)]+\)\s*/g, '')
        .replace(/\s*\(อ้างอิง:[^\)]+\)\s*/g, '')
        .trim();
    const contact = contactMatch?.[1]?.trim() || '';
    const reference = refMatch?.[1]?.trim() || '';
    return (
        <div onClick={() => onManage(tx)} className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md cursor-pointer transition-shadow space-y-2">
            <div className="flex justify-between items-start gap-2">
                <div className="w-4/5">
                    <p className="font-semibold text-slate-800 text-sm break-words">{contact || base || '—'}</p>
                    {base && contact && (
                        <p className="text-xs text-slate-500 mt-0.5 break-words">{base}</p>
                    )}
                    {reference && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">อ้างอิง: {reference}</span>
                    )}
                </div>
                <TransactionStatusBadge status={tx.status} />
            </div>
            <p className="text-xs text-slate-500">{tx.category}</p>
                    <div className="flex justify-between items-end pt-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Slip label: always show */}
                            {(() => {
                                const slipCount = (tx.slip_attachments?.length || 0);
                                return slipCount > 0 ? (
                                    <span
                                        title={`สลิป: ${slipCount} ไฟล์`}
                                        className="px-2 py-0.5 text-[11px] rounded-full border bg-blue-50 text-blue-700 border-blue-200 cursor-default"
                                    >
                                        สลิป {slipCount}
                                    </span>
                                ) : (
                                    <span
                                        title="ยังไม่มีสลิปที่อัปโหลด"
                                        className="px-2 py-0.5 text-[11px] rounded-full border bg-gray-100 text-gray-500 border-gray-200 cursor-default"
                                    >
                                        สลิป (0)
                                    </span>
                                );
                            })()}

                            {/* Document label: always show; with parentheses */}
                            {(() => {
                                const docCount = (tx.document_attachments?.length || 0);
                                return docCount > 0 ? (
                                    <span
                                        title={`เอกสาร: ${docCount} ไฟล์`}
                                        className="px-2 py-0.5 text-[11px] rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default"
                                    >
                                        เอกสาร ({docCount})
                                    </span>
                                ) : (
                                    <span
                                        title="ยังไม่มีเอกสารที่อัปโหลด"
                                        className="px-2 py-0.5 text-[11px] rounded-full border bg-gray-100 text-gray-500 border-gray-200 cursor-default"
                                    >
                                        เอกสาร (0)
                                    </span>
                                );
                            })()}

                            {/* WHT label: for income board, show only if tx has WHT; otherwise hide. For expense, keep visible. */}
                            {((tx.type === 'income' && (tx.withholdingtax ?? 0) > 0) || tx.type !== 'income') && (
                                tx.wht_certificate_attachment ? (
                                    <span
                                        title="หนังสือรับรอง หัก ณ ที่จ่าย"
                                        className="px-2 py-0.5 text-[11px] rounded-full border bg-violet-50 text-violet-700 border-violet-200 cursor-default"
                                    >
                                        WHT 1
                                    </span>
                                ) : (
                                    <span
                                        title="ยังไม่มีหนังสือรับรอง หัก ณ ที่จ่าย"
                                        className="px-2 py-0.5 text-[11px] rounded-full border bg-gray-100 text-gray-500 border-gray-200 cursor-default"
                                    >
                                        WHT (0)
                                    </span>
                                )
                            )}
                        </div>
                        <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
        </div>
    );
};

const KanbanColumn = ({ title, transactions, onManage }: { title: string; transactions: ClientTransaction[]; onManage: (tx: ClientTransaction) => void }) => {
    return (
        <div className="bg-slate-50 rounded-lg p-3 flex-1 min-w-[300px]">
            <h3 className="font-bold text-slate-700 px-2 pb-3">{title} ({transactions.length})</h3>
            <div className="space-y-3 overflow-y-auto h-[calc(100vh-300px)]">
                {transactions.map(tx => (
                    <KanbanCard key={tx.id} tx={tx} onManage={onManage} />
                ))}
            </div>
        </div>
    );
};

interface TransactionKanbanViewProps {
    transactions: ClientTransaction[];
    statuses: TransactionStatus[];
    onManage: (tx: ClientTransaction) => void;
}

export default function TransactionKanbanView({ transactions, statuses, onManage }: TransactionKanbanViewProps) {
    const columns = useMemo(() => {
        return statuses.map(status => ({
            title: status,
            transactions: transactions.filter(tx => tx.status === status),
        }));
    }, [transactions, statuses]);

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {/* --- ⭐ [แก้ไข] กำหนด Type ของ col --- */}
            {columns.map((col: { title: string; transactions: ClientTransaction[] }) => (
                <KanbanColumn key={col.title} title={col.title} transactions={col.transactions} onManage={onManage} />
            ))}
        </div>
    );
}
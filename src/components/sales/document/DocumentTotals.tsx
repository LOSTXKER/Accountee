// src/components/sales/document/DocumentTotals.tsx
"use client";

import React from 'react';
import { Input } from '@/components/ui/Input';

interface DocumentTotalsProps {
    mode: 'view' | 'edit' | 'new';
    totals: {
        subtotal: number;
        vatAmount: number;
        grandTotal: number;
    };
    discountAmount: number;
    setDiscountAmount: (value: number) => void;
    withholdingTaxAmount: number;
    setWithholdingTaxAmount: (value: number) => void;
    vatRate: number;
}

export default function DocumentTotals({
    mode, totals, discountAmount, setDiscountAmount,
    withholdingTaxAmount, setWithholdingTaxAmount, vatRate
}: DocumentTotalsProps) {
    
    return (
        <div className="flex justify-end pt-4">
            <div className="w-full max-w-sm space-y-2 text-sm">
                <div className="flex justify-between">
                    <span>รวมเป็นเงิน:</span>
                    <span>{totals.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span>ส่วนลด:</span>
                    {mode === 'view' ? (
                        <span>- {(discountAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    ) : (
                        <Input
                            type="number"
                            value={discountAmount || ''}
                            onChange={e => setDiscountAmount(Number(e.target.value))}
                            className="w-32 text-right"
                            placeholder="0.00"
                        />
                    )}
                </div>
                <div className="flex justify-between">
                    <span>ยอดหลังหักส่วนลด:</span>
                    <span>{(totals.subtotal - discountAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                    <span>ภาษีมูลค่าเพิ่ม ({vatRate}%):</span>
                    <span>{totals.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                    <span>ยอดรวม:</span>
                    <span>{(totals.subtotal - discountAmount + totals.vatAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span>หัก ณ ที่จ่าย:</span>
                    {mode === 'view' ? (
                        <span className="text-red-600">- {(withholdingTaxAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    ) : (
                        <Input
                            type="number"
                            value={withholdingTaxAmount || ''}
                            onChange={e => setWithholdingTaxAmount(Number(e.target.value))}
                            className="w-32 text-right"
                            placeholder="0.00"
                        />
                    )}
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                    <span>ยอดชำระ:</span>
                    <span>{totals.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>
    );
}
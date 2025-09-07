// src/components/transactions/TransactionTypeModal.tsx
"use client";

import React from 'react';
import Modal from "@/components/ui/Modal";
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TransactionTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'income' | 'expense') => void;
}

export default function TransactionTypeModal({ isOpen, onClose, onSelect }: TransactionTypeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="เลือกประเภทรายการ">
      <div className="space-y-4 text-center">
        <p className="text-slate-600">คุณต้องการบันทึกรายการประเภทใดด้วย AI?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          
          {/* ปุ่มรายรับ */}
          <button
            onClick={() => onSelect('income')}
            className="flex flex-col items-center justify-center p-6 bg-green-50 border-2 border-green-200 rounded-lg text-green-700 hover:bg-green-100 hover:border-green-300 transition-all"
          >
            <TrendingUp size={28} />
            <span className="font-bold text-lg mt-2">รายรับ</span>
          </button>

          {/* ปุ่มรายจ่าย */}
          <button
            onClick={() => onSelect('expense')}
            className="flex flex-col items-center justify-center p-6 bg-amber-50 border-2 border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all"
          >
            <TrendingDown size={28} />
            <span className="font-bold text-lg mt-2">รายจ่าย</span>
          </button>

        </div>
      </div>
    </Modal>
  );
}
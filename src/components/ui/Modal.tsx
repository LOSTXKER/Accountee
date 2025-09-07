// src/components/ui/Modal.tsx
"use client";

import { X } from 'lucide-react';
import React from 'react';
import Portal from './Portal'; // ✅ 1. Import Portal เข้ามา

type ModalSize = 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: ModalSize;
}

const sizeClasses: Record<ModalSize, string> = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
};

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  // ✅ 2. นำ <Portal> มาครอบโค้ดทั้งหมดของ Modal
  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black/60 z-50 overflow-y-auto p-4 flex justify-center items-start pt-10 pb-10"
        onClick={onClose}
      >
        <div
          className={`bg-white rounded-xl shadow-xl w-full flex flex-col max-h-[90vh] ${sizeClasses[size]}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          
          <div className="overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
}
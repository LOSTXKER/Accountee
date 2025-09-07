// src/components/transactions/AiUploaderModal.tsx
"use client";

import { useState, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { UploadCloud, Loader2 } from 'lucide-react';
import { Input } from '../ui/Input';

interface AiUploaderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFileUpload: (file: File) => void;
    isProcessing: boolean;
}

export default function AiUploaderModal({ isOpen, onClose, onFileUpload, isProcessing }: AiUploaderModalProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (files: FileList | null) => {
        if (files && files.length > 0) {
            onFileUpload(files[0]);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="เพิ่มรายการด้วย AI อัจฉริยะ">
            <div className="p-4 text-center">
                {isProcessing ? (
                    <div className="flex flex-col items-center justify-center h-48">
                        <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
                        <p className="mt-4 text-slate-600 font-semibold">AI กำลังอ่านข้อมูลจากสลิป...</p>
                        <p className="text-sm text-slate-500">กรุณารอสักครู่</p>
                    </div>
                ) : (
                    <div
                        onClick={() => inputRef.current?.click()}
                        className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-brand-500 bg-slate-50 transition-colors"
                    >
                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-semibold text-slate-800">อัปโหลดสลิป / ใบเสร็จ</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            ให้ AI ช่วยอ่านข้อมูลและกรอกรายละเอียดให้คุณโดยอัตโนมัติ
                        </p>
                        <Input
                            type="file"
                            ref={inputRef}
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={(e) => handleFileSelect(e.target.files)}
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
}
// src/components/transactions/TransactionActionModal.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Transaction, Category, TransactionStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import TransactionForm from './TransactionForm';
import { UploadCloud, CheckCircle, RotateCcw, FileText, Clock, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '../ui/Input';
import WhtVendorModal from './WhtVendorModal';
import FileListWithActions from '../ui/FileListWithActions';

const MAX_FILE_SIZE_MB = 5;

const Step = ({ title, status, onClick, isClickable }: { title: string, status: 'complete' | 'current' | 'upcoming', onClick?: () => void, isClickable?: boolean }) => {
    const statusClasses = {
        complete: isClickable ? 'bg-green-600 border-green-600 text-white cursor-pointer hover:bg-green-700' : 'bg-green-600 border-green-600 text-white',
        current: 'border-brand-600 text-brand-600 animate-blink',
        upcoming: 'border-slate-300 text-slate-400',
    };
    const textClasses = {
        complete: isClickable ? 'text-green-700 cursor-pointer' : 'text-green-700',
        current: 'text-brand-700 font-bold',
        upcoming: 'text-slate-400',
    }
    return (
        <div className="flex flex-col items-center text-center w-24" onClick={isClickable ? onClick : undefined}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold flex-shrink-0 ${statusClasses[status]}`}>
                {status === 'complete' ? <CheckCircle size={18} /> : <span></span>}
            </div>
            <span className={`mt-2 text-xs font-semibold ${textClasses[status]}`}>{title}</span>
        </div>
    );
};

const FileUploader = ({ onFileSelect, title, description, onSkip, existingFiles, onViewFile, onDeleteFile, fileType, isActionable }: { 
    onFileSelect: (file: File) => void, 
    title: string, 
    description: string, 
    onSkip?: () => void,
    existingFiles?: any[],
    onViewFile?: (url: string) => void,
    onDeleteFile?: (file: any, fileType: 'slip' | 'document' | 'wht') => Promise<void>,
    fileType: 'slip' | 'document' | 'wht',
    isActionable: boolean;
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    
    if (existingFiles && existingFiles.length > 0) {
        return (
            <div>
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg mb-2">{title}</h3>
                        <p className="text-slate-600 mb-4">{description}</p>
                    </div>
                </div>
                
                <div className="space-y-3 mb-4">
                    <FileListWithActions
                        files={existingFiles}
                        onViewFile={onViewFile}
                        onDeleteFile={(file) => onDeleteFile ? onDeleteFile(file, fileType) : Promise.resolve()}
                        showActions={isActionable}
                    />
                </div>
                
                {isActionable && (
                  <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-400 bg-green-50 transition-colors">
                      <UploadCloud className="mx-auto h-8 w-8 text-green-400" />
                      <p className="text-sm font-medium text-green-600 mb-1">อัปโหลดไฟล์เพิ่มเติม</p>
                      <p className="text-xs text-green-500">ขนาดสูงสุด {MAX_FILE_SIZE_MB}MB</p>
                  </div>
                )}
                <Input type="file" ref={inputRef} className="hidden" onChange={(e) => e.target.files && e.target.files.length > 0 && onFileSelect(e.target.files[0])} />
            </div>
        );
    }
    
    return (
        <div>
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg mb-2">{title}</h3>
                    <p className="text-slate-600 mb-4">{description}</p>
                </div>
                {onSkip && (
                    <Button variant="secondary" size="sm" onClick={onSkip}>ข้ามขั้นตอนนี้</Button>
                )}
            </div>
            <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-brand-500 bg-slate-50 transition-colors">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">คลิกเพื่อเลือกไฟล์</p>
                <p className="text-xs text-gray-500">ขนาดสูงสุด {MAX_FILE_SIZE_MB}MB</p>
                <Input type="file" ref={inputRef} className="hidden" onChange={(e) => e.target.files && e.target.files.length > 0 && onFileSelect(e.target.files[0])} />
            </div>
        </div>
    );
};

interface TransactionActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Partial<Transaction> | null;
    onSaveDetails: (data: Partial<Transaction>) => void;
    onUploadFile: (file: File, type: 'slip' | 'document' | 'wht') => void;
    onDeleteFile: (file: any, type: 'slip' | 'document' | 'wht') => Promise<void>;
    onSkipSlip: () => void;
    onRevertStatus: () => void;
    onAdvanceStatus: () => void;
    categories: Category[];
    businessId: string;
    onDataRefresh: () => void;
    hideModal?: boolean;
    onCancelTransaction?: () => void;
}

export default function TransactionActionModal({
    isOpen, onClose, transaction, onSaveDetails, onUploadFile, onSkipSlip, onRevertStatus, categories, businessId, onDataRefresh, hideModal = false, onDeleteFile, onAdvanceStatus, onCancelTransaction
}: TransactionActionModalProps) {

    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isWhtModalOpen, setIsWhtModalOpen] = useState(false);
    const manualUploadRef = useRef<HTMLInputElement>(null);

    if (!isOpen || !transaction) return null;

    const { status, type, withholdingtax } = transaction;
    const hasWHT = (withholdingtax ?? 0) > 0;

    const getSteps = (): TransactionStatus[] => {
        if (type === 'income') {
            const incomeSteps: TransactionStatus[] = ['รอรับเงิน'];
            if (hasWHT) incomeSteps.push('รอรับ หัก ณ ที่จ่าย');
            incomeSteps.push('เสร็จสมบูรณ์');
            return incomeSteps;
        }
        const expenseSteps: TransactionStatus[] = ['รอชำระ', 'รอเอกสาร'];
        if (hasWHT) expenseSteps.push('รอส่ง หัก ณ ที่จ่าย');
        expenseSteps.push('เสร็จสมบูรณ์');
        return expenseSteps;
    };

    const steps = getSteps();
    const currentStepIndex = status ? steps.indexOf(status) : 0;
    
    const [currentStep, setCurrentStep] = useState(currentStepIndex);

    useEffect(() => {
        setCurrentStep(currentStepIndex);
    }, [currentStepIndex]);

    const isFirstStep = currentStepIndex <= 0;
    const isLastStep = currentStepIndex >= steps.length - 1;

    const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUploadFile(e.target.files[0], 'wht');
        }
    };

    const handleStepClick = (stepIndex: number) => {
        if (stepIndex <= currentStepIndex) {
            setCurrentStep(stepIndex);
        }
    };

    const content = (
        <div className="space-y-6">
            <div className="flex justify-between items-start p-4">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const isClickable = isCompleted || isCurrent;
                    
                    return (
                        <React.Fragment key={step}>
                            <Step 
                                title={step} 
                                status={
                                    status === 'เสร็จสมบูรณ์' ? 'complete' :
                                    index < currentStepIndex ? 'complete' : 
                                    index === currentStepIndex ? 'current' : 
                                    'upcoming'
                                }
                                onClick={() => handleStepClick(index)}
                                isClickable={isClickable}
                            />
                            {index < steps.length - 1 && <div className="flex-1 h-px bg-slate-300 mx-2 mt-4"></div>}
                        </React.Fragment>
                    );
                })}
            </div>
            
            <div>
                {(() => {
                    // If transaction already canceled, show locked state
                    if (status === 'ยกเลิก') {
                        return (
                            <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
                                <CheckCircle className="mx-auto h-16 w-16 text-red-500" />
                                <h3 className="font-bold text-xl mt-4 text-red-700">รายการนี้ถูกยกเลิกแล้ว</h3>
                                <p className="text-slate-600 mt-2">ไม่สามารถดำเนินการใดๆ เพิ่มเติมได้</p>
                            </div>
                        );
                    }
                    // Show action area based on currentStep, not actual transaction status
                    const stepTitle = steps[currentStep];
                    if (!stepTitle) return null;

                    const isActionable = currentStep === currentStepIndex;
                    
                    if (stepTitle === 'เสร็จสมบูรณ์' || stepTitle === 'ยกเลิก') {
                        return (
                            <div className="text-center p-8 bg-green-50 rounded-lg">
                                <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                                <h3 className="font-bold text-xl mt-4">{stepTitle === 'ยกเลิก' ? 'รายการนี้ถูกยกเลิก' : 'รายการนี้เสร็จสมบูรณ์แล้ว'}</h3>
                                <p className="text-slate-600 mt-2">ไม่จำเป็นต้องดำเนินการใดๆ เพิ่มเติม</p>
                            </div>
                        );
                    }
                    
                    if (stepTitle.includes('รอรับเงิน') || stepTitle.includes('รอชำระ')) {
                        return (
                            <FileUploader
                                onFileSelect={(file) => onUploadFile(file, 'slip')}
                                title="อัปโหลดสลิปการโอนเงิน"
                                description="กรุณาอัปโหลดสลิปการโอนเงิน หรือหลักฐานการรับ/จ่ายเงิน (ข้ามได้)"
                                onSkip={onSkipSlip}
                                existingFiles={transaction.slip_attachments}
                                onViewFile={(url: string) => {
                                    // Handle viewing file - you can add this to props if needed
                                    window.open(url, '_blank');
                                }}
                                onDeleteFile={onDeleteFile}
                                fileType="slip"
                                isActionable={isActionable}
                            />
                        );
                    }
                    
                    if (stepTitle.includes('รอเอกสาร')) {
                        return (
                            <FileUploader
                                onFileSelect={(file) => onUploadFile(file, 'document')}
                                title="อัปโหลดเอกสารประกอบ"
                                description="กรุณาอัปโหลดใบกำกับภาษี หรือเอกสารประกอบอื่นๆ"
                                existingFiles={transaction.document_attachments}
                                onViewFile={(url: string) => {
                                    window.open(url, '_blank');
                                }}
                                onDeleteFile={onDeleteFile}
                                fileType="document"
                                isActionable={isActionable}
                            />
                        );
                    }
                    
                    if (stepTitle.includes('หัก ณ ที่จ่าย')) {
                        return (
                            <div className="space-y-4">
                                <FileUploader
                                    onFileSelect={(file) => onUploadFile(file, 'wht')}
                                    title="อัปโหลดหนังสือรับรอง หัก ณ ที่จ่าย"
                                    description="กรุณาอัปโหลดหนังสือรับรองการหักภาษี ณ ที่จ่าย"
                                    existingFiles={transaction.wht_certificate_attachment ? [transaction.wht_certificate_attachment] : []}
                                    onViewFile={(url: string) => {
                                        window.open(url, '_blank');
                                    }}
                                    onDeleteFile={onDeleteFile}
                                    fileType="wht"
                                    isActionable={isActionable}
                                />
                                <div className="text-center">
                                    <Button variant="secondary" onClick={() => setIsWhtModalOpen(true)}>
                                        <FileText size={16} className="mr-2" />
                                        สร้างหนังสือรับรอง หัก ณ ที่จ่าย
                                    </Button>
                                </div>
                            </div>
                        );
                    }
                    
                    return null;
                })()}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="secondary" onClick={onRevertStatus} disabled={isFirstStep}>
                    <ChevronLeft size={16} className="mr-2" />
                    ย้อนกลับ
                </Button>
                <div className="flex items-center gap-2">
                    {onCancelTransaction && status !== 'ยกเลิก' && (
                        <Button
                            variant="danger"
                            onClick={onCancelTransaction}
                        >
                            ยกเลิกรายการ
                        </Button>
                    )}
                    <Button variant="primary" onClick={onAdvanceStatus} disabled={isLastStep || status === 'ยกเลิก'}>
                        ต่อไป
                        <ChevronRight size={16} className="ml-2" />
                    </Button>
                </div>
            </div>

            <div>
                <details className={`bg-white rounded-lg border ${status === 'ยกเลิก' ? 'opacity-75' : ''}`} onToggle={(e) => setIsDetailsOpen((e.target as HTMLDetailsElement).open)}>
                    <summary className={`p-4 font-semibold rounded-lg ${status === 'ยกเลิก' ? 'cursor-default text-slate-500' : 'cursor-pointer text-slate-700 hover:bg-slate-50'}`}>
                       {isDetailsOpen ? (status === 'ยกเลิก' ? 'รายละเอียด' : 'ซ่อนรายละเอียด') : (status === 'ยกเลิก' ? 'รายละเอียด' : 'แสดง/แก้ไขรายละเอียด')}
                    </summary>
                    <div className="p-4 border-t">
                        <TransactionForm 
                            businessId={businessId}
                            onSave={(data) => { onSaveDetails(data); onClose(); }}
                            onClose={() => { const summary = document.querySelector('details summary'); if(summary) (summary as HTMLElement).click(); }}
                            categories={categories}
                            transactionType={type as 'income' | 'expense'}
                            transactionToEdit={transaction}
                            isEditOnly={true}
                            isReadOnly={status === 'ยกเลิก'}
                        />
                    </div>
                </details>
            </div>
        </div>
    );

    // Build a clean title: prefer contact name, else base description, and hide '(คู่ค้า: ...)' label
    const buildTitle = () => {
        const desc = transaction.description || '';
        const contactMatch = desc.match(/\(คู่ค้า:\s*([^\)]+)\)/);
        const base = desc
            .replace(/\s*\(คู่ค้า:[^\)]*\)\s*/g, '')
            .replace(/\s*\(อ้างอิง:[^\)]*\)\s*/g, '')
            .trim();
        const contact = contactMatch?.[1] || '';
        return contact || base || 'รายการ';
    };

    return (
        <>
            {hideModal ? (
                content
            ) : (
                <Modal isOpen={isOpen} onClose={onClose} title={`จัดการรายการ: ${buildTitle()}`} size="3xl">
                    {content}
                </Modal>
            )}
            
            <WhtVendorModal 
                isOpen={isWhtModalOpen}
                onClose={() => setIsWhtModalOpen(false)}
                businessId={businessId}
                transaction={transaction}
                onCertificateCreated={() => {
                    onDataRefresh();
                }}
            />
        </>
    );
}

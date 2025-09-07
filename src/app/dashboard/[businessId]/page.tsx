"use client";

import React, { useState, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Transaction } from '@/types';

import { useDashboardStats } from '@/hooks/useDashboardStats';

import KpiCard from '@/components/dashboard/KpiCard';
import DashboardChart from '@/components/dashboard/DashboardChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import TransactionForm from '@/components/transactions/TransactionForm';
import { TrendingDown, TrendingUp, Zap, FileClock, FileX, AlertTriangle, Scale, Banknote } from 'lucide-react';
import AiUploaderModal from '@/components/transactions/AiUploaderModal';
import TransactionTypeModal from '@/components/transactions/TransactionTypeModal';

interface ClickableKpiCardProps {
    href: string;
    children: ReactNode;
}

const ClickableKpiCard = ({ href, children }: ClickableKpiCardProps) => {
    const router = useRouter();
    return (
        <div onClick={() => router.push(href)} className="cursor-pointer group">
            <div className="group-hover:shadow-lg group-hover:border-brand-300 transition-shadow duration-200 rounded-xl">
                {children}
            </div>
        </div>
    );
};

export default function DashboardPage() {
    const params = useParams();
    const router = useRouter();
    const businessId = params.businessId as string;
    
    const queryClient = useQueryClient();
    const supabase = createClient();
    const { data: stats, isLoading } = useDashboardStats(businessId);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formType, setFormType] = useState<'income' | 'expense'>('expense');

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiInitialData, setAiInitialData] = useState<Partial<Transaction> | null>(null);

    const [isTypeSelectionModalOpen, setIsTypeSelectionModalOpen] = useState(false);
    
    const handleOpenModal = (type: 'income' | 'expense') => {
        setAiInitialData(null); 
        setFormType(type);
        setIsModalOpen(true);
    };

    const handleSaveTransaction = async (formData: Partial<Transaction>) => {
        try {
            const dataToInsert = {
                ...formData,
                businessid: businessId,
                date: new Date(formData.date as Date).toISOString(),
                isdeleted: false,
            };
            
            const { error } = await supabase.from('transactions').insert([dataToInsert]);

            if (error) {
                throw error;
            }
            
            setIsModalOpen(false);
            setAiInitialData(null);
            // Invalidate the query to refetch dashboard stats
            await queryClient.invalidateQueries({ queryKey: ['dashboardStats', businessId] });
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาดในการบันทึกรายการ');
        }
    };

    const handleAiUpload = async (file: File) => {
        setIsAiProcessing(true);
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2000)); 
        const sampleExtractedData: Partial<Transaction> = {
            date: new Date(),
            description: `AI-Extracted: ${file.name}`,
            amount: 123.45,
            subtotal: 123.45,
            vat_type: 'none',
            type: formType,
        };

        setAiInitialData(sampleExtractedData);
        setIsAiProcessing(false);
        setIsAiModalOpen(false);
        setIsModalOpen(true); 
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><p>กำลังโหลดข้อมูลภาพรวม...</p></div>;
    }

    // Use a default empty state for stats if it's not available yet
    const safeStats = stats!;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">ภาพรวมธุรกิจ</h1>
                <div className="flex space-x-2">
                    <Button onClick={() => setIsTypeSelectionModalOpen(true)} variant="outline" className="flex items-center space-x-2">
                        <Zap size={16} />
                        <span>บันทึกด้วย AI</span>
                    </Button>
                    <Button onClick={() => handleOpenModal('expense')} variant="destructive" className="flex items-center space-x-2">
                        <TrendingDown size={16} />
                        <span>บันทึกรายจ่าย</span>
                    </Button>
                    <Button onClick={() => handleOpenModal('income')} variant="constructive" className="flex items-center space-x-2">
                        <TrendingUp size={16} />
                        <span>บันทึกรายรับ</span>
                    </Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="รายรับทั้งหมด" value={safeStats.totalRevenue} icon={TrendingUp} color="green" />
                <KpiCard title="รายจ่ายทั้งหมด" value={safeStats.totalExpenses} icon={TrendingDown} color="red" />
                <ClickableKpiCard href={`/dashboard/${businessId}/sales?status=overdue`}><KpiCard title="ลูกหนี้ค้างชำระ" value={safeStats.accountsReceivable} icon={Banknote} color="brand" /></ClickableKpiCard>
                <ClickableKpiCard href={`/dashboard/${businessId}/expenses?status=รอชำระ`}><KpiCard title="เจ้าหนี้รอจ่าย" value={safeStats.accountsPayable} icon={Scale} color="red" /></ClickableKpiCard>
                <ClickableKpiCard href={`/dashboard/${businessId}/sales?status=overdue`}><KpiCard title="ใบแจ้งหนี้เกินกำหนด" value={safeStats.overdueInvoicesCount} icon={FileClock} color="brand" isCurrency={false}/></ClickableKpiCard>
                <KpiCard title="หัก ณ ที่จ่ายต้องตาม" value={safeStats.whtToTrackCount} icon={AlertTriangle} color="brand" isCurrency={false}/>
                <ClickableKpiCard href={`/dashboard/${businessId}/expenses?status=รอเอกสาร`}><KpiCard title="รายการรอเอกสาร" value={safeStats.pendingDocumentsCount} icon={FileX} color="slate" isCurrency={false} /></ClickableKpiCard>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3"><DashboardChart data={safeStats.chartData} /></div>
                <div className="lg:col-span-2"><RecentTransactions transactions={safeStats.recentTransactions} businessId={businessId} /></div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={aiInitialData ? 'ตรวจสอบข้อมูลจาก AI' : (formType === 'income' ? 'บันทึกรายรับ' : 'บันทึกรายจ่าย')} size="5xl">
                <TransactionForm businessId={businessId} onSave={handleSaveTransaction} onClose={() => setIsModalOpen(false)} categories={safeStats.categories} transactionType={formType} initialData={aiInitialData || undefined} />
            </Modal>

            <TransactionTypeModal 
                isOpen={isTypeSelectionModalOpen}
                onClose={() => setIsTypeSelectionModalOpen(false)}
                onSelect={(type) => {
                    setFormType(type);
                    setIsTypeSelectionModalOpen(false);
                    setIsAiModalOpen(true);
                }}
            />

            <AiUploaderModal 
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                onFileUpload={handleAiUpload}
                isProcessing={isAiProcessing}
            />
        </div>
    );
}
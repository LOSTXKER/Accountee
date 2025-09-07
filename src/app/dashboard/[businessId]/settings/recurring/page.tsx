// src/app/dashboard/[businessId]/settings/recurring/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { RecurringTransaction, Category } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useParams } from 'next/navigation';
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import RecurringTransactionFormModal from "@/components/recurring/RecurringTransactionFormModal";
import { User } from "@supabase/supabase-js";

export default function RecurringPage() {
    const supabase = createClient();
    const params = useParams();
    const businessId = params.businessId as string;

    const [recurringTxs, setRecurringTxs] = useState<RecurringTransaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [txToEdit, setTxToEdit] = useState<RecurringTransaction | null>(null);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, [supabase]);

    const fetchData = useCallback(async () => {
        if (!businessId) return;
        setIsLoading(true);
        try {
            const [txsResponse, categoriesResponse] = await Promise.all([
                supabase.from('recurring_transactions').select('*').eq('businessid', businessId),
                supabase.from('categories').select('*').eq('businessid', businessId)
            ]);

            if (txsResponse.error) throw txsResponse.error;
            if (categoriesResponse.error) throw categoriesResponse.error;

            setRecurringTxs(txsResponse.data || []);
            setCategories(categoriesResponse.data || []);
        } catch (error) {
            console.error("Error fetching recurring transactions data:", error);
            alert("เกิดข้อผิดพลาดในการโหลดข้อมูล");
        } finally {
            setIsLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getCategoryName = (categoryId: string | null | undefined) => {
        if (!categoryId) return 'N/A';
        return categories.find(c => c.id === categoryId)?.name || 'ไม่พบหมวดหมู่';
    };

    const handleOpenModal = (tx: RecurringTransaction | null = null) => {
        setTxToEdit(tx);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTxToEdit(null);
    };

    const handleSave = async (txData: Partial<RecurringTransaction>) => {
        try {
            const { data, error } = await supabase
                .from('recurring_transactions')
                .upsert(txData)
                .select()
                .single();

            if (error) throw error;

            if (txToEdit) {
                setRecurringTxs(prev => prev.map(t => t.id === data.id ? data : t));
            } else {
                setRecurringTxs(prev => [...prev, data]);
            }
            handleCloseModal();
        } catch (error) {
            console.error("Error saving recurring transaction:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการที่เกิดซ้ำนี้?')) {
            try {
                const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
                if (error) throw error;
                setRecurringTxs(prev => prev.filter(t => t.id !== id));
            } catch (error) {
                console.error("Error deleting recurring transaction:", error);
                alert("เกิดข้อผิดพลาดในการลบข้อมูล");
            }
        }
    };

    const frequencyMap = {
        daily: 'รายวัน',
        weekly: 'รายสัปดาห์',
        monthly: 'รายเดือน',
        yearly: 'รายปี',
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">จัดการรายการที่เกิดซ้ำ</h2>
                <Button onClick={() => handleOpenModal()}><PlusCircle size={16} className="mr-2"/>เพิ่มรายการ</Button>
            </div>
            
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายละเอียด</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนเงิน</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมวดหมู่</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ความถี่</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
                        ) : recurringTxs.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-500">ยังไม่มีรายการที่เกิดซ้ำ</td></tr>
                        ) : (
                            recurringTxs.map(tx => (
                                <tr key={tx.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{tx.description}</div>
                                        <div className="text-xs text-gray-500">เริ่ม: {new Date(tx.start_date).toLocaleDateString('th-TH')}</div>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.amount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getCategoryName(tx.category_id)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{frequencyMap[tx.frequency]}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {tx.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleOpenModal(tx)} className="text-brand-600 hover:text-brand-900 mr-3"><Edit size={16}/></button>
                                        <button onClick={() => handleDelete(tx.id)} className="text-red-600 hover:text-red-900"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <RecurringTransactionFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                txToEdit={txToEdit}
                businessId={businessId}
                user={user}
                categories={categories}
            />
        </div>
    );
}

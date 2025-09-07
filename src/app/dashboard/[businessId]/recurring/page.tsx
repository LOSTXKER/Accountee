// src/app/dashboard/[businessId]/recurring/page.tsx
"use client";

import { useState, useEffect } from "react";
import { RecurringTransaction, Category } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import RecurringTransactionFormModal from "@/components/recurring/RecurringTransactionFormModal";
import { PostgrestError } from "@supabase/supabase-js";

// Helper to format the next due date for display
const formatNextDueDate = (tx: RecurringTransaction): string => {
    if (!tx.next_due_date) return 'N/A';
    const date = new Date(tx.next_due_date);
    switch (tx.frequency) {
        case 'daily':
            return `ทุกวัน, ครั้งถัดไป: ${date.toLocaleDateString('th-TH')}`;
        case 'weekly':
            return `ทุกสัปดาห์, ครั้งถัดไป: ${date.toLocaleDateString('th-TH')}`;
        case 'monthly':
            return `ทุกเดือน, ครั้งถัดไป: ${date.toLocaleDateString('th-TH')}`;
        case 'yearly':
            return `ทุกปี, ครั้งถัดไป: ${date.toLocaleDateString('th-TH')}`;
        default:
            return 'N/A';
    }
};

export default function RecurringPage({ params }: { params: { businessId: string } }) {
    const { businessId } = params;
    const supabase = createClient();

    const [recurringTxs, setRecurringTxs] = useState<RecurringTransaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [txToEdit, setTxToEdit] = useState<RecurringTransaction | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!businessId) return;
            setIsLoading(true);
            setError(null);

            // Fetch both recurring transactions and categories
            const [txResult, catResult] = await Promise.all([
                supabase
                    .from('recurring_transactions')
                    .select(`
                        *,
                        categories ( name )
                    `)
                    .eq('businessid', businessId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('categories')
                    .select('*')
                    .eq('businessid', businessId)
                    .in('type', ['income', 'expense', 'cogs'])
            ]);

            const { data: txData, error: txError } = txResult;
            if (txError) {
                console.error("Error fetching recurring transactions:", txError);
                setError("ไม่สามารถดึงข้อมูลรายการที่เกิดซ้ำได้");
                setRecurringTxs([]);
            } else {
                const formattedData = txData.map(tx => ({
                    ...tx,
                    category_name: (tx.categories as { name: string } | null)?.name || 'ไม่มีหมวดหมู่'
                }));
                setRecurringTxs(formattedData as any);
            }

            const { data: catData, error: catError } = catResult;
            if (catError) {
                console.error("Error fetching categories:", catError);
                // Non-critical error, maybe just log it
            } else {
                setCategories(catData || []);
            }

            setIsLoading(false);
        };
        fetchData();
    }, [businessId, supabase]);

    const handleOpenModal = (tx: RecurringTransaction | null = null) => {
        setTxToEdit(tx);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTxToEdit(null);
    };

    const handleSave = async (formData: Omit<RecurringTransaction, 'id' | 'created_at' | 'user_id' | 'businessid'>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("กรุณาเข้าสู่ระบบก่อน");
            return;
        }

        const dataToSave = {
            ...formData,
            businessid: businessId,
            user_id: user.id,
        };

        let error: PostgrestError | null = null;
        
        if (txToEdit) {
            // Update
            const { data: updatedData, error: updateError } = await supabase
                .from('recurring_transactions')
                .update(dataToSave)
                .eq('id', txToEdit.id)
                .select(`*, categories ( name )`)
                .single();
            
            error = updateError;
            if (!error && updatedData) {
                 const formattedData = {
                    ...updatedData,
                    category_name: (updatedData.categories as { name: string } | null)?.name || 'ไม่มีหมวดหมู่'
                };
                setRecurringTxs(recurringTxs.map(t => t.id === txToEdit.id ? formattedData as any : t));
            }
        } else {
            // Create
            const { data: createdData, error: createError } = await supabase
                .from('recurring_transactions')
                .insert(dataToSave)
                .select(`*, categories ( name )`)
                .single();

            error = createError;
            if (!error && createdData) {
                const formattedData = {
                    ...createdData,
                    category_name: (createdData.categories as { name: string } | null)?.name || 'ไม่มีหมวดหมู่'
                };
                setRecurringTxs([formattedData as any, ...recurringTxs]);
            }
        }

        if (error) {
            console.error("Error saving recurring transaction:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message);
        } else {
            handleCloseModal();
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการตั้งค่านี้?')) {
            const { error } = await supabase
                .from('recurring_transactions')
                .delete()
                .eq('id', id);

            if (error) {
                console.error("Error deleting recurring transaction:", error);
                alert("เกิดข้อผิดพลาดในการลบข้อมูล: " + error.message);
            } else {
                setRecurringTxs(recurringTxs.filter(t => t.id !== id));
            }
        }
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">จัดการรายการที่เกิดซ้ำ</h1>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                    <PlusCircle size={20} />
                    เพิ่มรายการใหม่
                </button>
            </div>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">รายละเอียด</th>
                            <th className="px-6 py-3">จำนวนเงิน</th>
                            <th className="px-6 py-3">หมวดหมู่</th>
                            <th className="px-6 py-3">ความถี่/ครั้งถัดไป</th>
                            <th className="px-6 py-3">สถานะ</th>
                            <th className="px-6 py-3">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center p-10">กำลังโหลด...</td></tr>
                        ) : recurringTxs.length === 0 ? (
                            <tr><td colSpan={6} className="text-center p-10">ไม่พบรายการที่เกิดซ้ำ</td></tr>
                        ) : (
                            recurringTxs.map((tx) => (
                                <tr key={tx.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{tx.description}</td>
                                    <td className="px-6 py-4">฿{tx.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4">{(tx as any).category_name}</td>
                                    <td className="px-6 py-4">{formatNextDueDate(tx)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${tx.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {tx.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-4">
                                        <button onClick={() => handleOpenModal(tx)}><Edit size={18} className="text-gray-500 hover:text-blue-500" /></button>
                                        <button onClick={() => handleDelete(tx.id)}><Trash2 size={18} className="text-gray-500 hover:text-red-500" /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <RecurringTransactionFormModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave as any} // Cast to any to avoid complex type issues with the form
                    txToEdit={txToEdit}
                    categories={categories}
                    businessId={businessId}
                    user={null}
                />
            )}
        </div>
    );
}
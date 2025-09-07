// src/app/dashboard/[businessId]/categories/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Category } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useCategories } from "@/hooks/useCategories";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function CategoriesPage() {
    const supabase = createClient();
    const params = useParams();
    const businessId = params.businessId as string;
    const { categories, loading: isLoading, refetch } = useCategories(businessId);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState<'income' | 'cogs' | 'expense'>('expense');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpenModal = (category: Category | null = null) => {
        setCategoryToEdit(category);
        setNewCategoryName(category ? category.name : '');
        setNewCategoryType(category ? category.type : 'expense');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCategoryToEdit(null);
        setNewCategoryName('');
    };

    const handleSave = async () => {
        if (!newCategoryName.trim()) {
            alert('กรุณากรอกชื่อหมวดหมู่');
            return;
        }
        setIsSubmitting(true);

        const dataToSave = {
            businessId,
            name: newCategoryName.trim(),
            type: newCategoryType,
        };

        try {
            if (categoryToEdit) {
                // Update existing category
                const { error } = await supabase
                    .from('categories')
                    .update(dataToSave)
                    .eq('id', categoryToEdit.id);
                if (error) throw error;
            } else {
                // Add new category
                const { error } = await supabase.from('categories').insert([dataToSave]);
                if (error) throw error;
            }
            // No need to manually update state, useCategories hook with realtime will handle it
            handleCloseModal();
        } catch (error: any) {
            console.error("Error saving category:", error);
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้?')) {
            try {
                const { error } = await supabase.from('categories').delete().eq('id', id);
                if (error) throw error;
                // Realtime will update the list
            } catch (error: any) {
                console.error("Error deleting category:", error);
                alert(`เกิดข้อผิดพลาด: ${error.message}`);
            }
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">กำลังโหลด...</div>;
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">จัดการหมวดหมู่</h1>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                    <PlusCircle size={20} />
                    เพิ่มหมวดหมู่ใหม่
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">ชื่อหมวดหมู่</th>
                            <th scope="col" className="px-6 py-3">ประเภท</th>
                            <th scope="col" className="px-6 py-3">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((cat) => (
                            <tr key={cat.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{cat.name}</td>
                                <td className="px-6 py-4">{cat.type === 'cogs' ? 'ต้นทุนขาย' : cat.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</td>
                                <td className="px-6 py-4 flex gap-4">
                                    <button onClick={() => handleOpenModal(cat)}><Edit size={18} className="text-gray-500 hover:text-blue-500" /></button>
                                    <button onClick={() => handleDelete(cat.id)}><Trash2 size={18} className="text-gray-500 hover:text-red-500" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6">{categoryToEdit ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ชื่อหมวดหมู่</label>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="mt-1 input-style"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ประเภท</label>
                                <select
                                    value={newCategoryType}
                                    onChange={(e) => setNewCategoryType(e.target.value as 'income' | 'cogs' | 'expense')}
                                    className="mt-1 input-style"
                                >
                                    <option value="expense">รายจ่าย</option>
                                    <option value="cogs">ต้นทุนขาย</option>
                                    <option value="income">รายรับ</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-6">
                            <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                                ยกเลิก
                            </button>
                            <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
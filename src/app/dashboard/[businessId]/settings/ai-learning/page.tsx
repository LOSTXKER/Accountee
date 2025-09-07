// src/app/dashboard/[businessId]/settings/ai-learning/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { AiLearning, Category } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useParams } from 'next/navigation';
import { Button } from "@/components/ui/Button";
import { PlusCircle, Edit, Trash2, BrainCircuit } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";

export default function AiLearningPage() {
    const params = useParams();
    const businessId = params.businessId as string;
    const supabase = createClient();

    const [learnings, setLearnings] = useState<AiLearning[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<AiLearning | null>(null);

    // Form state
    const [vendorName, setVendorName] = useState('');
    const [categoryId, setCategoryId] = useState('');

    useEffect(() => {
        if (!businessId) return;
        
        const fetchData = async () => {
            setIsLoading(true);

            const [learningsResult, categoriesResult] = await Promise.all([
                supabase.from('services').select('*').eq('businessid', businessId),
                supabase.from('categories').select('*').eq('businessid', businessId)
            ]);

            const { data: learningsData, error: learningsError } = learningsResult;
            if (learningsError) {
                console.error("Error fetching AI learnings:", learningsError);
                alert("เกิดข้อผิดพลาดในการดึงข้อมูลการเรียนรู้ของ AI");
            } else {
                learningsData.sort((a, b) => a.vendor_name.localeCompare(b.vendor_name));
                setLearnings(learningsData as AiLearning[]);
            }

            const { data: categoriesData, error: categoriesError } = categoriesResult;
            if (categoriesError) {
                console.error("Error fetching categories:", categoriesError);
                alert("เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่");
            } else {
                setCategories(categoriesData as Category[]);
            }

            setIsLoading(false);
        };

        fetchData();
    }, [businessId, supabase]);

    const categoryMap = useMemo(() => {
        return categories.reduce((acc, cat) => {
            acc[cat.id] = cat.name;
            return acc;
        }, {} as Record<string, string>);
    }, [categories]);
    
    const resetForm = () => {
        setVendorName('');
        setCategoryId('');
    };

    const handleOpenModal = (item: AiLearning | null = null) => {
        setItemToEdit(item);
        if (item) {
            setVendorName(item.vendor_name);
            setCategoryId(item.category_id);
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setItemToEdit(null);
    };

    const handleSave = async () => {
        if (!vendorName.trim() || !categoryId) {
            alert('กรุณากรอก "คำสำคัญ" และเลือก "หมวดหมู่"');
            return;
        }

        const selectedCategory = categories.find(c => c.id === categoryId);
        if (!selectedCategory) {
            alert('ไม่พบหมวดหมู่ที่เลือก');
            return;
        }

        const dataToSave = {
            businessid: businessId,
            vendor_name: vendorName.trim(),
            category_id: categoryId,
            category_name: selectedCategory.name
        };

        try {
            if (itemToEdit) {
                const { data, error } = await supabase
                    .from('services')
                    .update(dataToSave)
                    .eq('id', itemToEdit.id)
                    .select()
                    .single();
                if (error) throw error;
                setLearnings(learnings.map(l => l.id === itemToEdit.id ? data as AiLearning : l));
            } else {
                const { data, error } = await supabase
                    .from('services')
                    .insert(dataToSave)
                    .select()
                    .single();
                if (error) throw error;
                setLearnings([...learnings, data as AiLearning].sort((a, b) => a.vendor_name.localeCompare(b.vendor_name)));
            }
        } catch (error) {
            console.error("Error saving AI learning:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (error as Error).message);
        } finally {
            handleCloseModal();
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบการเรียนรู้นี้?')) {
            try {
                const { error } = await supabase.from('services').delete().eq('id', id);
                if (error) throw error;
                setLearnings(learnings.filter(l => l.id !== id));
            } catch (error) {
                console.error("Error deleting AI learning:", error);
                alert("เกิดข้อผิดพลาดในการลบข้อมูล: " + (error as Error).message);
            }
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><p>กำลังโหลดข้อมูล...</p></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">การเรียนรู้ของ AI</h2>
                <Button onClick={() => handleOpenModal()}><PlusCircle size={16} className="mr-2"/>เพิ่มการเรียนรู้</Button>
            </div>
            {/* --- ✅ [ปรับปรุง] เพิ่มคำอธิบายให้ชัดเจนขึ้น --- */}
            <p className="text-sm text-slate-500 mb-6">
                นี่คือ "สมอง" ของ AI ที่ใช้ในการแนะนำหมวดหมู่โดยอัตโนมัติเมื่อคุณอัปโหลดสลิปหรือใบเสร็จ
                คุณสามารถเพิ่ม, แก้ไข, หรือลบกฎเกณฑ์เหล่านี้ได้ที่นี่
            </p>
            
            <div className="bg-slate-50 rounded-lg overflow-hidden">
                 <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-slate-100">
                        <tr>
                            <th className="px-6 py-3">ถ้าเจอคำสำคัญ (Vendor/Keyword)</th>
                            <th className="px-6 py-3">ให้จัดลงหมวดหมู่</th>
                            <th className="px-6 py-3 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {learnings.map((item) => (
                            <tr key={item.id} className="bg-white border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-800">{item.vendor_name}</td>
                                <td className="px-6 py-4 text-brand-700">{categoryMap[item.category_id] || 'ไม่พบหมวดหมู่'}</td>
                                <td className="px-6 py-4 flex justify-center gap-4">
                                    <button onClick={() => handleOpenModal(item)} className="text-slate-500 hover:text-blue-500 p-1"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(item.id)} className="text-slate-500 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {learnings.length === 0 && !isLoading && (
                    <div className="text-center p-10">
                        <BrainCircuit size={48} className="mx-auto text-slate-300" />
                        <p className="mt-4 text-slate-500">AI ยังไม่มีการเรียนรู้</p>
                        <p className="text-xs text-slate-400">คุณสามารถเพิ่มการเรียนรู้ด้วยตนเอง หรือไปที่หน้า "ฝึกฝน AI"</p>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={itemToEdit ? 'แก้ไขการเรียนรู้' : 'เพิ่มการเรียนรู้ใหม่'}>
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">คำสำคัญ (Vendor/Keyword)</label>
                        <Input 
                            placeholder="เช่น 7-Eleven, Facebook Ads" 
                            value={vendorName} 
                            onChange={e => setVendorName(e.target.value)} 
                            required 
                        />
                        <p className="text-xs text-slate-500 mt-1">AI จะมองหาคำนี้ในรายละเอียดของใบเสร็จ/สลิป</p>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่ที่จะบันทึก</label>
                        <CustomSelect
                            value={categoryId}
                            onChange={value => setCategoryId(value ?? '')}
                            options={[
                                { value: '', label: '-- กรุณาเลือกหมวดหมู่ --' },
                                ...categories.map(cat => ({
                                    value: cat.id,
                                    label: `${cat.name} (${cat.type})`
                                }))
                            ]}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-6">
                    <Button type="button" variant="secondary" onClick={handleCloseModal}>ยกเลิก</Button>
                    <Button type="button" onClick={handleSave}>บันทึก</Button>
                </div>
            </Modal>
        </div>
    );
}

// src/app/dashboard/[businessId]/settings/customers/page.tsx
"use client";

import { useState } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { Customer } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useParams } from 'next/navigation';
import { Button } from "@/components/ui/Button";
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import CustomerFormModal from "./CustomerFormModal";
import { useQueryClient } from "@tanstack/react-query";

export default function CustomersPage() {
    const params = useParams();
    const businessId = params.businessId as string;
    const supabase = createClient();
    const queryClient = useQueryClient();

    const { customers, loading: isLoading, isError } = useCustomers(businessId);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

    const handleDelete = async (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้ารายนี้?')) {
            try {
                const { error } = await supabase.from('customers').delete().eq('id', id);
                if (error) throw error;
                queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
            } catch (error) {
                console.error("Error deleting customer:", error);
                alert("เกิดข้อผิดพลาดในการลบข้อมูล");
            }
        }
    };
    
    const handleOpenModal = (customer: Customer | null = null) => {
        setCustomerToEdit(customer);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
        setIsModalOpen(false);
    };

    if (isError) {
        return (
            <div className="text-center text-red-500 py-10">
                <p>เกิดข้อผิดพลาดในการโหลดข้อมูลลูกค้า</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">จัดการข้อมูลลูกค้า</h2>
                <Button onClick={() => handleOpenModal()}>
                    <PlusCircle size={16} className="mr-2"/>เพิ่มลูกค้าใหม่
                </Button>
            </div>

            <div className="space-y-2">
                {isLoading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    </div>
                ) : customers.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">
                        <p>ยังไม่มีข้อมูลลูกค้า</p>
                        <p className="text-xs">คลิก 'เพิ่มลูกค้าใหม่' เพื่อเริ่มต้น</p>
                    </div>
                ) : customers.map(customer => (
                    <div key={customer.id} className="bg-slate-50 rounded-lg p-3 flex justify-between items-center text-sm">
                        <div>
                            <p className="font-semibold text-slate-800">{customer.name}</p>
                            <p className="text-slate-500 text-xs">{customer.address}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleOpenModal(customer)} className="text-slate-500 hover:text-brand-600 p-1">
                                <Edit size={16} />
                            </button>
                            <button onClick={() => handleDelete(customer.id)} className="text-slate-500 hover:text-red-600 p-1">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <CustomerFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                businessId={businessId}
                onSave={handleSave}
                customerToEdit={customerToEdit}
            />
        </div>
    );
}
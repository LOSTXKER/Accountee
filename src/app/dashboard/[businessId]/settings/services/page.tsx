// src/app/dashboard/[businessId]/settings/services/page.tsx
"use client";

import { useState } from "react";
import { useServices } from "@/hooks/useServices";
import { Service } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useParams } from 'next/navigation';
import { Button } from "@/components/ui/Button";
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import ServiceFormModal from "./ServiceFormModal";
import { useQueryClient } from "@tanstack/react-query";

export default function ServicesPage() {
    const params = useParams();
    const businessId = params.businessId as string;
    const supabase = createClient();
    const queryClient = useQueryClient();

    const { services, loading: isLoading, isError } = useServices(businessId);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

    const handleDelete = async (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) {
            try {
                const { error } = await supabase.from('services').delete().eq('id', id);
                if (error) throw error;
                queryClient.invalidateQueries({ queryKey: ['services', businessId] });
            } catch (error) {
                console.error("Error deleting service:", error);
                alert("เกิดข้อผิดพลาดในการลบข้อมูล");
            }
        }
    };

    const handleOpenModal = (service: Service | null = null) => {
        setServiceToEdit(service);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        queryClient.invalidateQueries({ queryKey: ['services', businessId] });
        setIsModalOpen(false);
    };

    if (isError) {
        return (
            <div className="text-center text-red-500 py-10">
                <p>เกิดข้อผิดพลาดในการโหลดข้อมูลบริการ</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">จัดการสินค้า/บริการ</h2>
                <Button onClick={() => handleOpenModal()}><PlusCircle size={16} className="mr-2"/>เพิ่มรายการใหม่</Button>
            </div>

            <div className="space-y-2">
                {isLoading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    </div>
                ) : services.length === 0 ? (
                     <div className="text-center text-slate-500 py-10">
                        <p>ยังไม่มีข้อมูลสินค้า/บริการ</p>
                        <p className="text-xs">คลิก 'เพิ่มรายการใหม่' เพื่อเริ่มต้น</p>
                    </div>
                ) : services.map(service => (
                    <div key={service.id} className="bg-slate-50 rounded-lg p-3 flex justify-between items-center text-sm">
                        <p className="font-semibold text-slate-800">{service.name}</p>
                        <div className="flex items-center gap-4">
                            <span className="text-slate-600">{(service.unitprice ?? 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleOpenModal(service)} className="text-slate-500 hover:text-brand-600 p-1"><Edit size={16} /></button>
                                <button onClick={() => handleDelete(service.id)} className="text-slate-500 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ServiceFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                businessId={businessId}
                onSave={handleSave}
                serviceToEdit={serviceToEdit}
            />
        </div>
    );
}
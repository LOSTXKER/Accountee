// src/app/dashboard/[businessId]/settings/services/ServiceFormModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Service } from "@/types";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Loader2 } from "lucide-react";

interface ServiceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
    onSave: (service: Service) => void;
    serviceToEdit?: Service | null;
}

export default function ServiceFormModal({ isOpen, onClose, businessId, onSave, serviceToEdit }: ServiceFormModalProps) {
    const supabase = createClient();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [unitPrice, setUnitPrice] = useState<number | ''>('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (serviceToEdit) {
            setName(serviceToEdit.name);
            setDescription(serviceToEdit.description || '');
                    setUnitPrice(serviceToEdit.unitprice);
        } else {
            setName('');
            setDescription('');
            setUnitPrice('');
        }
    }, [serviceToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || unitPrice === '') return;
        setIsProcessing(true);
        const serviceData = {
            businessid: businessId,
            name,
            description,
            unitprice: Number(unitPrice),
        };
        try {
            if (serviceToEdit) {
                const { data, error } = await supabase
                    .from('services')
                    .update(serviceData)
                    .eq('id', serviceToEdit.id)
                    .select()
                    .single();
                if (error) throw error;
                onSave(data as Service);
            } else {
                const { data, error } = await supabase
                    .from('services')
                    .insert(serviceData)
                    .select()
                    .single();
                if (error) throw error;
                onSave(data as Service);
            }
            onClose();
        } catch (error) {
            console.error("Error saving service:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลบริการ");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={serviceToEdit ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อบริการ</label>
                    <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="เช่น ออกแบบเว็บไซต์"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ราคาต่อหน่วย</label>
                    <Input
                        type="number"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(Number(e.target.value))}
                        required
                        placeholder="0.00"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด (ไม่บังคับ)</label>
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับบริการ"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isProcessing}>
                        ยกเลิก
                    </Button>
                    <Button type="submit" disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {serviceToEdit ? 'บันทึกการเปลี่ยนแปลง' : 'บันทึก'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
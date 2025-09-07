// src/components/sales/document/DocumentItemsTable.tsx
"use client";

import React, { useState } from 'react';
import { DocumentItem, Service } from '@/types';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2 as TrashIcon } from 'lucide-react';
import ServiceFormModal from '@/app/dashboard/[businessId]/settings/services/ServiceFormModal';

interface DocumentItemsTableProps {
    mode: 'view' | 'edit' | 'new';
    items: DocumentItem[];
    setItems: React.Dispatch<React.SetStateAction<DocumentItem[]>>;
    services: Service[];
    setServices?: React.Dispatch<React.SetStateAction<Service[]>>;
    businessId: string;
}

export default function DocumentItemsTable({ mode, items, setItems, services, setServices, businessId }: DocumentItemsTableProps) {
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);

    const handleItemChange = (index: number, field: keyof DocumentItem, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };
        item.amount = item.quantity * item.unitPrice;
        newItems[index] = item;
        setItems(newItems);
    };

    const handleServiceSelect = (index: number, serviceId: string) => {
        if (serviceId === 'add_new') {
            setEditingServiceIndex(index);
            setIsServiceModalOpen(true);
            return;
        }
        const service = services.find(s => s.id === serviceId);
        if (service) {
            const newItems = [...items];
            newItems[index] = {
                ...newItems[index],
                description: service.name,
                unitPrice: service.unitprice,
                amount: newItems[index].quantity * service.unitprice
            };
            setItems(newItems);
        }
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase w-2/5">สินค้า/บริการ</th>
                            <th className="p-3 text-right text-xs font-semibold text-slate-600 uppercase">จำนวน</th>
                            <th className="p-3 text-right text-xs font-semibold text-slate-600 uppercase">ราคา/หน่วย</th>
                            <th className="p-3 text-right text-xs font-semibold text-slate-600 uppercase">รวม</th>
                            {mode !== 'view' && <th className="p-3"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index} className="border-b align-top">
                                <td className="p-2">
                                    {mode === 'view' ? item.description : (
                                        <>
                                            <Select
                                                value={services.find(s => s.name === item.description)?.id || ''}
                                                onChange={(value) => handleServiceSelect(index, value)}
                                                options={[
                                                    ...services.map(s => ({ value: s.id, label: s.name })),
                                                    { value: 'add_new', label: <span className="text-blue-600 font-bold flex items-center gap-2"><Plus size={14} /> เพิ่มรายการใหม่</span> }
                                                ]}
                                                placeholder={'เลือกรายการ'}
                                                className="mb-1"
                                            />
                                            <Textarea
                                                value={item.description}
                                                onChange={e => handleItemChange(index, 'description', e.target.value)}
                                                placeholder="หรือพิมพ์รายละเอียดที่นี่..."
                                                required
                                                rows={2}
                                            />
                                        </>
                                    )}
                                </td>
                                <td className="p-2 text-right">
                                    {mode === 'view' ? item.quantity : (
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                                            required
                                            className="text-right w-20"
                                        />
                                    )}
                                </td>
                                <td className="p-2 text-right">
                                    {mode === 'view' ? item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : (
                                        <Input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                                            required
                                            className="text-right w-28"
                                        />
                                    )}
                                </td>
                                <td className="p-3 text-right font-mono">{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                {mode !== 'view' && (
                                    <td className="p-2">
                                        <Button type="button" variant="danger" size="sm" onClick={() => removeItem(index)}>
                                            <TrashIcon size={16} />
                                        </Button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {mode !== 'view' && (
                <Button type="button" variant="secondary" onClick={addItem} className="w-full">
                    <Plus size={16} className="mr-2" />เพิ่มรายการ
                </Button>
            )}
            <ServiceFormModal
                isOpen={isServiceModalOpen}
                onClose={() => setIsServiceModalOpen(false)}
                businessId={businessId}
                onSave={(savedService: Service) => {
                    setServices?.(prev => [...prev, savedService].sort((a,b) => a.name.localeCompare(b.name)));
                    if (editingServiceIndex !== null) {
                        handleServiceSelect(editingServiceIndex, savedService.id);
                    }
                    setIsServiceModalOpen(false);
                    setEditingServiceIndex(null);
                }}
                serviceToEdit={null}
            />
        </>
    );
}
// src/components/recurring/RecurringTransactionFormModal.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { RecurringTransaction, Category } from '@/types';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedTx: Partial<RecurringTransaction>) => void;
  txToEdit?: RecurringTransaction | null;
  businessId: string;
  user: any;
  categories: Category[];
}

export default function RecurringTransactionFormModal({ isOpen, onClose, onSave, txToEdit, businessId, user, categories }: ModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (txToEdit) {
      setDescription(txToEdit.description);
      setAmount(txToEdit.amount);
      setType(txToEdit.type as 'income' | 'expense');
      setFrequency(txToEdit.frequency);
      setStartDate(txToEdit.start_date);
      setEndDate(txToEdit.end_date || '');
      setCategoryId(txToEdit.category_id || null);
      setIsActive(txToEdit.is_active);
    } else {
      // Reset form
      setDescription('');
      setAmount('');
      setType('expense');
      setFrequency('monthly');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setCategoryId(null);
      setIsActive(true);
    }
  }, [txToEdit, isOpen]);

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(c => c.type === type || (type === 'expense' && c.type === 'cogs'));
  }, [categories, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount === '' || !startDate) {
        alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
        return;
    }
    setIsSaving(true);

    const dataToSave: Partial<RecurringTransaction> = {
      description,
      amount: Number(amount),
      type,
      frequency,
      start_date: startDate,
      end_date: endDate || null,
      category_id: categoryId || null,
      is_active: isActive,
    };

    if (txToEdit) {
        dataToSave.id = txToEdit.id;
    } else {
        dataToSave.businessid = businessId;
        dataToSave.user_id = user?.id;
        dataToSave.next_due_date = startDate; // Set initial due date only for new ones
    }

    try {
        onSave(dataToSave);
        onClose();
    } catch (error) {
        console.error('Error preparing save data:', error);
        alert('เกิดข้อผิดพลาดในการเตรียมข้อมูลเพื่อบันทึก');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={txToEdit ? 'แก้ไขรายการเกิดซ้ำ' : 'เพิ่มรายการเกิดซ้ำ'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
          <Input type="text" value={description} onChange={e => setDescription(e.target.value)} required placeholder="เช่น ค่าเช่า, ค่าบริการรายเดือน" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน</label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} required placeholder="0.00" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                <CustomSelect
                    value={type}
                    onChange={(value) => setType(value as 'income' | 'expense')}
                    options={[ { value: 'expense', label: 'รายจ่าย' }, { value: 'income', label: 'รายรับ' } ]}
                />
            </div>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
            <CustomSelect
                value={categoryId || ''}
                onChange={(value) => setCategoryId(value || null)}
                options={[
                    { value: '', label: '-- ไม่เลือกหมวดหมู่ --' },
                    ...filteredCategories.map(c => ({ value: c.id, label: c.name }))
                ]}
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ความถี่</label>
            <CustomSelect
                value={frequency}
                onChange={(value) => setFrequency(value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
                options={[
                    { value: 'monthly', label: 'รายเดือน' },
                    { value: 'yearly', label: 'รายปี' },
                    { value: 'weekly', label: 'รายสัปดาห์' },
                    { value: 'daily', label: 'รายวัน' },
                ]}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่ม</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด (ถ้ามี)</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
        </div>
        <div className="flex items-center">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} id="isActiveRecurring" className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
          <label htmlFor="isActiveRecurring" className="ml-2 block text-sm text-gray-900">เปิดใช้งาน</label>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>ยกเลิก</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
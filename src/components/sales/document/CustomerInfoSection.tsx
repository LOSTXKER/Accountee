// src/components/sales/document/CustomerInfoSection.tsx
"use client";

import React, { useState } from 'react';
import { Customer, SalesDoc, Invoice, Quotation, ProformaInvoice } from '@/types';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Plus } from 'lucide-react';
import CustomerFormModal from '@/app/dashboard/[businessId]/settings/customers/CustomerFormModal';

interface CustomerInfoSectionProps {
    mode: 'view' | 'edit' | 'new';
    docData: SalesDoc | null;
    formState: any;
    businessId: string;
    customers: Customer[];
    setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
}

export default function CustomerInfoSection({ mode, docData, formState, businessId, customers, setCustomers }: CustomerInfoSectionProps) {
    const { 
        docType,
        selectedCustomerId, setSelectedCustomerId,
        manualCustomerName, setManualCustomerName,
        customerAddress, setCustomerAddress,
        issueDate, setIssueDate,
        dueDate, setDueDate,
        expiryDate, setExpiryDate,
    } = formState;

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    const handleCustomerSelect = (customerId: string) => {
        if (customerId === 'add_new') {
            setIsCustomerModalOpen(true);
            return;
        }
        const customer = customers.find(c => c.id === customerId);
        setSelectedCustomerId(customerId);
        if (customer) {
            setManualCustomerName(customer.name);
            setCustomerAddress(customer.address);
        }
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    // Helper function to safely get field values with fallback for different naming conventions
    const getFieldValue = (data: any, field1: string, field2?: string) => {
        return data?.[field1] || (field2 ? data?.[field2] : '') || '';
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ลูกค้า</label>
                    {mode === 'view' && docData ? (
                        <p className="font-semibold text-slate-800">{getFieldValue(docData, 'customer_name', 'customername')}</p>
                    ) : (
                        <>
                            <Select
                                value={selectedCustomerId}
                                onChange={handleCustomerSelect}
                                options={[
                                    ...customers.map(c => ({ value: c.id, label: c.name })),
                                    { value: 'add_new', label: <span className="text-blue-600 font-bold flex items-center gap-2"><Plus size={14} /> เพิ่มลูกค้าใหม่</span> }
                                ]}
                                placeholder={'เลือกลูกค้าที่มีอยู่'}
                            />
                            <Input
                                placeholder="หรือพิมพ์ชื่อลูกค้าใหม่ที่นี่"
                                value={manualCustomerName}
                                onChange={e => { setManualCustomerName(e.target.value); if (selectedCustomerId) setSelectedCustomerId(''); }}
                                required
                                className="mt-2"
                            />
                        </>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
                    {mode === 'view' && docData ? (
                        <p className="font-semibold text-slate-800 whitespace-pre-line text-sm">{getFieldValue(docData, 'customer_address', 'customeraddress')}</p>
                    ) : (
                        <Textarea value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} required rows={4} placeholder="กรอกที่อยู่ลูกค้า..." />
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ออกเอกสาร</label>
                    {mode === 'view' && docData ? (
                        <p className="font-semibold text-slate-800">{formatDate(getFieldValue(docData, 'issue_date', 'issuedate'))}</p>
                    ) : (
                        <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required />
                    )}
                </div>
                {docType === 'invoice' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันครบกำหนด</label>
                        {mode === 'view' && docData ? (
                            <p className="font-semibold text-slate-800">{formatDate(getFieldValue(docData, 'due_date', 'duedate'))}</p>
                        ) : (
                            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                        )}
                    </div>
                )}
                {(docType === 'quotation' || docType === 'proforma') && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ยืนราคาถึงวันที่</label>
                        {mode === 'view' && docData ? (
                            <p className="font-semibold text-slate-800">{formatDate(getFieldValue(docData, 'expiry_date', 'expirydate'))}</p>
                        ) : (
                            <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} required />
                        )}
                    </div>
                )}
            </div>
            <CustomerFormModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                businessId={businessId}
                onSave={(newCustomer: Customer) => {
                    setCustomers?.(prev => [...prev, newCustomer].sort((a,b) => a.name.localeCompare(b.name)));
                    handleCustomerSelect(newCustomer.id);
                    setIsCustomerModalOpen(false);
                }}
                customerToEdit={null}
            />
        </>
    );
}
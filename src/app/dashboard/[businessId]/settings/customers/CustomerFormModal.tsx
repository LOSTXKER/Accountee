// src/app/dashboard/[businessId]/settings/customers/CustomerFormModal.tsx
"use client";

import React, { useState, FormEvent, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Customer } from '@/types';
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import CustomerFormFields from '@/components/customers/CustomerFormFields';
import { Loader2 } from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  onSave: (customer: Customer) => void;
  customerToEdit?: Customer | null;
}

const initialFormState = {
    contactType: 'corporate' as 'corporate' | 'individual',
    legalEntityType: 'บริษัทจำกัด',
    companyName: '',
    branchType: 'main' as 'main' | 'branch' | 'unspecified',
    branch_number: '',
    prefix: 'นาย',
    firstName: '',
    lastName: '',
    taxId: '',
    contactPerson: '',
    streetAddress: '',
    subdistrict: '',
    district: '',
    province: '',
    postalCode: '',
    email: '',
    phone: '',
    website: '',
    fax: '',
};

export default function CustomerFormModal({ isOpen, onClose, businessId, onSave, customerToEdit }: CustomerFormModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formState, setFormState] = useState(initialFormState);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
        if (customerToEdit) {
            setFormState({
                contactType: customerToEdit.contact_type || 'corporate',
                legalEntityType: customerToEdit.legal_entity_type || 'บริษัทจำกัด',
                companyName: customerToEdit.company_name || '',
                branchType: customerToEdit.branch_type || 'main',
                branch_number: customerToEdit.branch_number || '',
                prefix: customerToEdit.prefix || 'นาย',
                firstName: customerToEdit.first_name || '',
                lastName: customerToEdit.last_name || '',
                taxId: customerToEdit.tax_id || '',
                contactPerson: customerToEdit.contact_person || '',
                streetAddress: customerToEdit.street_address || '',
                subdistrict: customerToEdit.subdistrict || '',
                district: customerToEdit.district || '',
                province: customerToEdit.province || '',
                postalCode: customerToEdit.postal_code || '',
                email: customerToEdit.email || '',
                phone: customerToEdit.phone || '',
                website: customerToEdit.website || '',
                fax: customerToEdit.fax || '',
            });
        } else {
            setFormState(initialFormState);
        }
    }
  }, [isOpen, customerToEdit]);


  const handleFormChange = useCallback((field: string, value: any) => { setFormState(prev => ({ ...prev, [field]: value })); }, []);
  const handleTaxIdChange = useCallback((value: string) => { setFormState(prev => ({ ...prev, taxId: value })); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const { streetAddress, subdistrict, district, province, postalCode, legalEntityType, companyName, prefix, firstName, lastName, ...rest } = formState;
    const fullAddress = [streetAddress, subdistrict, district, province, postalCode].filter(Boolean).join(' ');
    const displayName = formState.contactType === 'corporate' ? `${legalEntityType} ${companyName}`.trim() : `${prefix} ${firstName} ${lastName}`.trim();

    if (!displayName) {
      alert('กรุณากรอกชื่อลูกค้า');
      setIsProcessing(false);
      return;
    }

    const customerData = {
      businessid: businessId,
      name: displayName,
      address: fullAddress,
      contact_type: formState.contactType,
      legal_entity_type: formState.contactType === 'corporate' ? legalEntityType : null,
      company_name: formState.contactType === 'corporate' ? companyName : null,
      branch_type: formState.contactType === 'corporate' ? formState.branchType : null,
      branch_number: formState.contactType === 'corporate' && formState.branchType === 'branch' ? formState.branch_number : null,
      prefix: formState.contactType === 'individual' ? prefix : null,
      first_name: formState.contactType === 'individual' ? firstName : null,
      last_name: formState.contactType === 'individual' ? lastName : null,
      tax_id: rest.taxId || null,
      street_address: streetAddress || null,
      subdistrict: subdistrict || null,
      district: district || null,
      province: province || null,
      postal_code: postalCode || null,
      contact_person: rest.contactPerson || null,
      email: rest.email || null,
      phone: rest.phone || null,
      website: rest.website || null,
      fax: rest.fax || null,
    };

    try {
      if (customerToEdit) {
        const { data, error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customerToEdit.id)
          .select()
          .single();
        if (error) throw error;
        onSave(data as Customer);
      } else {
        const { data, error } = await supabase
          .from('customers')
          .insert(customerData)
          .select()
          .single();
        if (error) throw error;
        onSave(data as Customer);
      }
      onClose();
    } catch (error) {
      console.error("Error saving customer:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลลูกค้า");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={customerToEdit ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"} size="5xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <CustomerFormFields
          formState={formState}
          onFormChange={handleFormChange}
          onTaxIdChange={handleTaxIdChange}
          isModal={true}
        />
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isProcessing}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isProcessing ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

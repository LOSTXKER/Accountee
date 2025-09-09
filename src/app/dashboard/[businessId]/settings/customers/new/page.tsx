// src/app/dashboard/[businessId]/settings/customers/new/page.tsx
"use client";

import React, { useState, FormEvent, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Customer } from '@/types';
import { Button } from '@/components/ui/Button';
import CustomerFormFields from '@/components/customers/CustomerFormFields';

export default function CreateContactPage() {
    const router = useRouter();
    const params = useParams();
    const businessId = params.businessId as string;
    const supabase = createClient();
    const [isSaving, setIsSaving] = useState(false);
    
    const [formState, setFormState] = useState({
        contactType: 'corporate' as 'corporate' | 'individual',
        legalEntityType: 'บริษัทจำกัด', companyName: '', branchType: 'main' as 'main' | 'branch',
        branchNumber: '', prefix: 'นาย', firstName: '', lastName: '', taxId: '', 
        contactPerson: '', streetAddress: '', subdistrict: '', district: '', 
        province: '', postalCode: '', email: '', phone: '', website: '', fax: '',
    });

    const handleFormChange = useCallback((field: string, value: any) => { setFormState(prev => ({ ...prev, [field]: value })); }, []);
    const handleTaxIdChange = useCallback((value: string) => { setFormState(prev => ({...prev, taxId: value})); }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        const { streetAddress, subdistrict, district, province, postalCode, legalEntityType, companyName, prefix, firstName, lastName, ...rest } = formState;
        
        const fullAddress = [streetAddress, subdistrict, district, province, postalCode].filter(Boolean).join(' ');
        const displayName = formState.contactType === 'corporate' 
            ? `${legalEntityType} ${companyName}`.trim() 
            : `${prefix} ${firstName} ${lastName}`.trim();

        if (!displayName) { 
            alert('กรุณากรอกชื่อกิจการหรือชื่อ-นามสกุล'); 
            setIsSaving(false); 
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
            branch_number: formState.contactType === 'corporate' && formState.branchType === 'branch' ? formState.branchNumber : null,
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
            const { error } = await supabase.from('customers').insert(customerData);
            if (error) throw error;

            alert('เพิ่มผู้ติดต่อเรียบร้อยแล้ว');
            router.push(`/dashboard/${businessId}/settings/customers`);
        } catch (error) {
            console.error("Error adding customer: ", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (error as Error).message);
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-gray-50 -m-8 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-800">เพิ่มผู้ติดต่อ</h1></div>
                <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
                    {/* เรียกใช้ฟอร์มกลางที่นี่ */}
                    <CustomerFormFields 
                        formState={formState}
                        onFormChange={handleFormChange}
                        onTaxIdChange={handleTaxIdChange}
                    />

                    <div className="flex justify-end space-x-3 border-t pt-6 mt-6">
                        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={isSaving}>ยกเลิก</Button>
                        <Button type="submit" variant="primary" disabled={isSaving}>
                            {isSaving ? 'กำลังบันทึก...' : 'เพิ่ม'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
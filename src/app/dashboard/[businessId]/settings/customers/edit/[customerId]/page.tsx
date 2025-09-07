// src/app/dashboard/[businessId]/settings/customers/edit/[customerId]/page.tsx
"use client";

import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Customer } from '@/types';
import { Button as UIButton } from '@/components/ui/Button';
import CustomerFormFields from '@/components/customers/CustomerFormFields';

export default function EditContactPage() {
    const router = useRouter();
    const params = useParams();
    const { businessId, customerId } = params as { businessId: string, customerId: string };
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formState, setFormState] = useState({
        contactType: 'corporate' as 'corporate' | 'individual',
        legalEntityType: 'บริษัทจำกัด',
        companyName: '',
        branchType: 'main' as 'main' | 'branch' | 'unspecified',
        branchNumber: '',
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
    });
    
    useEffect(() => {
        if (!customerId) return;
        const fetchCustomer = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', customerId)
                .single();

            if (error || !data) {
                console.error("Error fetching customer:", error);
                alert("ไม่พบข้อมูลผู้ติดต่อ");
                router.back();
                return;
            }
            
            setFormState({
                contactType: data.contact_type,
                legalEntityType: data.legal_entity_type || 'บริษัทจำกัด',
                companyName: data.company_name || '',
                branchType: data.branch_type || 'main',
                branchNumber: data.branch_number || '',
                prefix: data.prefix || 'นาย',
                firstName: data.first_name || '',
                lastName: data.last_name || '',
                taxId: data.tax_id || '',
                contactPerson: data.contact_person || '',
                streetAddress: data.street_address || '',
                subdistrict: data.subdistrict || '',
                district: data.district || '',
                province: data.province || '',
                postalCode: data.postal_code || '',
                email: data.email || '',
                phone: data.phone || '',
                website: data.website || '',
                fax: data.fax || '',
            });
            setIsLoading(false);
        };
        fetchCustomer();
    }, [customerId, router, supabase]);

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
            const { error } = await supabase
                .from('customers')
                .update(customerData)
                .eq('id', customerId);

            if (error) throw error;

            alert('บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว');
            router.push(`/dashboard/${businessId}/settings/customers`);
        } catch (error) {
            console.error("Error updating customer: ", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (error as Error).message);
            setIsSaving(false);
        }
    };

    if (isLoading) { 
        return <div className="text-center p-10">กำลังโหลดข้อมูลผู้ติดต่อ...</div>; 
    }
    
    return (
        <div className="bg-gray-50 -m-8 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">แก้ไขผู้ติดต่อ</h1>
                </div>
                <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
                    <CustomerFormFields 
                        formState={formState}
                        onFormChange={handleFormChange}
                        onTaxIdChange={handleTaxIdChange}
                    />
                    <div className="flex justify-end space-x-3 border-t pt-6 mt-6">
                        <UIButton type="button" variant="secondary" onClick={() => router.back()} disabled={isSaving}>
                            ยกเลิก
                        </UIButton>
                        <UIButton type="submit" variant="primary" disabled={isSaving}>
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                        </UIButton>
                    </div>
                </form>
            </div>
        </div>
    );
}

// src/components/transactions/WhtVendorModal.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, KeyboardEvent, FormEvent } from 'react';
import { Customer, Transaction } from '@/types';
import { useCustomers } from '@/hooks/useCustomers';
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectOption } from "@/components/ui/Select";
import { Plus, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CustomerFormFields from '@/components/customers/CustomerFormFields';
import { useQueryClient } from '@tanstack/react-query';

interface WhtVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  transaction: Partial<Transaction>;
  onCertificateCreated: () => void;
}

export default function WhtVendorModal({ isOpen, onClose, businessId, transaction, onCertificateCreated }: WhtVendorModalProps) {
  const { customers, loading: customersLoading, invalidateCustomersQuery } = useCustomers(businessId);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoResolved, setAutoResolved] = useState(false);
  const [whtCategory, setWhtCategory] = useState('ค่าบริการ'); // เพิ่ม state สำหรับประเภท WHT
  const [pndType, setPndType] = useState('ภ.ง.ด.53'); // เพิ่ม state สำหรับ PND type
  const [smartSuggestions, setSmartSuggestions] = useState<{ pndType: string; whtCategory: string } | null>(null);

  const [formState, setFormState] = useState({
      contactType: 'corporate' as 'corporate' | 'individual',
      legalEntityType: 'บริษัทจำกัด', companyName: '', branchType: 'main' as 'main' | 'branch',
      branch_number: '', prefix: 'นาย', firstName: '', lastName: '', taxId: '', 
      contactPerson: '', streetAddress: '', subdistrict: '', district: '', 
      province: '', postalCode: '', email: '', phone: '', website: '', fax: '',
  });

  const handleFormChange = useCallback((field: string, value: any) => { setFormState(prev => ({ ...prev, [field]: value })); }, []);
  const handleTaxIdChange = useCallback((value: string) => { setFormState(prev => ({...prev, taxId: value})); }, []);

  // 🤖 Fetch Smart Suggestions
  const fetchSmartSuggestions = useCallback(async () => {
    if (!transaction || !isOpen) return;
    
    try {
      // ส่ง POST เพื่อให้ระบบวิเคราะห์และแนะนำ แต่ยังไม่สร้างเอกสารจริง
      const response = await fetch('/api/generate-wht-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          vendorData: { name: 'temp', address: 'temp', taxId: 'temp' },
          previewMode: true // โหมดดูตัวอย่าง เพื่อให้ระบบแนะนำเท่านั้น
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSmartSuggestions(data.suggestions);
        setWhtCategory(data.suggestions?.whtCategory || 'ค่าบริการ');
        setPndType(data.suggestions?.pndType || 'ภ.ง.ด.53');
      }
    } catch (error) {
      console.log('Failed to fetch smart suggestions:', error);
    }
  }, [transaction, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCustomerId('');
      setIsAddingNew(false);
      setIsProcessing(false);
      setAutoResolved(false);
      setWhtCategory('ค่าบริการ'); // รีเซ็ต WHT category เป็นค่าเริ่มต้น
      setPndType('ภ.ง.ด.53'); // รีเซ็ต PND type เป็นค่าเริ่มต้น
      setSmartSuggestions(null);
      setFormState({
        contactType: 'corporate', legalEntityType: 'บริษัทจำกัด', companyName: '', branchType: 'main',
        branch_number: '', prefix: 'นาย', firstName: '', lastName: '', taxId: '', 
        contactPerson: '', streetAddress: '', subdistrict: '', district: '', 
        province: '', postalCode: '', email: '', phone: '', website: '', fax: '',
      });
    } else {
      // เมื่อเปิด modal ให้เรียก Smart Suggestions
      fetchSmartSuggestions();
    }
  }, [isOpen, fetchSmartSuggestions]);

  // Auto-detect contact from transaction.description suffix: (คู่ค้า: NAME)
  const inferredContactName = useMemo(() => {
    const desc = transaction?.description || '';
    const match = desc.match(/\(คู่ค้า:\s*([^\)]+)\)/);
    return (match?.[1] || '').trim();
  }, [transaction?.description]);

  const autoCustomer = useMemo(() => {
    if (!inferredContactName) return undefined;
    return customers.find(c => c.name === inferredContactName);
  }, [customers, inferredContactName]);

  // When modal opens and customers loaded, auto-select the inferred customer if available
  useEffect(() => {
    if (!isOpen || customersLoading) return;
    if (autoCustomer) {
      setSelectedCustomerId(autoCustomer.id);
      setIsAddingNew(false);
      setAutoResolved(true);
    } else {
      setAutoResolved(false);
    }
  }, [isOpen, customersLoading, autoCustomer]);

  const customerOptions: SelectOption[] = [
    ...customers.map(c => ({ value: c.id, label: c.name })),
    { value: 'add_new', label: <span className="text-blue-600 font-bold flex items-center gap-2"><Plus size={14} /> เพิ่มผู้ติดต่อใหม่</span> }
  ];

  // ตัวเลือกประเภทการหัก ณ ที่จ่าย
  const whtCategoryOptions: SelectOption[] = [
    { value: 'เงินเดือน ค่าจ้าง', label: 'เงินเดือน ค่าจ้าง' },
    { value: 'ค่าธรรมเนียม ค่านายหน้า', label: 'ค่าธรรมเนียม ค่านายหน้า' },
    { value: 'ค่าแห่งลิขสิทธิ์', label: 'ค่าแห่งลิขสิทธิ์' },
    { value: 'ค่าดอกเบี้ย', label: 'ค่าดอกเบี้ย' },
    { value: 'เงินปันผล', label: 'เงินปันผล' },
    { value: 'ค่าเช่า', label: 'ค่าเช่า' },
    { value: 'ค่าวิชาชีพอิสระ', label: 'ค่าวิชาชีพอิสระ' },
    { value: 'ค่ารับเหมา', label: 'ค่ารับเหมา' },
    { value: 'ค่าบริการ', label: 'ค่าบริการ' },
    { value: 'ค่าโฆษณา', label: 'ค่าโฆษณา' },
    { value: 'ค่าขนส่ง', label: 'ค่าขนส่ง' },
    { value: 'อื่นๆ', label: 'อื่นๆ' },
  ];

  // ตัวเลือกประเภทแบบแสดงรายการภาษี (ภ.ง.ด.)
  const pndTypeOptions: SelectOption[] = [
    { value: 'ภ.ง.ด.1ก', label: 'ภ.ง.ด.1ก' },
    { value: 'ภ.ง.ด.1ก พิเศษ', label: 'ภ.ง.ด.1ก พิเศษ' },
    { value: 'ภ.ง.ด.2', label: 'ภ.ง.ด.2' },
    { value: 'ภ.ง.ด.3', label: 'ภ.ง.ด.3' },
    { value: 'ภ.ง.ด.53', label: 'ภ.ง.ด.53' },
    { value: 'ภ.ง.ด.2ก', label: 'ภ.ง.ด.2ก' },
    { value: 'ภ.ง.ด.3ก', label: 'ภ.ง.ด.3ก' },
  ];

  const handleCustomerSelect = (customerId: string) => {
    if (customerId === 'add_new') {
      setIsAddingNew(true);
      setSelectedCustomerId('');
    } else {
      setIsAddingNew(false);
      setSelectedCustomerId(customerId);
    }
  };

  const handleCreateCertificate = async () => {
    setIsProcessing(true);
    let vendorData: { name: string; address: string; taxId: string; };

    try {
        if (isAddingNew) {
            const { streetAddress, subdistrict, district, province, postalCode, legalEntityType, companyName, prefix, firstName, lastName, ...rest } = formState;
            const fullAddress = [streetAddress, subdistrict, district, province, postalCode].filter(Boolean).join(' ');
            const displayName = formState.contactType === 'corporate' ? `${legalEntityType} ${companyName}`.trim() : `${prefix} ${firstName} ${lastName}`.trim();
            if (!displayName || !formState.taxId) {
                alert('กรุณากรอกชื่อและเลขผู้เสียภาษีของผู้ติดต่อใหม่');
                setIsProcessing(false);
                return;
            }

            const newCustomerData = {
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

            const { data: savedCustomer, error } = await supabase
                .from('customers')
                .insert(newCustomerData)
                .select()
                .single();

            if (error) throw error;

            invalidateCustomersQuery();
            
            vendorData = { name: savedCustomer.name, address: savedCustomer.address, taxId: savedCustomer.tax_id! };

    } else {
      // Prefer auto-resolved customer from transaction; fallback to manual selection
      const customer = autoCustomer || customers.find(c => c.id === selectedCustomerId);
      if (!customer) { alert('ไม่พบผู้ติดต่อจากรายการ โปรดตรวจสอบว่ามี (คู่ค้า: ชื่อ) ในรายละเอียด หรือเพิ่มผู้ติดต่อใหม่'); setIsProcessing(false); return; }
      if (!customer.tax_id) { alert('ผู้ติดต่อที่เลือกไม่มีเลขผู้เสียภาษี กรุณาอัปเดตข้อมูล'); setIsProcessing(false); return; }
      vendorData = { name: customer.name, address: customer.address, taxId: customer.tax_id };
    }

    const response = await fetch('/api/generate-wht-certificate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              transactionId: transaction.id, 
              vendorData,
              whtCategory: whtCategory, // ส่งประเภท WHT ไปด้วย
              pndType: pndType // ส่งประเภท PND ไปด้วย
            }),
        });

    const resJson = await response.json();
    if (!response.ok) {
      throw new Error(resJson.error || 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    }
    
    // ✅ แจ้งให้ผู้ใช้ทราบว่าไฟล์ถูกอัปโหลดอัตโนมัติแล้ว
    const fileName = resJson.fileName || 'หนังสือรับรองหัก ณ ที่จ่าย';
    alert(`✅ สร้างหนังสือรับรองหัก ณ ที่จ่ายสำเร็จ!\n\n📁 ไฟล์: ${fileName}\n💾 ได้ถูกอัปโหลดและบันทึกไว้ในระบบอัตโนมัติแล้ว\n\n� คุณสามารถดูหรือดาวน์โหลดไฟล์ได้จากรายการธุรกรรม`);
    onCertificateCreated();
    onClose();

    } catch (error) {
        console.error("Error creating certificate:", error);
        alert((error as Error).message);
    } finally {
        setIsProcessing(false);
    }
  };

  const supabase = createClient();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="สร้างหนังสือรับรองหัก ณ ที่จ่าย" size="5xl">
      <div className="space-y-4">
        {/* 🤖 Smart Suggestions Display */}
        {smartSuggestions && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start space-x-2">
              <div className="text-blue-500">🤖</div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-800 mb-2">ระบบแนะนำอัตโนมัติ</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">ภ.ง.ด.:</span>
                    <span className="ml-2 text-blue-600">{smartSuggestions.pndType}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">ประเภทเงินได้:</span>
                    <span className="ml-2 text-blue-600">{smartSuggestions.whtCategory}</span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 ระบบวิเคราะห์จากประเภทรายการและรายละเอียด คุณสามารถแก้ไขได้ตามต้องการ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ส่วนเลือกประเภท WHT */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ประเภทเงินได้ที่หัก ณ ที่จ่าย <span className="text-red-500">*</span>
            {smartSuggestions && (
              <span className="ml-2 text-xs text-blue-600">
                (แนะนำ: {smartSuggestions.whtCategory})
              </span>
            )}
          </label>
          <Select
            value={whtCategory}
            onChange={setWhtCategory}
            options={whtCategoryOptions}
            placeholder="เลือกประเภทเงินได้"
            disabled={isProcessing}
          />
          <p className="text-xs text-gray-500 mt-1">
            เลือกประเภทเงินได้เพื่อให้การสร้างเอกสารถูกต้องตามกฎหมาย
          </p>
        </div>

        {/* ส่วนเลือกประเภทแบบแสดงรายการภาษี */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ประเภทแบบแสดงรายการภาษี <span className="text-red-500">*</span>
            {smartSuggestions && (
              <span className="ml-2 text-xs text-blue-600">
                (แนะนำ: {smartSuggestions.pndType})
              </span>
            )}
          </label>
          <Select
            value={pndType}
            onChange={setPndType}
            options={pndTypeOptions}
            placeholder="เลือกประเภท ภ.ง.ด."
            disabled={isProcessing}
          />
          <p className="text-xs text-gray-500 mt-1">
            เลือกแบบแสดงรายการภาษีที่ต้องการใช้ (โดยทั่วไปใช้ ภ.ง.ด.53)
          </p>
        </div>

        {autoCustomer ? (
          <div className="rounded-lg border p-3 bg-slate-50">
            <p className="text-sm text-slate-600 mb-2">สำหรับผู้รับเงิน (ผู้ถูกหักภาษี)</p>
            <p className="font-semibold text-slate-800">{autoCustomer.name}</p>
            <div className="text-sm text-slate-700 mt-1">
              <p><span className="text-slate-500">เลขผู้เสียภาษี:</span> {autoCustomer.tax_id || '—'}</p>
              <p><span className="text-slate-500">ที่อยู่:</span> {autoCustomer.address || '—'}</p>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สำหรับผู้รับเงิน (ผู้ถูกหักภาษี)</label>
            <Select
              value={selectedCustomerId}
              onChange={handleCustomerSelect}
              options={customerOptions}
              placeholder={customersLoading ? 'กำลังโหลด...' : 'เลือกผู้ติดต่อที่มีอยู่'}
              disabled={isProcessing}
            />
          </div>
        )}

        {isAddingNew && (
          <div className="p-4 border rounded-lg mt-4 bg-slate-50">
            <CustomerFormFields 
                formState={formState}
                onFormChange={handleFormChange}
                onTaxIdChange={handleTaxIdChange}
                isModal={true}
            />
          </div>
        )}

        {/* ✅ [แก้ไข] ย้ายปุ่มกลับเข้ามาไว้ข้างใน Modal */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isProcessing}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={handleCreateCertificate}
            disabled={
              isProcessing ||
              customersLoading ||
              (!autoCustomer && !selectedCustomerId && !isAddingNew)
            }
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isProcessing ? 'กำลังสร้าง...' : 'สร้างเอกสาร'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
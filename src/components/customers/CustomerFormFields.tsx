// src/components/customers/CustomerFormFields.tsx
"use client";

import React, { useState, useCallback, useMemo, useRef, KeyboardEvent, forwardRef } from 'react';
import { Input as UIInput } from '@/components/ui/Input';
import { Select as UISelect, SelectOption } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ChevronDown, ChevronUp } from 'lucide-react';

// --- UI Components & Helpers ---
const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
    <UIInput ref={ref} {...props} />
));
Input.displayName = 'Input';
const Select = (props: React.ComponentProps<typeof UISelect>) => <UISelect {...props} />;

const RadioGroup = ({ name, options, selectedValue, onChange }: { name: string, options: { value: string, label: string }[], selectedValue: string, onChange: (value: string) => void }) => (
    <div className="flex items-center space-x-4 mt-2">
        {options.map(option => (
            <label key={option.value} className="flex items-center space-x-2 cursor-pointer text-sm">
                <input type="radio" name={name} value={option.value} checked={selectedValue === option.value} onChange={(e) => onChange(e.target.value)} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                <span>{option.label}</span>
            </label>
        ))}
    </div>
);

const TaxIdInput = React.memo(({ initialValue = "", onTaxIdChange }: { initialValue?: string, onTaxIdChange: (id: string) => void }) => {
    const [taxId, setTaxId] = useState<string[]>(() => initialValue.split('').concat(Array(13).fill('')).slice(0, 13));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleInputChange = useCallback((index: number, value: string) => {
        if (!/^[0-9]$/.test(value) && value !== '') return;
        const newTaxId = [...taxId]; newTaxId[index] = value; setTaxId(newTaxId);
        onTaxIdChange(newTaxId.join(''));
        if (value && index < 12) { inputRefs.current[index + 1]?.focus(); }
    }, [taxId, onTaxIdChange]);

    const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && taxId[index] === '' && index > 0) { inputRefs.current[index - 1]?.focus(); }
    }, [taxId]);
    
    const taxInputFields = useMemo(() => {
        let overallIndex = 0;
        const segments = [1, 4, 5, 2, 1];
        return segments.map((length, segIndex) => (
            <React.Fragment key={segIndex}>
                {segIndex > 0 && <span className="text-gray-400">-</span>}
                {Array.from({ length }).map(() => {
                    const currentIndex = overallIndex++;
                    return ( <Input key={currentIndex} ref={(el) => { if (el) inputRefs.current[currentIndex] = el; }} type="text" maxLength={1} value={taxId[currentIndex]} onChange={(e) => handleInputChange(currentIndex, e.target.value)} onKeyDown={(e) => handleKeyDown(currentIndex, e)} className="w-8 text-center p-2" /> );
                })}
            </React.Fragment>
        ));
    }, [taxId, handleInputChange, handleKeyDown]);
    
    return ( <div><label className="block text-sm font-medium text-gray-700 mb-1">เลขทะเบียน 13 หลัก</label><div className="flex items-center space-x-1">{taxInputFields}</div></div> );
});
TaxIdInput.displayName = 'TaxIdInput';

const ExpandableSection = ({ title, isExpanded, onToggle, children }: { title: string, isExpanded: boolean, onToggle: () => void, children: React.ReactNode }) => ( <div className="border-t pt-4 mt-6"><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-gray-800">{title}</h3><button type="button" onClick={onToggle} className="text-blue-600 hover:underline text-sm flex items-center">{isExpanded ? 'ย่อ' : 'ขยาย'}{isExpanded ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}</button></div>{isExpanded && children}</div> );
const legalEntityOptions: SelectOption[] = [ { value: 'บริษัทจำกัด', label: 'บริษัทจำกัด' }, { value: 'ห้างหุ้นส่วนจำกัด', label: 'ห้างหุ้นส่วนจำกัด' }, { value: 'คณะบุคคล', label: 'คณะบุคคล' } ];
const prefixOptions: SelectOption[] = [ { value: 'นาย', label: 'นาย' }, { value: 'นาง', label: 'นาง' }, { value: 'นางสาว', label: 'นางสาว' } ];

const CorporateForm = React.memo(({ formState, onFormChange, onTaxIdChange }: any) => (
    <div className="space-y-4">
        <TaxIdInput initialValue={formState.taxId} onTaxIdChange={onTaxIdChange} />
        <div><label className="block text-sm font-medium text-gray-700 mb-1">ประเภทกิจการ <span className="text-red-500">*</span></label><RadioGroup name="branchType" selectedValue={formState.branchType} onChange={(value) => onFormChange('branchType', value)} options={[{ value: 'main', label: 'สำนักงานใหญ่' }, { value: 'branch', label: 'สาขา' }]} /></div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อกิจการ <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Select value={formState.legalEntityType} onChange={(value) => onFormChange('legalEntityType', value)} options={legalEntityOptions} />
                <div className="md:col-span-2 flex items-center space-x-2"><Input placeholder="ชื่อบริษัท" value={formState.companyName} onChange={e => onFormChange('companyName', e.target.value)} required />{formState.branchType === 'branch' && (<Input placeholder="เลขที่สาขา" className="w-28" value={formState.branch_number} onChange={e => onFormChange('branch_number', e.target.value)} />)}</div>
            </div>
        </div>
    </div>
));
CorporateForm.displayName = 'CorporateForm';
const IndividualForm = React.memo(({ formState, onFormChange, onTaxIdChange }: any) => (
    <div className="space-y-4">
        <TaxIdInput initialValue={formState.taxId} onTaxIdChange={onTaxIdChange} />
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Select value={formState.prefix} onChange={(value) => onFormChange('prefix', value)} options={prefixOptions} />
                <Input placeholder="ชื่อจริง" value={formState.firstName} onChange={e => onFormChange('firstName', e.target.value)} required />
                <Input placeholder="นามสกุล" value={formState.lastName} onChange={e => onFormChange('lastName', e.target.value)} required />
            </div>
        </div>
    </div>
));
IndividualForm.displayName = 'IndividualForm';

interface CustomerFormFieldsProps {
    formState: any;
    onFormChange: (field: string, value: any) => void;
    onTaxIdChange: (id: string) => void;
    isModal?: boolean; // Optional prop to distinguish context
}

export default function CustomerFormFields({ formState, onFormChange, onTaxIdChange, isModal = false }: CustomerFormFieldsProps) {
    const [isAddressExpanded, setIsAddressExpanded] = useState(true);
    const [isContactInfoExpanded, setIsContactInfoExpanded] = useState(true);

    return (
        <div className="space-y-6">
            <RadioGroup name={`contactType-${isModal ? 'modal' : 'page'}`} selectedValue={formState.contactType} onChange={(value) => onFormChange('contactType', value)} options={[{ value: 'corporate', label: 'นิติบุคคล' }, { value: 'individual', label: 'บุคคลธรรมดา' }]}/>
            <div className="border-t pt-4">
                {formState.contactType === 'corporate' 
                    ? <CorporateForm formState={formState} onFormChange={onFormChange} onTaxIdChange={onTaxIdChange} /> 
                    : <IndividualForm formState={formState} onFormChange={onFormChange} onTaxIdChange={onTaxIdChange} />
                }
            </div>
            <ExpandableSection title="ที่อยู่จดทะเบียน" isExpanded={isAddressExpanded} onToggle={() => setIsAddressExpanded(!isAddressExpanded)}><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">ผู้ติดต่อ</label><Input placeholder="ระบุชื่อผู้ติดต่อ (ถ้ามี)" value={formState.contactPerson} onChange={e => onFormChange('contactPerson', e.target.value)} /></div><div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label><Textarea placeholder="บ้านเลขที่, ซอย, ถนน, อาคาร, ห้อง" value={formState.streetAddress} onChange={e => onFormChange('streetAddress', e.target.value)} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">แขวง/ตำบล</label><Input value={formState.subdistrict} onChange={e => onFormChange('subdistrict', e.target.value)} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">เขต/อำเภอ</label><Input value={formState.district} onChange={e => onFormChange('district', e.target.value)} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">จังหวัด</label><Input value={formState.province} onChange={e => onFormChange('province', e.target.value)} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">รหัสไปรษณีย์</label><Input value={formState.postalCode} onChange={e => onFormChange('postalCode', e.target.value)} /></div></div></ExpandableSection>
            <ExpandableSection title="ช่องทางการติดต่อ" isExpanded={isContactInfoExpanded} onToggle={() => setIsContactInfoExpanded(!isContactInfoExpanded)}><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label><Input type="email" value={formState.email} onChange={e => onFormChange('email', e.target.value)} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label><Input type="tel" value={formState.phone} onChange={e => onFormChange('phone', e.target.value)} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">เว็บไซต์</label><Input type="url" value={formState.website} onChange={e => onFormChange('website', e.target.value)} /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">เบอร์แฟกซ์</label><Input value={formState.fax} onChange={e => onFormChange('fax', e.target.value)} /></div></div></ExpandableSection>
        </div>
    );
}
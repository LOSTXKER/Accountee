// src/components/transactions/TransactionForm.tsx
"use client";

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { Transaction, Category, VatType, TransactionType, Customer } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Select';
import { useSearchParams } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { useCustomers } from '@/hooks/useCustomers';
import CustomerFormFields from '@/components/customers/CustomerFormFields';

interface TransactionFormProps {
  onSave: (data: Partial<Transaction>) => void;
  onClose: () => void;
  categories: Category[];
  businessId: string;
  transactionType: 'income' | 'expense';
  transactionToEdit?: Partial<Transaction> | null;
  isEditOnly?: boolean;
  initialData?: Partial<Transaction>;
    isReadOnly?: boolean;
}

const FormSection = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="border-t border-slate-200 pt-6 mt-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

export default function TransactionForm({
    onSave, onClose, categories, businessId, transactionType, transactionToEdit, isEditOnly = false, initialData, isReadOnly = false
}: TransactionFormProps) {
    // Helper: local YYYY-MM-DD to avoid UTC off-by-one in some timezones
    const getTodayLocalYMD = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const [date, setDate] = useState(getTodayLocalYMD());
  const [description, setDescription] = useState('');
  const [mainCategoryId, setMainCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [finalCategoryName, setFinalCategoryName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [vatType, setVatType] = useState<VatType>('none');
  const [whtRate, setWhtRate] = useState<number>(0);
    const [isCustomWht, setIsCustomWht] = useState<boolean>(false);
    const [customWhtInput, setCustomWhtInput] = useState<string>('');
    const [reference, setReference] = useState<string>('');
        const [descSuggestions, setDescSuggestions] = useState<string[]>([]);
        const [filteredDescSuggestions, setFilteredDescSuggestions] = useState<string[]>([]);
        const [showDescDropdown, setShowDescDropdown] = useState<boolean>(false);
  const searchParams = useSearchParams();

    // Contact state
    const { customers, loading: customersLoading, invalidateCustomersQuery } = useCustomers(businessId);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
    const [editingCustomerId, setEditingCustomerId] = useState<string>('');
    // Full customer form state for modal (like Settings)
    const [fullCustomer, setFullCustomer] = useState({
        contactType: 'corporate' as 'corporate' | 'individual',
        taxId: '',
        branchType: 'main' as 'main' | 'branch' | 'unspecified',
        legalEntityType: 'บริษัทจำกัด',
        companyName: '',
        branch_number: '',
        prefix: 'นาย',
        firstName: '',
        lastName: '',
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

    // Prefill modal form from an existing customer
    const mapCustomerToForm = (c: Customer) => {
        setFullCustomer({
            contactType: c.contact_type,
            taxId: c.tax_id || '',
            branchType: (c.branch_type as any) === 'branch' ? 'branch' : 'main',
            legalEntityType: c.legal_entity_type || 'บริษัทจำกัด',
            companyName: c.company_name || (c.contact_type === 'corporate' ? c.name : ''),
            branch_number: c.branch_number || '',
            prefix: c.prefix || 'นาย',
            firstName: c.first_name || '',
            lastName: c.last_name || '',
            contactPerson: c.contact_person || '',
            streetAddress: c.street_address || '',
            subdistrict: c.subdistrict || '',
            district: c.district || '',
            province: c.province || '',
            postalCode: c.postal_code || '',
            email: c.email || '',
            phone: c.phone || '',
            website: c.website || '',
            fax: c.fax || '',
        });
    };

    const openEditCustomer = () => {
        const c = customers.find(x => x.id === selectedCustomerId);
        if (!c) return;
        setEditingCustomerId(c.id);
        mapCustomerToForm(c);
        setIsEditCustomerOpen(true);
    };

    useEffect(() => {

    const dataToLoad = transactionToEdit || initialData;
    if (dataToLoad) {
        setDate(dataToLoad.date ? new Date(dataToLoad.date as any).toISOString().split('T')[0] : getTodayLocalYMD());
    const desc = dataToLoad.description || '';
        const cleanedDesc = desc.replace(/ \(คู่ค้า: .*\)$/,'');
        setDescription(cleanedDesc);
        const currentVatType = dataToLoad.vat_type || 'none';
        setVatType(currentVatType);
        if (currentVatType === 'include') {
            setAmountInput(String(dataToLoad.amount || ''));
        } else {
            setAmountInput(String(dataToLoad.subtotal || dataToLoad.amount || ''));
        }
    setWhtRate(dataToLoad.withholdingtax_rate || 0);
    setIsCustomWht(false);
    setCustomWhtInput('');
        
        const currentCategory = categories.find((c: Category) => c.name === dataToLoad.category);
        if (currentCategory) {
            if(currentCategory.parent_id) {
                const parent = categories.find((c: Category) => c.id === currentCategory.parent_id);
                if (parent) {
                    setMainCategoryId(parent.id);
                    setSubCategoryId(currentCategory.id);
                }
            } else {
                setMainCategoryId(currentCategory.id);
                setSubCategoryId('');
            }
        } else {
            setMainCategoryId('');
            setSubCategoryId('');
        }
    } else {
        setDate(getTodayLocalYMD());
        setDescription('');
        setAmountInput('');
        setVatType('none');
        setWhtRate(0);
    setIsCustomWht(false);
    setCustomWhtInput('');
    setReference('');
        setMainCategoryId('');
        setSubCategoryId('');
    }
  }, [transactionToEdit, initialData, categories, searchParams]);

    // Use the original description (with suffixes) to infer contact; keep cleaned input for the field
    const originalDescription = useMemo(() => {
        const dataToLoad = transactionToEdit || initialData;
        return (dataToLoad?.description as string) || '';
    }, [transactionToEdit, initialData]);

    const inferredContactName = useMemo(() => {
        if (!originalDescription) return '';
        const match = originalDescription.match(/\(คู่ค้า:\s*([^\)]+)\)/);
        return match && match[1] ? match[1].trim() : '';
    }, [originalDescription]);

    // Preselect contact from original description suffix when customers load
    useEffect(() => {
        if (!selectedCustomerId && inferredContactName && customers && customers.length > 0) {
            const found = customers.find(c => c.name === inferredContactName);
            if (found) setSelectedCustomerId(found.id);
        }
    }, [customers, inferredContactName, selectedCustomerId]);

    // Load recent description suggestions from localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const key = `tx_desc_suggestions_${businessId}`;
        try {
            const saved = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(saved)) setDescSuggestions(saved.slice(0, 20));
        } catch {}
    }, [businessId]);

    const saveDescSuggestion = (text: string) => {
        if (typeof window === 'undefined') return;
        const key = `tx_desc_suggestions_${businessId}`;
        const trimmed = text.trim();
        if (!trimmed) return;
        const next = [trimmed, ...descSuggestions.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 20);
        setDescSuggestions(next);
        try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
    };

    const handleDescInput = (val: string) => {
        setDescription(val);
        const q = val.trim().toLowerCase();
        if (q.length >= 1) {
            const filtered = descSuggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 8);
            setFilteredDescSuggestions(filtered);
            setShowDescDropdown(filtered.length > 0);
        } else {
            setShowDescDropdown(false);
        }
    };

  const { subtotal, vatAmount, total } = useMemo(() => {
    const input = parseFloat(amountInput) || 0;
    if (isNaN(input)) return { subtotal: 0, vatAmount: 0, total: 0 };
    let sub = 0, vat = 0, tot = 0;
    switch (vatType) {
        case 'include': tot = input; sub = input / 1.07; vat = tot - sub; break;
        case 'exclude': sub = input; vat = input * 0.07; tot = sub + vat; break;
        default: sub = input; tot = input; vat = 0; break;
    }
    return { subtotal: sub, vatAmount: vat, total: tot };
  }, [amountInput, vatType]);

    const withholdingTax = useMemo(() => subtotal * (whtRate / 100), [subtotal, whtRate]);
    const netAfterWht = useMemo(() => Math.max(total - withholdingTax, 0), [total, withholdingTax]);

  const { mainCategories, subCategoriesByParent } = useMemo(() => {
    const relevantType: TransactionType = transactionType;
    const relevantCategories = categories.filter((c: Category) => c.type === relevantType || (relevantType === 'expense' && c.type === 'cogs'));
    const main: Category[] = [];
    const subByParent: Record<string, Category[]> = {};
    relevantCategories.forEach((cat: Category) => { if (!cat.parent_id) { main.push(cat); subByParent[cat.id] = []; } });
    relevantCategories.forEach((cat: Category) => { if (cat.parent_id && subByParent[cat.parent_id]) { subByParent[cat.parent_id].push(cat); } });
    main.sort((a,b) => a.name.localeCompare(b.name));
    Object.values(subByParent).forEach(sub => sub.sort((a,b) => a.name.localeCompare(b.name)));
    return { mainCategories: main, subCategoriesByParent: subByParent };
  }, [categories, transactionType]);

  const mainCategoryOptions: SelectOption[] = mainCategories.map(cat => ({ value: cat.id, label: cat.name }));
  const availableSubCategories = mainCategoryId ? subCategoriesByParent[mainCategoryId] : [];
  const subCategoryOptions: SelectOption[] = availableSubCategories.map(cat => ({ value: cat.id, label: cat.name }));
    const vatTypeOptions: SelectOption[] = [ { value: 'none', label: 'ไม่มี VAT' }, { value: 'include', label: 'ราคารวม VAT แล้ว' }, { value: 'exclude', label: 'ราคาก่อน VAT' }, ];
    const whtRateOptions: SelectOption[] = [
        { value: '0', label: 'ไม่มี' }, { value: '1', label: '1%' }, { value: '2', label: '2%' }, { value: '3', label: '3%' }, { value: '5', label: '5%' }, { value: '10', label: '10%' }, { value: 'custom', label: 'กำหนดเอง…' },
    ];

  useEffect(() => {
    let finalCat: Category | undefined;
    if (subCategoryId) {
        finalCat = availableSubCategories.find((c: Category) => c.id === subCategoryId);
    } else if (mainCategoryId) {
        finalCat = mainCategories.find((c: Category) => c.id === mainCategoryId);
    }
    setFinalCategoryName(finalCat?.name || '');
  }, [mainCategoryId, subCategoryId, mainCategories, availableSubCategories]);

    const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
        if (isReadOnly) { return; }
                if (!amountInput || !finalCategoryName || !date) {
                alert('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน: วันที่, หมวดหมู่, และจำนวนเงิน');
        return;
    }

        // Require contact for every transaction
        if (!selectedCustomerId) {
            alert('กรุณาเลือกผู้ติดต่อ (ลูกค้า/ผู้ขาย) สำหรับทุกรายการ');
            return;
        }

        // Warn (non-blocking): VAT without customer tax ID
        const selected = customers.find(c => c.id === selectedCustomerId);
        if (vatType !== 'none' && selected && !selected.tax_id) {
            const proceed = typeof window !== 'undefined'
                ? window.confirm('ผู้ติดต่อยังไม่มีเลขผู้เสียภาษี (Tax ID) แต่คุณเลือก VAT ไว้\n\nคุณต้องการบันทึกต่อเลยหรือจะแก้ไขข้อมูลผู้ติดต่อก่อน?\n\nกด OK = บันทึกต่อ, Cancel = แก้ไขผู้ติดต่อ')
                : true;
            if (!proceed) {
                setEditingCustomerId(selected.id);
                mapCustomerToForm(selected);
                setIsEditCustomerOpen(true);
                return;
            }
        }

    const finalType = categories.find((c: Category) => c.name === finalCategoryName)?.type || transactionType;
    let statusToSave: Transaction['status'] | undefined = undefined;
    if (!transactionToEdit || !transactionToEdit.id) {
        statusToSave = finalType === 'income' ? 'รอรับเงิน' : 'รอชำระ';
    }

        // Apply contact info to description as a suffix to persist without schema change
        // Normalize and rebuild suffixes (คู่ค้า, อ้างอิง)
    let finalDescription = description.trim() || finalCategoryName || (transactionType === 'income' ? 'รายรับ' : 'รายจ่าย');
        const contact = customers.find((c: Customer) => c.id === selectedCustomerId);
        const contactSuffixRegex = / \(คู่ค้า: [^\)]*\)/g;
        const refSuffixRegex = / \(อ้างอิง: [^\)]*\)/g;
        finalDescription = finalDescription.replace(contactSuffixRegex, '').replace(refSuffixRegex, '').trim();
        const suffixes: string[] = [];
        if (contact) suffixes.push(`(คู่ค้า: ${contact.name})`);
        if (reference.trim()) suffixes.push(`(อ้างอิง: ${reference.trim()})`);
        if (suffixes.length) finalDescription = `${finalDescription} ${suffixes.join(' ')}`.trim();

    // Save base description to suggestions before appending suffixes
        if (description.trim()) {
            saveDescSuggestion(description.trim());
        }

    const data: Partial<Transaction> = {
                // Persist as Date object; caller converts to ISO when inserting. Keep local date to avoid timezone drift.
                date: new Date(`${date}T00:00:00`), 
                description: finalDescription, 
        type: finalType, 
        category: finalCategoryName,
        vat_type: vatType, 
        subtotal, 
        vat_amount: vatAmount, 
        amount: total, 
        withholdingtax_rate: whtRate, 
        withholdingtax: withholdingTax,
        attachment_status: 'pending' 
    };
    if (statusToSave) { data.status = statusToSave; }
    onSave(data);
  };

    const customerOptions: SelectOption[] = useMemo(() => {
        const opts: SelectOption[] = [
            { value: 'add_new', label: <span className="text-blue-600 font-semibold">+ เพิ่มผู้ติดต่อใหม่</span> },
            ...customers.map(c => ({ value: c.id, label: `${c.name}${c.tax_id ? ` (${c.tax_id})` : ''}` }))
        ];
        return opts;
    }, [customers]);

        const handleCustomerSelect = (val: string) => {
        if (val === 'add_new') {
            setIsAddCustomerOpen(true);
            return;
        }
        setSelectedCustomerId(val);
    };

        const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);

        const handleCreateCustomerFull = async () => {
        try {
            // Basic validation
            if (fullCustomer.contactType === 'corporate') {
                if (!fullCustomer.companyName.trim()) { alert('กรุณากรอกชื่อกิจการ'); return; }
            } else {
                if (!fullCustomer.firstName.trim() || !fullCustomer.lastName.trim()) { alert('กรุณากรอกชื่อและนามสกุล'); return; }
            }

            const supabase = (await import('@/lib/supabase/client')).createClient();
            const composedName = fullCustomer.contactType === 'corporate'
                ? fullCustomer.companyName.trim()
                : `${fullCustomer.prefix ? fullCustomer.prefix + ' ' : ''}${fullCustomer.firstName.trim()} ${fullCustomer.lastName.trim()}`.trim();

            const simpleAddress = [fullCustomer.streetAddress, fullCustomer.subdistrict, fullCustomer.district, fullCustomer.province, fullCustomer.postalCode]
                .filter(Boolean)
                .join(' ')
                .trim();

            const insertPayload = {
                businessid: businessId,
                contact_type: fullCustomer.contactType,
                legal_entity_type: fullCustomer.contactType === 'corporate' ? fullCustomer.legalEntityType : null,
                company_name: fullCustomer.contactType === 'corporate' ? composedName : null,
                branch_type: fullCustomer.contactType === 'corporate' ? fullCustomer.branchType : 'unspecified',
                branch_number: fullCustomer.contactType === 'corporate' && fullCustomer.branchType === 'branch' ? (fullCustomer.branch_number || null) : null,

                prefix: fullCustomer.contactType === 'individual' ? fullCustomer.prefix : null,
                first_name: fullCustomer.contactType === 'individual' ? fullCustomer.firstName.trim() : null,
                last_name: fullCustomer.contactType === 'individual' ? fullCustomer.lastName.trim() : null,

                name: composedName,
                tax_id: fullCustomer.taxId ? fullCustomer.taxId.trim() : null,

                address: simpleAddress,
                street_address: fullCustomer.streetAddress || null,
                subdistrict: fullCustomer.subdistrict || null,
                district: fullCustomer.district || null,
                province: fullCustomer.province || null,
                postal_code: fullCustomer.postalCode || null,

                contact_person: fullCustomer.contactPerson || null,
                email: fullCustomer.email || null,
                phone: fullCustomer.phone || null,
                website: fullCustomer.website || null,
                fax: fullCustomer.fax || null,
            } as any;

            const { data: insertedRows, error } = await supabase.from('customers').insert([insertPayload]).select();
            if (error) throw error;

            setIsAddCustomerOpen(false);
            setFullCustomer({
                contactType: 'corporate', taxId: '', branchType: 'main', legalEntityType: 'บริษัทจำกัด', companyName: '', branch_number: '', prefix: 'นาย', firstName: '', lastName: '', contactPerson: '', streetAddress: '', subdistrict: '', district: '', province: '', postalCode: '', email: '', phone: '', website: '', fax: ''
            });
            invalidateCustomersQuery();
            if (insertedRows && insertedRows.length > 0) {
                setSelectedCustomerId(insertedRows[0].id);
            }
        } catch (err) {
            console.error('Failed to add customer (full)', err);
            alert('เกิดข้อผิดพลาดในการเพิ่มผู้ติดต่อ');
        }
        };

        const handleUpdateCustomerFull = async () => {
        try {
            if (!editingCustomerId) return;
            if (fullCustomer.contactType === 'corporate') {
                if (!fullCustomer.companyName.trim()) { alert('กรุณากรอกชื่อกิจการ'); return; }
            } else {
                if (!fullCustomer.firstName.trim() || !fullCustomer.lastName.trim()) { alert('กรุณากรอกชื่อและนามสกุล'); return; }
            }

            const supabase = (await import('@/lib/supabase/client')).createClient();
            const composedName = fullCustomer.contactType === 'corporate'
                ? fullCustomer.companyName.trim()
                : `${fullCustomer.prefix ? fullCustomer.prefix + ' ' : ''}${fullCustomer.firstName.trim()} ${fullCustomer.lastName.trim()}`.trim();

            const simpleAddress = [fullCustomer.streetAddress, fullCustomer.subdistrict, fullCustomer.district, fullCustomer.province, fullCustomer.postalCode]
                .filter(Boolean)
                .join(' ')
                .trim();

            const updatePayload = {
                contact_type: fullCustomer.contactType,
                legal_entity_type: fullCustomer.contactType === 'corporate' ? fullCustomer.legalEntityType : null,
                company_name: fullCustomer.contactType === 'corporate' ? composedName : null,
                branch_type: fullCustomer.contactType === 'corporate' ? fullCustomer.branchType : 'unspecified',
                branch_number: fullCustomer.contactType === 'corporate' && fullCustomer.branchType === 'branch' ? (fullCustomer.branch_number || null) : null,

                prefix: fullCustomer.contactType === 'individual' ? fullCustomer.prefix : null,
                first_name: fullCustomer.contactType === 'individual' ? fullCustomer.firstName.trim() : null,
                last_name: fullCustomer.contactType === 'individual' ? fullCustomer.lastName.trim() : null,

                name: composedName,
                tax_id: fullCustomer.taxId ? fullCustomer.taxId.trim() : null,

                address: simpleAddress,
                street_address: fullCustomer.streetAddress || null,
                subdistrict: fullCustomer.subdistrict || null,
                district: fullCustomer.district || null,
                province: fullCustomer.province || null,
                postal_code: fullCustomer.postalCode || null,

                contact_person: fullCustomer.contactPerson || null,
                email: fullCustomer.email || null,
                phone: fullCustomer.phone || null,
                website: fullCustomer.website || null,
                fax: fullCustomer.fax || null,
            } as any;

            const { data: updatedRows, error } = await supabase.from('customers').update(updatePayload).eq('id', editingCustomerId).select();
            if (error) throw error;

            setIsEditCustomerOpen(false);
            setEditingCustomerId('');
            invalidateCustomersQuery();
            if (updatedRows && updatedRows.length > 0) {
                setSelectedCustomerId(updatedRows[0].id);
            }
        } catch (err) {
            console.error('Failed to update customer (full)', err);
            alert('เกิดข้อผิดพลาดในการแก้ไขผู้ติดต่อ');
        }
        };
  
    return (
                <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium mb-1">วันที่ <span className="text-red-500">*</span></label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} required disabled={isReadOnly} />
        </div>
        <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">ผู้ติดต่อ <span className="text-red-500">*</span></label>
            <Select
                value={selectedCustomerId}
                                onChange={handleCustomerSelect}
                                options={customerOptions}
                                placeholder={customersLoading ? 'กำลังโหลด...' : (isReadOnly && inferredContactName ? inferredContactName : 'เลือกผู้ติดต่อ (จำเป็น)')}
                                disabled={isReadOnly}
            />
        </div>

        <div className="md:col-span-3">
            <div className="rounded-lg border bg-white p-3 min-h-[96px]">
                <div className="flex items-start justify-between">
                    <p className="text-xs text-slate-500">ผู้ติดต่อที่เลือก</p>
                    {selectedCustomer && !isReadOnly && (
                        <Button type="button" variant="secondary" onClick={openEditCustomer}>แก้ไขผู้ติดต่อ</Button>
                    )}
                </div>
                {selectedCustomer ? (
                    <>
                        <p className="font-semibold text-slate-800 text-sm">{selectedCustomer.name}</p>
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm text-slate-600">
                            <p><span className="text-slate-500">ประเภท:</span> {selectedCustomer.contact_type === 'corporate' ? 'นิติบุคคล' : 'บุคคลธรรมดา'}</p>
                            <p><span className="text-slate-500">เลขผู้เสียภาษี:</span> {selectedCustomer.tax_id || '—'}</p>
                            <p><span className="text-slate-500">โทร:</span> {selectedCustomer.phone || '—'}</p>
                            <p><span className="text-slate-500">อีเมล:</span> {selectedCustomer.email || '—'}</p>
                            <p className="sm:col-span-2"><span className="text-slate-500">ที่อยู่:</span> {selectedCustomer.address || '—'}</p>
                        </div>
                    </>
                ) : (
                    <>
                        {isReadOnly && inferredContactName ? (
                            <div className="mt-1">
                                <p className="font-semibold text-slate-800 text-sm">{inferredContactName}</p>
                                <p className="text-xs text-slate-500">แสดงจากรายละเอียดรายการ (คู่ค้า)</p>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 mt-1">ยังไม่ได้เลือกผู้ติดต่อ</p>
                        )}
                    </>
                )}
            </div>
        </div>

        
        
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-1">หมวดหมู่ <span className="text-red-500">*</span></label>
                <Select value={mainCategoryId} onChange={(value) => { setMainCategoryId(value as string); setSubCategoryId(''); }} options={mainCategoryOptions} placeholder="-- เลือกหมวดหมู่หลัก --" disabled={isReadOnly}/>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">หมวดหมู่ย่อย (ถ้ามี)</label>
                <Select value={subCategoryId} onChange={(value) => setSubCategoryId(value as string)} options={subCategoryOptions} placeholder="-- ไม่มี --" disabled={isReadOnly || !availableSubCategories.length}/>
            </div>
                </div>

        <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-1">รายละเอียด</label>
            <div className="relative">
                <Input
                    value={description}
                    onChange={e => handleDescInput(e.target.value)}
                    placeholder={transactionType === 'income' ? 'เช่น รายได้จากบริการ, ค่าบริการ' : 'เช่น ค่าการตลาด, ค่าวัตถุดิบ'}
                    disabled={isReadOnly}
                />
                {showDescDropdown && filteredDescSuggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg border rounded-md max-h-60 overflow-auto">
                        <ul>
                            {filteredDescSuggestions.map((s, idx) => (
                                <li
                                    key={`${s}-${idx}`}
                                    className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer"
                                    onClick={() => { setDescription(s); setShowDescDropdown(false); }}
                                >
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <p className="text-xs text-slate-500 mt-1">ถ้าไม่ระบุ ระบบจะใช้ชื่อหมวดหมู่เป็นรายละเอียดโดยอัตโนมัติ</p>
        </div>
        
      </div>

      <FormSection title="รายละเอียดการเงิน">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-1">จำนวนเงิน <span className="text-red-500">*</span></label>
                <Input value={amountInput} onChange={(e) => setAmountInput(e.target.value)} placeholder="0.00" required disabled={isReadOnly} />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1">ประเภท VAT</label>
                                <Select value={vatType} onChange={(value) => setVatType(value as VatType)} options={vatTypeOptions} disabled={isReadOnly} />
                                <p className="text-xs text-slate-500 mt-1">
                                    {vatType === 'include' && 'โหมดรวม VAT: ป้อนยอดรวม VAT'}
                                    {vatType === 'exclude' && 'โหมดก่อน VAT: ป้อนยอดก่อน VAT ระบบจะคำนวณ VAT 7% เพิ่ม'}
                                    {vatType === 'none' && 'ไม่มี VAT: ระบบไม่คำนวณ VAT'}
                                </p>
            </div>
          </div>
                    <div className="text-sm text-slate-600 space-y-2 bg-slate-50 p-3 rounded-lg">
                                <div className="flex justify-between"><span>ยอดก่อน VAT:</span> <span>{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between"><span>ภาษีมูลค่าเพิ่ม (7%):</span> <span>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between font-bold text-base text-slate-800"><span>ยอดเรียกเก็บ (รวม VAT):</span> <span>{total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                {withholdingTax > 0 && <div className="flex justify-between text-red-600"><span>ภาษีหัก ณ ที่จ่าย (WHT {whtRate}%):</span> <span>- {withholdingTax.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                                <div className="flex justify-between font-bold text-lg border-t border-slate-200 mt-2 pt-2 text-slate-800">
                                    <span>{(transactionType === 'income') ? 'ยอดรับสุทธิหลังหัก WHT:' : 'ยอดจ่ายสุทธิหลังหัก WHT:'}</span>
                                    <span>{netAfterWht.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                    </div>
          <div>
            <label className="block text-sm font-medium mb-1">ภาษีหัก ณ ที่จ่าย (WHT)</label>
                        <Select
                            value={isCustomWht ? 'custom' : String(whtRate)}
                            onChange={(value) => {
                                if (value === 'custom') { setIsCustomWht(true); return; }
                                setIsCustomWht(false);
                                setCustomWhtInput('');
                                setWhtRate(Number(value));
                            }}
                            options={whtRateOptions}
                            disabled={isReadOnly}
                        />
                        {isCustomWht && (
                            <div className="mt-2 flex items-center gap-2">
                                <Input value={customWhtInput} onChange={e => { setCustomWhtInput(e.target.value); const n = parseFloat(e.target.value); setWhtRate(isNaN(n) ? 0 : n); }} placeholder="ระบุอัตรา %" disabled={isReadOnly} />
                                <span className="text-sm text-slate-600">%</span>
                            </div>
                        )}
                        {(vatType !== 'none' && selectedCustomer && !selectedCustomer.tax_id) && (
                            <p className="text-xs text-amber-600 mt-2">ผู้ติดต่อที่เลือกยังไม่มีเลขผู้เสียภาษี กรุณาอัปเดตเพื่อออกเอกสารภาษีได้ถูกต้อง</p>
                        )}
          </div>
      </FormSection>
      
            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                    <Button type="button" variant="secondary" onClick={onClose}>ปิด</Button>
                    {!isReadOnly && (
                        <Button type="submit">{isEditOnly ? 'บันทึกรายละเอียด' : 'บันทึกรายการ'}</Button>
                    )}
            </div>

    {!isReadOnly && (
    <Modal isOpen={isAddCustomerOpen} onClose={() => setIsAddCustomerOpen(false)} title="เพิ่มผู้ติดต่อใหม่ (แบบเต็ม)" size="xl">
          <div className="space-y-6">
              <CustomerFormFields
                  formState={fullCustomer}
                  onFormChange={(field, value) => setFullCustomer(prev => ({ ...prev, [field]: value }))}
                  onTaxIdChange={(id) => setFullCustomer(prev => ({ ...prev, taxId: id }))}
                  isModal
              />
              <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" type="button" onClick={() => setIsAddCustomerOpen(false)}>ยกเลิก</Button>
                  <Button type="button" onClick={handleCreateCustomerFull}>บันทึกผู้ติดต่อ</Button>
              </div>
          </div>
      </Modal>
    )}

    {!isReadOnly && (
    <Modal isOpen={isEditCustomerOpen} onClose={() => setIsEditCustomerOpen(false)} title="แก้ไขผู้ติดต่อ" size="xl">
          <div className="space-y-6">
              <CustomerFormFields
                  formState={fullCustomer}
                  onFormChange={(field, value) => setFullCustomer(prev => ({ ...prev, [field]: value }))}
                  onTaxIdChange={(id) => setFullCustomer(prev => ({ ...prev, taxId: id }))}
                  isModal
              />
              <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" type="button" onClick={() => setIsEditCustomerOpen(false)}>ยกเลิก</Button>
                  <Button type="button" onClick={handleUpdateCustomerFull}>บันทึกการแก้ไข</Button>
              </div>
          </div>
      </Modal>
    )}
        </form>
    );
}
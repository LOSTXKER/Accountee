// src/app/dashboard/[businessId]/settings/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Business } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useParams } from 'next/navigation';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Image as ImageIcon } from "lucide-react";
import { buildStoragePath } from '@/lib/storage-utils';

export default function ProfilePage() {
    const params = useParams();
    const businessId = params.businessId as string;
    const supabase = createClient();

    const [business, setBusiness] = useState<Partial<Business>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

    useEffect(() => {
        if (!businessId) return;
        const fetchBusiness = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', businessId)
                .single();

            if (error) {
                console.error("Error fetching business profile:", error);
            } else if (data) {
                setBusiness(data);
                if (data.logo_url) {
                    setLogoPreview(data.logo_url);
                }
                if (data.signature_url) {
                    setSignaturePreview(data.signature_url);
                }
            }
            setIsLoading(false);
        };
        fetchBusiness();
    }, [businessId]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSignatureFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setSignaturePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteSignature = async () => {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะลบลายเซ็น?')) return;
        
        try {
            const response = await fetch('/api/signature/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId })
            });

            if (response.ok) {
                setSignaturePreview(null);
                setSignatureFile(null);
                setBusiness(prev => ({ ...prev, signature_url: null }));
                alert('ลบลายเซ็นเรียบร้อยแล้ว');
            } else {
                alert('เกิดข้อผิดพลาดในการลบลายเซ็น');
            }
        } catch (error) {
            console.error('Error deleting signature:', error);
            alert('เกิดข้อผิดพลาดในการลบลายเซ็น');
        }
    };

    const handleSave = async () => {
        if (!businessId) return;
        setIsSaving(true);
        
        let newLogoUrl = business.logo_url;
        let newSignatureUrl = business.signature_url;

        try {
            // 1. Upload new logo if selected
            if (logoFile) {
                const filePath = buildStoragePath('logos', businessId, logoFile.name);
                const { error: uploadError } = await supabase.storage
                    .from('business_assets') // Assuming a bucket named 'business_assets'
                    .upload(filePath, logoFile, {
                        upsert: true, // Overwrite if file with same name exists
                    });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('business_assets')
                    .getPublicUrl(filePath);
                
                newLogoUrl = urlData.publicUrl;
            }

            // 2. Upload new signature using dedicated API if selected
            if (signatureFile) {
                const formData = new FormData();
                formData.append('file', signatureFile);
                formData.append('businessId', businessId);

                const signatureResponse = await fetch('/api/signature/upload', {
                    method: 'POST',
                    body: formData
                });

                if (signatureResponse.ok) {
                    const { signature_url } = await signatureResponse.json();
                    newSignatureUrl = signature_url;
                } else {
                    throw new Error('Failed to upload signature');
                }
            }

            // 3. Prepare data to update
            const dataToUpdate: Partial<Business> = {
                businessname: business.businessname || '',
                company_address: business.company_address || '',
                tax_id: business.tax_id || '',
                bank_details: business.bank_details || '',
                logo_url: newLogoUrl || '',
                signature_url: newSignatureUrl || '',
            };

            // 3. Update database
            const { error: updateError } = await supabase
                .from('businesses')
                .update(dataToUpdate)
                .eq('id', businessId);

            if (updateError) throw updateError;

            alert("บันทึกข้อมูลบริษัทเรียบร้อยแล้ว");
            setBusiness(prev => ({...prev, ...dataToUpdate}));

        } catch (error) {
            console.error("Error saving profile:", error);
            alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${(error as Error).message}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) return <p>กำลังโหลดข้อมูลบริษัท...</p>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">ข้อมูลบริษัทและแบรนด์</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">โลโก้บริษัท</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo Preview" className="mx-auto h-24 w-24 object-contain" />
                            ) : (
                                <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                            )}
                            <div className="flex text-sm text-gray-600">
                                <label htmlFor="logo-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none">
                                    <span>อัปโหลดไฟล์</span>
                                    <input id="logo-upload" name="logo-upload" type="file" className="sr-only" accept="image/png, image/jpeg" onChange={handleLogoChange} />
                                </label>
                                <p className="pl-1">หรือลากมาวาง</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG ไม่เกิน 1MB</p>
                        </div>
                    </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ชื่อธุรกิจ/บริษัท</label>
                        <Input value={business.businessname || ''} onChange={e => setBusiness({...business, businessname: e.target.value})} required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ที่อยู่บริษัท</label>
                        <Textarea rows={3} value={business.company_address || ''} onChange={e => setBusiness({...business, company_address: e.target.value})} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">เลขประจำตัวผู้เสียภาษี</label>
                        <Input value={business.tax_id || ''} onChange={e => setBusiness({...business, tax_id: e.target.value})} />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">ข้อมูลบัญชีธนาคารสำหรับชำระเงิน</label>
                <p className="text-xs text-slate-500 mb-1">ข้อมูลนี้จะไปแสดงท้ายใบแจ้งหนี้</p>
                <Textarea rows={4} value={business.bank_details || ''} onChange={e => setBusiness({...business, bank_details: e.target.value})} placeholder="เช่น&#10;ธนาคารกสิกรไทย&#10;ชื่อบัญชี: บริษัท เอนาจักร ทีเชิ้ต จำกัด&#10;เลขที่บัญชี: 123-4-56789-0"/>
            </div>

            {/* ส่วนลายเซ็นดิจิทัล */}
            <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">ลายเซ็นดิจิทัล</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">ลายเซ็น</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                {signaturePreview ? (
                                    <div className="relative">
                                        <img src={signaturePreview} alt="Signature Preview" className="mx-auto max-h-24 max-w-32 object-contain bg-white border rounded" />
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteSignature()}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs hover:bg-red-600"
                                            disabled={isSaving}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                                        <span className="text-xs">ลายเซ็น</span>
                                    </div>
                                )}
                                <div className="flex text-sm text-gray-600">
                                    <label htmlFor="signature-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none">
                                        <span>อัปโหลดลายเซ็น</span>
                                        <input id="signature-upload" name="signature-upload" type="file" className="sr-only" accept="image/png, image/jpeg" onChange={handleSignatureChange} />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG พื้นหลังใส แนะนำ</p>
                            </div>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-blue-800 mb-2">💡 เกี่ยวกับลายเซ็นดิจิทัล</h4>
                            <ul className="text-xs text-blue-700 space-y-1">
                                <li>• ลายเซ็นจะแสดงในเอกสารหนังสือรับรองหัก ณ ที่จ่าย</li>
                                <li>• แนะนำใช้ไฟล์ PNG พื้นหลังใส เพื่อความสวยงาม</li>
                                <li>• ขนาดไฟล์ไม่เกิน 1MB</li>
                                <li>• ควรเซ็นบนกระดาษขาวแล้วสแกนหรือถ่ายรูป</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </Button>
            </div>
        </div>
    );
}
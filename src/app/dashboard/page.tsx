// src/app/dashboard/page.tsx
"use client";

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, FormEvent } from 'react';
import { Business } from '@/types';
import Link from 'next/link';
import { PlusCircle, Briefcase, ArrowRight } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

// คอมโพเนนต์สำหรับแสดงการ์ดธุรกิจ
function BusinessCard({ business }: { business: Business }) {
    return (
        <Link href={`/dashboard/${business.id}`} className="group block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-brand-500 hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
                <div>
                    <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-800">{business.businessname}</h5>
                    <p className="font-normal text-gray-500">คลิกเพื่อจัดการธุรกิจนี้</p>
                </div>
                <ArrowRight className="text-gray-400 group-hover:text-brand-600 transition-transform group-hover:translate-x-1" />
            </div>
        </Link>
    );
}

// คอมโพเนนต์สำหรับปุ่มเพิ่มธุรกิจ
function AddBusinessCard({ onClick }: { onClick: () => void }) {
    return (
        <button onClick={onClick} className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-gray-300 rounded-lg hover:bg-slate-100 hover:border-brand-500 transition-all text-gray-500 hover:text-brand-600">
            <PlusCircle size={32} />
            <span className="mt-2 text-lg font-medium">เพิ่มธุรกิจใหม่</span>
        </button>
    );
}

export default function BusinessSelectorPage() {
    const { user } = useAuth();
    const supabase = createClient();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBusinessName, setNewBusinessName] = useState("");

    useEffect(() => {
        if (user) {
            const fetchBusinesses = async () => {
                setLoading(true);
                const { data, error } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('ownerid', user.id);
                
                if (error) {
                    console.error("Error fetching businesses:", error);
                } else {
                    setBusinesses(data || []);
                }
                setLoading(false);
            };
            fetchBusinesses();
        } else {
            // If no user, stop loading and show empty state
            setLoading(false);
            setBusinesses([]);
        }
    }, [user]);

    const handleCreateBusiness = async (e: FormEvent) => {
        e.preventDefault();
        if (!newBusinessName.trim() || !user) return;

        try {
            const { data, error } = await supabase
                .from('businesses')
                .insert({
                    ownerid: user.id,
                    businessname: newBusinessName,
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Use Next.js router for client-side navigation
                window.location.href = `/dashboard/${data.id}`;
            }
        } catch (error) {
            console.error("Error adding business: ", error);
            alert("เกิดข้อผิดพลาดในการสร้างธุรกิจ");
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><p>กำลังโหลดธุรกิจ...</p></div>;
    }

    return (
        <div className="p-4 sm:p-8">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">เลือกธุรกิจ</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {businesses.map(business => (
                    <BusinessCard key={business.id} business={business} />
                ))}
                <AddBusinessCard onClick={() => setIsModalOpen(true)} />
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="สร้างธุรกิจใหม่">
                <form onSubmit={handleCreateBusiness}>
                    <p className="text-gray-600 mb-4">ตั้งชื่อธุรกิจของคุณ เช่น Anajak T-Shirt หรือ Meelike-th</p>
                    <div className="mt-2">
                        <input 
                            type="text" 
                            placeholder="ชื่อธุรกิจ" 
                            value={newBusinessName}
                            onChange={(e) => setNewBusinessName(e.target.value)}
                            required 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>ยกเลิก</Button>
                        <Button type="submit">
                            <Briefcase size={16} className="mr-2"/> สร้างธุรกิจ
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}


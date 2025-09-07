// src/app/dashboard/[businessId]/settings/ai-training/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Transaction, Category, AiLearning } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useParams } from 'next/navigation';
import { Button } from "@/components/ui/Button";
import { BrainCircuit, Check, X } from "lucide-react";

interface Suggestion {
    vendorName: string;
    categoryId: string;
    categoryName: string;
    count: number;
}

export default function AiTrainingPage() {
    const params = useParams();
    const businessId = params.businessId as string;
    const supabase = createClient();

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [existingLearnings, setExistingLearnings] = useState<AiLearning[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // Fetch existing learnings and categories on mount
    useEffect(() => {
        if (!businessId) return;

        const fetchInitialData = async () => {
            const [learningResult, categoryResult] = await Promise.all([
                supabase.from('services').select('*').eq('businessid', businessId),
                supabase.from('categories').select('*').eq('businessid', businessId)
            ]);

            const { data: learningData, error: learningError } = learningResult;
            if (learningError) console.error("Error fetching AI learnings:", learningError);
            else setExistingLearnings(learningData as AiLearning[]);

            const { data: categoryData, error: categoryError } = categoryResult;
            if (categoryError) console.error("Error fetching categories:", categoryError);
            else setCategories(categoryData as Category[]);
        };

        fetchInitialData();
    }, [businessId, supabase]);


    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setSuggestions([]);

        // 1. Fetch all transactions with their category names
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select(`
                description,
                categories ( name )
            `)
            .eq('businessid', businessId)
            .not('categories', 'is', null);

        if (error) {
            console.error("Error fetching transactions for analysis:", error);
            alert("เกิดข้อผิดพลาดในการดึงข้อมูลธุรกรรม");
            setIsAnalyzing(false);
            return;
        }

        // 2. Group transactions by description and find the most common category
        const analysis: Record<string, Record<string, number>> = {};
        (transactions as unknown as { description: string; categories: { name: string } | null }[]).forEach(t => {
            const key = t.description.trim();
            const categoryName = t.categories?.name;

            if (!key || !categoryName) return;

            if (!analysis[key]) {
                analysis[key] = {};
            }
            analysis[key][categoryName] = (analysis[key][categoryName] || 0) + 1;
        });

        // 3. Generate suggestions
        const newSuggestions: Suggestion[] = [];
        const categoryNameToIdMap = categories.reduce((acc, cat) => {
            acc[cat.name] = cat.id;
            return acc;
        }, {} as Record<string, string>);

        for (const vendorName in analysis) {
            const categoryCounts = analysis[vendorName];
            const mostFrequentCategoryName = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b);
            const count = categoryCounts[mostFrequentCategoryName];
            
            const categoryId = categoryNameToIdMap[mostFrequentCategoryName];

            const alreadyExists = existingLearnings.some(l => l.vendor_name.toLowerCase() === vendorName.toLowerCase());

            if (count > 1 && categoryId && !alreadyExists) {
                newSuggestions.push({
                    vendorName,
                    categoryId,
                    categoryName: mostFrequentCategoryName,
                    count
                });
            }
        }
        
        setSuggestions(newSuggestions.sort((a,b) => b.count - a.count));
        setIsAnalyzing(false);
    };

    const handleSaveSuggestion = async (suggestion: Suggestion) => {
        const dataToSave = {
            businessid: businessId,
            vendor_name: suggestion.vendorName,
            category_id: suggestion.categoryId,
            category_name: suggestion.categoryName,
        };

        const { data: newLearning, error } = await supabase
            .from('services')
            .insert(dataToSave)
            .select()
            .single();
        
        if (error) {
            console.error("Error saving suggestion:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกคำแนะนำ: " + error.message);
            return;
        }
        
        setSuggestions(prev => prev.filter(s => s.vendorName !== suggestion.vendorName));
        setExistingLearnings(prev => [...prev, newLearning as AiLearning]);
    };
    
    const handleIgnoreSuggestion = (vendorName: string) => {
        setSuggestions(prev => prev.filter(s => s.vendorName !== vendorName));
    };


    return (
        <div>
            <h2 className="text-xl font-bold">ฝึกฝน AI จากข้อมูลของคุณ</h2>
            <p className="text-sm text-slate-500 mt-2 mb-6">
                ระบบจะวิเคราะห์รายการบัญชีทั้งหมดที่คุณเคยบันทึก เพื่อค้นหารูปแบบและเสนอให้คุณสร้างเป็นกฎการเรียนรู้โดยอัตโนมัติ
            </p>
            
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                <BrainCircuit size={16} className="mr-2"/>
                {isAnalyzing ? 'กำลังวิเคราะห์...' : 'เริ่มวิเคราะห์รายการบัญชี'}
            </Button>
            
            <div className="mt-8">
                {isAnalyzing && <p>กำลังวิเคราะห์ข้อมูล โปรดรอสักครู่...</p>}

                {suggestions.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-semibold">คำแนะนำการเรียนรู้ ({suggestions.length} รายการ)</h3>
                        {suggestions.map((s, index) => (
                            <div key={index} className="bg-slate-50 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="text-slate-800">
                                        ดูเหมือนว่าคุณบันทึก <span className="font-semibold text-brand-600">"{s.vendorName}"</span> 
                                        เป็นหมวดหมู่ <span className="font-semibold text-brand-600">"{s.categoryName}"</span> 
                                        บ่อยครั้ง ({s.count} ครั้ง)
                                    </p>
                                    <p className="text-xs text-slate-500">ต้องการให้ระบบเรียนรู้และบันทึกแบบนี้อัตโนมัติหรือไม่?</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleSaveSuggestion(s)}><Check size={16} className="mr-1"/> ยืนยัน</Button>
                                    <Button size="sm" variant="secondary" onClick={() => handleIgnoreSuggestion(s.vendorName)}><X size={16} className="mr-1"/> ไม่ต้อง</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {!isAnalyzing && suggestions.length === 0 && (
                     <p className="text-slate-500 mt-4">ไม่พบคำแนะนำใหม่ หรือคุณได้บันทึกการเรียนรู้ทั้งหมดแล้ว</p>
                )}
            </div>
        </div>
    );
}
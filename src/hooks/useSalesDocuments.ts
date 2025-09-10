"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SalesDoc } from '@/types';

const supabase = createClient();

export function useSalesDocuments(business_id: string) {
    const [documents, setDocuments] = useState<SalesDoc[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDocuments = useCallback(async () => {
        if (!business_id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales_documents')
                .select('*')
                .eq('businessid', business_id)
                .order('created_at', { ascending: false }); // ใช้ created_at ตาม schema เพื่อเรียงเอกสารล่าสุดก่อน

            if (error) throw error;
            
            // Convert date strings to Date objects
            const formattedData = data.map(doc => ({
                ...doc,
                issue_date: new Date(doc.issue_date),
                ...(doc.due_date && { due_date: new Date(doc.due_date) }),
                ...(doc.expiry_date && { expiry_date: new Date(doc.expiry_date) }),
                ...(doc.accepted_date && { accepted_date: new Date(doc.accepted_date) }),
            })) as SalesDoc[];

            setDocuments(formattedData);
        } catch (error) {
            console.error('Error fetching sales documents:', error);
        } finally {
            setLoading(false);
        }
    }, [business_id]);

    useEffect(() => {
        fetchDocuments();

        const channel = supabase
            .channel(`sales_documents_changes_for_${business_id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'sales_documents',
                filter: `businessid=eq.${business_id}`
            }, (payload) => {
                console.log('Sales document change received!', payload);
                fetchDocuments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [business_id, fetchDocuments]);

    return { documents, loading, refetch: fetchDocuments };
}

// src/hooks/useCategories.ts
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/types';

const supabase = createClient();

export function useCategories(businessId: string) {
    const queryClient = useQueryClient();

    const fetchCategories = async (): Promise<Category[]> => {
        if (!businessId) return [];
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('businessid', businessId)
            .order('name', { ascending: true });
        if (error) {
            console.error('Error fetching categories:', error);
            throw new Error(error.message);
        }
        return (data || []) as Category[];
    };

    const { data = [], isLoading: loading, refetch } = useQuery<Category[], Error>({
        queryKey: ['categories', businessId],
        queryFn: fetchCategories,
        enabled: !!businessId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    useEffect(() => {
        if (!businessId) return;
        const channel = supabase
            .channel(`realtime-categories:${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'categories',
                    filter: `businessid=eq.${businessId}`,
                },
                () => {
                    // Invalidate cache to refetch in background, UI stays responsive with cached data
                    queryClient.invalidateQueries({ queryKey: ['categories', businessId] });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [businessId, queryClient]);

    return { categories: data, loading, refetch };
}
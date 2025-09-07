// src/hooks/useCustomers.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Customer } from '@/types';

const supabase = createClient();

const fetchCustomers = async (businessId: string): Promise<Customer[]> => {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('businessid', businessId)
        .order('name', { ascending: true });

    if (error) {
        console.error("Error fetching customers:", error);
        throw new Error(error.message);
    }
    return data || [];
};

export function useCustomers(businessId: string) {
    const queryClient = useQueryClient();

    const { data: customers = [], isLoading: loading, isError } = useQuery<Customer[], Error>({
        queryKey: ['customers', businessId],
        queryFn: () => fetchCustomers(businessId),
        enabled: !!businessId,
    });

    const invalidateCustomersQuery = () => {
        queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
    };

    return { customers, loading, isError, invalidateCustomersQuery };
}

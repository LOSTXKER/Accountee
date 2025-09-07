// src/hooks/useServices.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Service } from '@/types';

const supabase = createClient();

const fetchServices = async (businessId: string): Promise<Service[]> => {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('businessid', businessId)
        .order('name', { ascending: true });

    if (error) {
        console.error("Error fetching services:", error);
        throw new Error(error.message);
    }
    return data || [];
};

export function useServices(businessId: string) {
    const queryClient = useQueryClient();

    const { data: services = [], isLoading: loading, isError } = useQuery<Service[], Error>({
        queryKey: ['services', businessId],
        queryFn: () => fetchServices(businessId),
        enabled: !!businessId,
    });

    const invalidateServicesQuery = () => {
        queryClient.invalidateQueries({ queryKey: ['services', businessId] });
    };

    return { services, loading, isError, invalidateServicesQuery };
}

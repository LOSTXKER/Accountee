// src/hooks/useTransactions.ts
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Transaction } from '@/types';

const supabase = createClient();

// Supabase returns ISO strings for dates, so we'll convert them to Date objects on the client.
type ClientTransaction = Omit<Transaction, 'date'> & { date: Date };

interface PaginatedTransactions {
    transactions: ClientTransaction[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

const fetchTransactions = async (
    businessId: string, 
    pageType: 'income' | 'expense' | 'all',
    limit: number = 50,
    offset: number = 0
): Promise<ClientTransaction[]> => {
    let query = supabase
        .from('transactions')
        .select('*')
        .eq('businessid', businessId)
        .eq('isdeleted', false)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (pageType === 'income') {
        query = query.eq('type', 'income');
    } else if (pageType === 'expense') {
        query = query.in('type', ['expense', 'cogs']);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching transactions:", error);
        throw new Error(error.message);
    }

    return (data || []).map(tx => ({
        ...tx,
        date: new Date(tx.date),
    }));
};

// เพิ่ม function สำหรับ export data ที่มี pagination
const fetchExportTransactions = async (
    businessId: string,
    startDate: string,
    endDate: string,
    type?: string,
    limit: number = 1000,
    offset: number = 0
): Promise<PaginatedTransactions> => {
    const { data, error } = await supabase.rpc('get_export_transactions', {
        p_business_id: businessId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_type: type || null,
        p_limit: limit,
        p_offset: offset
    });

    if (error) {
        console.error("Error fetching export transactions:", error);
        throw new Error(error.message);
    }

    return {
        transactions: (data.transactions || []).map((tx: any) => ({
            ...tx,
            date: new Date(tx.date),
        })),
        pagination: data.pagination
    };
};

export function useTransactions(businessId: string, pageType: 'income' | 'expense' | 'all', limit: number = 50) {
    const queryClient = useQueryClient();

    const { 
        data: transactions = [], 
        isLoading: loading, 
        isError,
        refetch
    } = useQuery<ClientTransaction[], Error>({
        queryKey: ['transactions', businessId, pageType, limit],
        queryFn: () => fetchTransactions(businessId, pageType, limit, 0),
        enabled: !!businessId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    const invalidateTransactionsQuery = () => {
        queryClient.invalidateQueries({ queryKey: ['transactions', businessId, pageType] });
    };

    return { transactions, loading, isError, refetch, invalidateTransactionsQuery };
}

// Hook สำหรับ infinite loading
export function useInfiniteTransactions(businessId: string, pageType: 'income' | 'expense' | 'all') {
    const queryClient = useQueryClient();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch
    } = useInfiniteQuery<ClientTransaction[], Error>({
        queryKey: ['transactions-infinite', businessId, pageType],
        queryFn: ({ pageParam = 0 }) => fetchTransactions(businessId, pageType, 50, pageParam as number),
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length === 50 ? allPages.length * 50 : undefined;
        },
        initialPageParam: 0,
        enabled: !!businessId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const transactions = data?.pages.flat() || [];

    const invalidateTransactionsQuery = () => {
        queryClient.invalidateQueries({ queryKey: ['transactions-infinite', businessId, pageType] });
    };

    return { 
        transactions, 
        loading: isLoading, 
        isError, 
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        invalidateTransactionsQuery 
    };
}

// Hook สำหรับ export data
export function useExportTransactions(
    businessId: string,
    startDate: string,
    endDate: string,
    type?: string
) {
    return useQuery<PaginatedTransactions, Error>({
        queryKey: ['export-transactions', businessId, startDate, endDate, type],
        queryFn: () => fetchExportTransactions(businessId, startDate, endDate, type),
        enabled: !!businessId && !!startDate && !!endDate,
        staleTime: 2 * 60 * 1000, // 2 minutes for export data
        gcTime: 5 * 60 * 1000,
    });
}

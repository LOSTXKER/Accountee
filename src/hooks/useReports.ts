// src/hooks/useReports.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ProfitLossData {
    totalRevenue: number;
    totalCogs: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    transactionCount: number;
    dateRange: {
        start: string;
        end: string;
    };
}

interface WhtReportData {
    totalWhtAmount: number;
    transactionCount: number;
    averageWhtRate: number;
    transactions: Array<{
        id: string;
        date: string;
        description: string;
        subtotal: number;
        withholdingtax: number;
        withholdingtax_rate: number;
        vendor_name: string;
    }>;
}

interface DashboardStats {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    transactionCount: number;
    avgTransactionAmount: number;
    totalWht: number;
    period: {
        days: number;
        startDate: string;
        endDate: string;
    };
}

// Hook สำหรับ Profit & Loss Report
export function useProfitLossReport(businessId: string, startDate: string, endDate: string) {
    const queryClient = useQueryClient();

    const { 
        data, 
        isLoading: loading, 
        isError,
        refetch,
        error
    } = useQuery<{ success: boolean; data: ProfitLossData; meta: any }, Error>({
        queryKey: ['profit-loss-report', businessId, startDate, endDate],
        queryFn: async () => {
            const response = await fetch('/api/reports/profit-loss', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessId,
                    startDate,
                    endDate
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch profit loss report');
            }

            return response.json();
        },
        enabled: !!businessId && !!startDate && !!endDate,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,
        retry: 2,
    });

    const invalidateReport = () => {
        queryClient.invalidateQueries({ 
            queryKey: ['profit-loss-report', businessId] 
        });
    };

    return { 
        reportData: data?.data, 
        loading, 
        isError, 
        refetch, 
        error,
        invalidateReport,
        meta: data?.meta
    };
}

// Hook สำหรับ WHT Report
export function useWhtReport(businessId: string, startDate?: string, endDate?: string) {
    const queryClient = useQueryClient();

    const { 
        data, 
        isLoading: loading, 
        isError,
        refetch,
        error
    } = useQuery<{ success: boolean; data: WhtReportData; meta: any }, Error>({
        queryKey: ['wht-report', businessId, startDate, endDate],
        queryFn: async () => {
            const response = await fetch('/api/reports/withholding-tax', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessId,
                    startDate,
                    endDate
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch WHT report');
            }

            return response.json();
        },
        enabled: !!businessId,
        staleTime: 10 * 60 * 1000, // 10 minutes (WHT data changes less frequently)
        gcTime: 20 * 60 * 1000,
        retry: 2,
    });

    const invalidateReport = () => {
        queryClient.invalidateQueries({ 
            queryKey: ['wht-report', businessId] 
        });
    };

    return { 
        reportData: data?.data, 
        loading, 
        isError, 
        refetch, 
        error,
        invalidateReport,
        meta: data?.meta
    };
}

// Hook สำหรับ Dashboard Stats
export function useDashboardStats(businessId: string, periodDays: number = 30) {
    const queryClient = useQueryClient();

    const { 
        data, 
        isLoading: loading, 
        isError,
        refetch,
        error
    } = useQuery<{ success: boolean; data: DashboardStats; meta: any }, Error>({
        queryKey: ['dashboard-stats', businessId, periodDays],
        queryFn: async () => {
            const response = await fetch('/api/dashboard/stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessId,
                    periodDays
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch dashboard stats');
            }

            return response.json();
        },
        enabled: !!businessId,
        staleTime: 3 * 60 * 1000, // 3 minutes (dashboard needs fresher data)
        gcTime: 6 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: true, // รีเฟรชเมื่อกลับมาที่หน้าต่าง
    });

    const invalidateStats = () => {
        queryClient.invalidateQueries({ 
            queryKey: ['dashboard-stats', businessId] 
        });
    };

    return { 
        stats: data?.data, 
        loading, 
        isError, 
        refetch, 
        error,
        invalidateStats,
        meta: data?.meta
    };
}

// Hook สำหรับ prefetch reports เพื่อปรับปรุง UX
export function usePrefetchReports(businessId: string) {
    const queryClient = useQueryClient();

    const prefetchProfitLoss = (startDate: string, endDate: string) => {
        queryClient.prefetchQuery({
            queryKey: ['profit-loss-report', businessId, startDate, endDate],
            queryFn: async () => {
                const response = await fetch('/api/reports/profit-loss', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        businessId,
                        startDate,
                        endDate
                    }),
                });
                return response.json();
            },
            staleTime: 5 * 60 * 1000,
        });
    };

    const prefetchWhtReport = () => {
        queryClient.prefetchQuery({
            queryKey: ['wht-report', businessId],
            queryFn: async () => {
                const response = await fetch('/api/reports/withholding-tax', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ businessId }),
                });
                return response.json();
            },
            staleTime: 10 * 60 * 1000,
        });
    };

    return {
        prefetchProfitLoss,
        prefetchWhtReport
    };
}

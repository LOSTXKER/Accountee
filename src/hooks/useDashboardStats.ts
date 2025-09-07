// src/hooks/useDashboardStats.ts
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Transaction, Invoice, Category } from '@/types';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

const supabase = createClient();

export interface DashboardStats {
    totalRevenue: number;
    totalExpenses: number;
    accountsReceivable: number;
    accountsPayable: number;
    overdueInvoicesCount: number;
    whtToTrackCount: number;
    pendingDocumentsCount: number;
    chartData: { name: string; income: number; expense: number }[];
    recentTransactions: Transaction[];
    categories: Category[];
}

const fetchDashboardStats = async (businessId: string): Promise<DashboardStats> => {
    if (!businessId) {
        // Return a default empty state if no businessId is provided
        return {
            totalRevenue: 0,
            totalExpenses: 0,
            accountsReceivable: 0,
            accountsPayable: 0,
            overdueInvoicesCount: 0,
            whtToTrackCount: 0,
            pendingDocumentsCount: 0,
            chartData: Array.from({ length: 6 }).map((_, i) => ({ name: format(subMonths(new Date(), 5 - i), 'MMM'), income: 0, expense: 0 })),
            recentTransactions: [],
            categories: [],
        };
    }

    const today = new Date();
    const sixMonthsAgo = startOfMonth(subMonths(today, 5));

    // --- Parallel Data Fetching ---
    const [
        { data: transactions, error: txError },
        { data: documents, error: docError },
        { data: categories, error: catError }
    ] = await Promise.all([
        supabase
            .from('transactions')
            .select('*')
            .eq('businessid', businessId)
            .eq('isdeleted', false)
            .gte('date', format(sixMonthsAgo, 'yyyy-MM-dd'))
            .order('date', { ascending: false }),
        supabase
            .from('sales_documents')
            .select('*')
            .eq('businessid', businessId)
            .eq('type', 'invoice')
            .eq('status', 'เกินกำหนด'),
        supabase
            .from('categories')
            .select('*')
            .eq('businessid', businessId)
            .order('name', { ascending: true })
    ]);

    if (txError) throw new Error(`Error fetching transactions: ${txError.message}`);
    if (docError) throw new Error(`Error fetching documents: ${docError.message}`);
    if (catError) throw new Error(`Error fetching categories: ${catError.message}`);

    // --- Process Data ---
    // Exclude canceled items from all stats calculations
    const activeTransactions = (transactions || []).filter(t => t.status !== 'ยกเลิก');
    const overdueInvoices = (documents as Invoice[]) || [];

    // Calculate KPIs
    const totalRevenue = activeTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = activeTransactions.filter(t => ['expense', 'cogs'].includes(t.type)).reduce((sum, t) => sum + t.amount, 0);
    const accountsReceivable = overdueInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    const accountsPayable = activeTransactions.filter(t => t.status === 'รอชำระ').reduce((sum, t) => sum + t.amount, 0);
    const overdueInvoicesCount = overdueInvoices.length;
    const pendingDocumentsCount = activeTransactions.filter(t => t.status === 'รอเอกสาร').length;
    const whtToTrackCount = activeTransactions.filter(t => 
        (t.withholdingtax && t.withholdingtax > 0) &&
        ((t.type === 'income' && t.status === 'รอรับ หัก ณ ที่จ่าย') || (t.type !== 'income' && t.status === 'รอส่ง หัก ณ ที่จ่าย'))
    ).length;

    // Prepare chart data for the last 6 months
    const chartData = Array.from({ length: 6 }).map((_, i) => {
        const month = subMonths(today, 5 - i); // Iterate from 5 months ago to current month
        const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');

        const income = activeTransactions
            .filter(t => t.type === 'income' && t.date >= monthStart && t.date <= monthEnd)
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = activeTransactions
            .filter(t => ['expense', 'cogs'].includes(t.type) && t.date >= monthStart && t.date <= monthEnd)
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            name: format(month, 'MMM'),
            income,
            expense,
        };
    });

    const recentTransactions = activeTransactions.slice(0, 5);

    return { 
        totalRevenue, 
        totalExpenses, 
        accountsReceivable,
        accountsPayable,
        overdueInvoicesCount,
        whtToTrackCount,
        pendingDocumentsCount,
        chartData, 
        recentTransactions, 
        categories: (categories as Category[]) || []
    };
};

export function useDashboardStats(businessId: string) {
    return useQuery<DashboardStats, Error>({
        queryKey: ['dashboardStats', businessId],
        queryFn: () => fetchDashboardStats(businessId),
        enabled: !!businessId,
    });
}

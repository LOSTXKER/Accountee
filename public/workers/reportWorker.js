// public/workers/reportWorker.js
// Web Worker สำหรับการประมวลผลรายงานที่หนัก

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    try {
        switch (type) {
            case 'CALCULATE_PROFIT_LOSS':
                const profitLossResult = calculateProfitLoss(data.transactions);
                self.postMessage({ 
                    type: 'PROFIT_LOSS_RESULT', 
                    result: profitLossResult 
                });
                break;
                
            case 'PROCESS_EXPORT_DATA':
                const exportResult = processExportData(data.transactions, data.filters);
                self.postMessage({ 
                    type: 'EXPORT_DATA_RESULT', 
                    result: exportResult 
                });
                break;
                
            case 'CALCULATE_WHT_SUMMARY':
                const whtResult = calculateWhtSummary(data.transactions);
                self.postMessage({ 
                    type: 'WHT_SUMMARY_RESULT', 
                    result: whtResult 
                });
                break;
                
            default:
                self.postMessage({ 
                    type: 'ERROR', 
                    error: 'Unknown operation type' 
                });
        }
    } catch (error) {
        self.postMessage({ 
            type: 'ERROR', 
            error: error.message 
        });
    }
};

function calculateProfitLoss(transactions) {
    const summary = {
        totalRevenue: 0,
        totalCogs: 0,
        totalExpenses: 0,
        transactionsByType: {
            income: [],
            expense: [],
            cogs: []
        },
        monthlyBreakdown: {}
    };
    
    transactions.forEach(tx => {
        const amount = parseFloat(tx.amount) || 0;
        const month = new Date(tx.date).toISOString().substring(0, 7); // YYYY-MM
        
        // Initialize monthly data if not exists
        if (!summary.monthlyBreakdown[month]) {
            summary.monthlyBreakdown[month] = {
                income: 0,
                expense: 0,
                cogs: 0
            };
        }
        
        switch (tx.type) {
            case 'income':
                summary.totalRevenue += amount;
                summary.transactionsByType.income.push(tx);
                summary.monthlyBreakdown[month].income += amount;
                break;
            case 'expense':
                summary.totalExpenses += amount;
                summary.transactionsByType.expense.push(tx);
                summary.monthlyBreakdown[month].expense += amount;
                break;
            case 'cogs':
                summary.totalCogs += amount;
                summary.transactionsByType.cogs.push(tx);
                summary.monthlyBreakdown[month].cogs += amount;
                break;
        }
    });
    
    summary.grossProfit = summary.totalRevenue - summary.totalCogs;
    summary.netProfit = summary.grossProfit - summary.totalExpenses;
    
    return summary;
}

function processExportData(transactions, filters) {
    let filteredTransactions = [...transactions];
    
    // Apply filters
    if (filters.startDate) {
        filteredTransactions = filteredTransactions.filter(tx => 
            new Date(tx.date) >= new Date(filters.startDate)
        );
    }
    
    if (filters.endDate) {
        filteredTransactions = filteredTransactions.filter(tx => 
            new Date(tx.date) <= new Date(filters.endDate)
        );
    }
    
    if (filters.type && filters.type !== 'all') {
        filteredTransactions = filteredTransactions.filter(tx => 
            tx.type === filters.type
        );
    }
    
    if (filters.categories && filters.categories.length > 0) {
        filteredTransactions = filteredTransactions.filter(tx => 
            filters.categories.includes(tx.category)
        );
    }
    
    // Group by categories
    const categorySummary = {};
    filteredTransactions.forEach(tx => {
        const category = tx.category || 'ไม่มีหมวดหมู่';
        if (!categorySummary[category]) {
            categorySummary[category] = {
                count: 0,
                totalAmount: 0,
                transactions: []
            };
        }
        categorySummary[category].count++;
        categorySummary[category].totalAmount += parseFloat(tx.amount) || 0;
        categorySummary[category].transactions.push(tx);
    });
    
    return {
        transactions: filteredTransactions,
        summary: {
            totalCount: filteredTransactions.length,
            totalAmount: filteredTransactions.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0),
            categorySummary
        },
        appliedFilters: filters
    };
}

function calculateWhtSummary(transactions) {
    const whtTransactions = transactions.filter(tx => 
        tx.withholdingtax && parseFloat(tx.withholdingtax) > 0
    );
    
    const summary = {
        totalWhtAmount: 0,
        transactionCount: whtTransactions.length,
        averageWhtRate: 0,
        byVendor: {},
        byMonth: {},
        transactions: whtTransactions
    };
    
    let totalRate = 0;
    
    whtTransactions.forEach(tx => {
        const whtAmount = parseFloat(tx.withholdingtax) || 0;
        const whtRate = parseFloat(tx.withholdingtax_rate) || 0;
        const vendor = tx.vendor_name || 'ไม่ระบุ';
        const month = new Date(tx.date).toISOString().substring(0, 7);
        
        summary.totalWhtAmount += whtAmount;
        totalRate += whtRate;
        
        // Group by vendor
        if (!summary.byVendor[vendor]) {
            summary.byVendor[vendor] = {
                count: 0,
                totalWht: 0,
                transactions: []
            };
        }
        summary.byVendor[vendor].count++;
        summary.byVendor[vendor].totalWht += whtAmount;
        summary.byVendor[vendor].transactions.push(tx);
        
        // Group by month
        if (!summary.byMonth[month]) {
            summary.byMonth[month] = {
                count: 0,
                totalWht: 0,
                transactions: []
            };
        }
        summary.byMonth[month].count++;
        summary.byMonth[month].totalWht += whtAmount;
        summary.byMonth[month].transactions.push(tx);
    });
    
    summary.averageWhtRate = whtTransactions.length > 0 ? totalRate / whtTransactions.length : 0;
    
    return summary;
}

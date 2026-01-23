import { useState, useEffect } from 'react';
import { FinancialTransaction } from '@/types';
import {
    getTransactionsByMonth,
    getIncomeByMonth,
    getExpensesByMonth,
    getFinancialSummary
} from '../services/financeService';

export const useFinance = (month?: string) => {
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [income, setIncome] = useState<FinancialTransaction[]>([]);
    const [expenses, setExpenses] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        incomeCount: 0,
        expenseCount: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const now = new Date();
                const selectedMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const [year, monthStr] = selectedMonth.split('-');
                const monthNum = parseInt(monthStr, 10);

                const [transactionsData, incomeData, expensesData, summaryData] = await Promise.all([
                    getTransactionsByMonth(parseInt(year, 10), monthNum),
                    getIncomeByMonth(parseInt(year, 10), monthNum),
                    getExpensesByMonth(parseInt(year, 10), monthNum),
                    getFinancialSummary(parseInt(year, 10), monthNum)
                ]);

                setTransactions(transactionsData);
                setIncome(incomeData);
                setExpenses(expensesData);
                setSummary(summaryData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'حدث خطأ في جلب البيانات');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [month]);

    return {
        transactions,
        income,
        expenses,
        summary,
        loading,
        error
    };
};

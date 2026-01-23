import { useState } from 'react';

export interface Transaction {
    id: string;
    type: 'income' | 'expense';
    category: 'fees' | 'salary' | 'donation' | 'utilities' | 'other';
    amount: number;
    title: string;
    notes: string;
    date: string;
}

export const useTransactions = (initialTransactions: Transaction[] = []) => {
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

    const addTransaction = (data: Omit<Transaction, 'id'>) => {
        const newTransaction: Transaction = {
            ...data,
            id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        setTransactions(prev => [newTransaction, ...prev]);
        return newTransaction;
    };

    const deleteTransaction = (id: string) => {
        setTransactions(prev => prev.filter(tr => tr.id !== id));
    };

    const getTransactionsByMonth = (month: string) => {
        return transactions.filter(tr => tr.date.substring(0, 7) === month);
    };

    return {
        transactions,
        addTransaction,
        deleteTransaction,
        getTransactionsByMonth
    };
};

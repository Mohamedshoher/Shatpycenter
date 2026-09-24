"use client";

import { useState, useMemo, useEffect } from 'react';
import ArrowDownCircle from 'lucide-react/dist/esm/icons/arrow-down-circle'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Plus from 'lucide-react/dist/esm/icons/plus'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTransactionsByMonth } from '@/features/finance/services/financeService';
import { FadeIn, SlideIn } from '@/components/ui/transition';
import dynamic from 'next/dynamic';
import type { TransactionData } from '@/features/finance/components/AddTransactionModal';

const AddTransactionModal = dynamic(() => import('@/features/finance/components/AddTransactionModal'), { ssr: false });

interface Transaction extends TransactionData {
    id: string;
    performedBy?: string;
}

export default function FinanceExpensesPage() {
    const [selectedMonth, setSelectedMonth] = useState('');
    const [isClient, setIsClient] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        const now = new Date();
        setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
        setIsClient(true);
    }, []);

    const months = useMemo(() => {
        const result = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            result.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }) });
        }
        return result;
    }, []);

    const { data: dbTransactions = [], isLoading } = useQuery({
        queryKey: ['transactions', selectedMonth],
        queryFn: async () => {
            if (!isClient) return [];
            const [year, month] = selectedMonth.split('-');
            return await getTransactionsByMonth(parseInt(year), parseInt(month));
        },
        enabled: isClient && !!selectedMonth,
    });

    const transactions: Transaction[] = useMemo(() =>
        dbTransactions.map(tr => ({ id: tr.id, type: tr.type as 'income' | 'expense', title: tr.description, category: tr.category as any, amount: tr.amount, date: tr.date, notes: '', performedBy: tr.performedBy })),
        [dbTransactions]
    );

    const filteredTransactions = useMemo(() => transactions.filter(tr => tr.date?.substring(0, 7) === selectedMonth), [transactions, selectedMonth]);

    const expenseData = useMemo(() => {
        const expenseTransactions = filteredTransactions.filter(tr => tr.type === 'expense');
        const total = expenseTransactions.reduce((sum, tr) => sum + tr.amount, 0);

        const breakdown: Record<string, number> = {};
        expenseTransactions.forEach(tr => {
            const cat = tr.category || 'other';
            breakdown[cat] = (breakdown[cat] || 0) + tr.amount;
        });

        return { expenseTransactions, total, breakdown };
    }, [filteredTransactions]);

    const handleAddTransaction = () => {
        setIsModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['transactions', selectedMonth] });
    };

    if (!isClient) return null;

    return (
        <div className="min-h-screen bg-gray-50/50 pb-32 font-sans">
            <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={handleAddTransaction} />

            {/* Header */}
            <div className="sticky top-0 z-[70] bg-gray-50/95 backdrop-blur-xl px-4 py-4 border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/finance" className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all">
                            <ArrowLeft size={20} />
                        </Link>
                        <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 active:scale-95">
                            <Plus size={22} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => { const i = months.findIndex(m => m.value === selectedMonth); if (i < months.length - 1) setSelectedMonth(months[i + 1].value); }} disabled={months.findIndex(m => m.value === selectedMonth) === months.length - 1} className="w-9 h-9 bg-white border border-red-100 rounded-xl flex items-center justify-center text-red-600 hover:bg-red-50 disabled:opacity-50">
                            <ChevronRight size={18} />
                        </button>
                        <div className="relative">
                            <button onClick={() => setShowMonthPicker(!showMonthPicker)} className="h-10 px-4 bg-white border border-red-100 rounded-xl flex items-center gap-2 text-red-700 font-black shadow-sm">
                                <Calendar size={16} /> <span className="text-xs whitespace-nowrap">{months.find(m => m.value === selectedMonth)?.label}</span> <ChevronDown size={14} />
                            </button>
                            {showMonthPicker && (
                                <div className="absolute top-[110%] left-1/2 -translate-x-1/2 w-44 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-1">
                                    {months.map(m => (
                                        <button key={m.value} onClick={() => { setSelectedMonth(m.value); setShowMonthPicker(false); }}
                                            className={cn("w-full px-4 py-2 text-right text-xs font-bold flex items-center justify-between", selectedMonth === m.value ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-50")}>
                                            {m.label} {selectedMonth === m.value && <div className="w-1.5 h-1.5 rounded-full bg-red-600" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={() => { const i = months.findIndex(m => m.value === selectedMonth); if (i > 0) setSelectedMonth(months[i - 1].value); }} disabled={months.findIndex(m => m.value === selectedMonth) === 0} className="w-9 h-9 bg-white border border-red-100 rounded-xl flex items-center justify-center text-red-600 hover:bg-red-50 disabled:opacity-50">
                            <ChevronLeft size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Summary */}
                <div className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-3xl p-6 shadow-lg">
                    <p className="text-sm text-red-100 font-bold mb-1">إجمالي المصروفات</p>
                    <p className="text-4xl font-black font-sans">{expenseData.total.toLocaleString()} <span className="text-lg text-red-200">ج.م</span></p>
                </div>

                {/* Breakdown */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                    <h3 className="font-black text-gray-700 text-sm">تحليل المصروفات</h3>
                    {[
                        { key: 'salary', label: 'رواتب ومستحقات', color: 'text-orange-600', bg: 'bg-orange-50' },
                        { key: 'utilities', label: 'مرافق وصيانة', color: 'text-blue-600', bg: 'bg-blue-50' },
                        { key: 'fees', label: 'رسوم وعمولات', color: 'text-red-600', bg: 'bg-red-50' },
                        { key: 'other', label: 'مصروفات أخرى', color: 'text-gray-600', bg: 'bg-gray-50' },
                    ].map(item => (
                        <div key={item.key} className={`flex items-center justify-between p-4 ${item.bg} rounded-2xl border border-transparent`}>
                            <p className={`text-lg font-black ${item.color} font-sans`}>{(expenseData.breakdown[item.key] || 0).toLocaleString()} <span className="text-[10px]">ج.م</span></p>
                            <p className={`text-xs font-black ${item.color}`}>{item.label}</p>
                        </div>
                    ))}
                </div>

                {/* All Transactions */}
                <div className="space-y-3">
                    <h3 className="font-black text-gray-700 text-sm">جميع المصروفات</h3>
                    {expenseData.expenseTransactions.length === 0 ? (
                        <p className="text-xs text-gray-400 font-bold text-center py-8 bg-white rounded-2xl border border-dashed border-gray-100">لا توجد مصروفات هذا الشهر.</p>
                    ) : (
                        expenseData.expenseTransactions.map(tr => (
                            <div key={tr.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="text-right">
                                    <p className="font-black text-gray-900 text-sm">{tr.title || tr.category || 'مصروف'}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{tr.date} {tr.performedBy && `- ${tr.performedBy}`}</p>
                                </div>
                                <p className="text-lg font-black text-red-600 font-sans">{Number(tr.amount).toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

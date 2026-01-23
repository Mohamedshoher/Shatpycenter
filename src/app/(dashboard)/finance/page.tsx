"use client";

import { useState, useMemo, useEffect } from 'react';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    Wallet,
    Plus,
    ChevronDown,
    Calendar,
    Trash2,
    Loader
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AddTransactionModal from '@/features/finance/components/AddTransactionModal';
import DeleteConfirmModal from '@/features/finance/components/DeleteConfirmModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactionsByMonth, deleteTransaction } from '@/features/finance/services/financeService';
import type { TransactionData } from '@/features/finance/components/AddTransactionModal';
import type { FinancialTransaction } from '@/types';

interface Transaction extends TransactionData {
    id: string;
}

export default function FinancePage() {
    const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income');
    const [selectedMonth, setSelectedMonth] = useState<string>('2026-01');
    const [isClient, setIsClient] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // تعيين الشهر الحالي على جانب العميل فقط
    useEffect(() => {
        const now = new Date();
        setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
        setIsClient(true);
    }, []);

    // جلب البيانات من Supabase حسب الشهر
    const { data: dbTransactions = [], isLoading } = useQuery({
        queryKey: ['transactions', selectedMonth],
        queryFn: async () => {
            if (!isClient) return [];
            const [year, month] = selectedMonth.split('-');
            return await getTransactionsByMonth(parseInt(year), parseInt(month));
        },
        enabled: isClient && !!selectedMonth
    });

    // تحويل البيانات من قاعدة البيانات إلى صيغة المكون
    const transactions: Transaction[] = useMemo(() => {
        return dbTransactions.map(tr => ({
            id: tr.id,
            type: tr.type as 'income' | 'expense',
            title: tr.description,
            category: tr.category as any,
            amount: tr.amount,
            date: tr.date,
            notes: ''
        }));
    }, [dbTransactions]);

    // فلترة المعاملات حسب الشهر (بالفعل مفلترة من قاعدة البيانات)
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tr => tr.date.substring(0, 7) === selectedMonth);
    }, [transactions, selectedMonth]);

    // حساب الإجماليات
    const { totalIncome, totalExpenses, balance } = useMemo(() => {
        const income = filteredTransactions
            .filter(tr => tr.type === 'income')
            .reduce((sum, tr) => sum + tr.amount, 0);
        const expenses = filteredTransactions
            .filter(tr => tr.type === 'expense')
            .reduce((sum, tr) => sum + tr.amount, 0);
        return {
            totalIncome: income,
            totalExpenses: expenses,
            balance: income - expenses
        };
    }, [filteredTransactions]);

    // تصنيفات الإنفاق
    const expenseBreakdown = useMemo(() => {
        const breakdown: Record<string, number> = {};
        filteredTransactions
            .filter(tr => tr.type === 'expense')
            .forEach(tr => {
                breakdown[tr.category] = (breakdown[tr.category] || 0) + tr.amount;
            });
        return breakdown;
    }, [filteredTransactions]);

    // تصنيفات الدخل
    const incomeBreakdown = useMemo(() => {
        const breakdown: Record<string, number> = {};
        filteredTransactions
            .filter(tr => tr.type === 'income')
            .forEach(tr => {
                breakdown[tr.category] = (breakdown[tr.category] || 0) + tr.amount;
            });
        return breakdown;
    }, [filteredTransactions]);

    // توليد الأشهر المتاحة ديناميكياً (آخر 12 شهر)
    const months = useMemo(() => {
        const result = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            result.push({
                value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
            });
        }
        return result;
    }, []);

    // حذف المعاملة من قاعدة البيانات
    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteTransaction(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions', selectedMonth] });
            setDeleteConfirmOpen(false);
            setTransactionToDelete(null);
        }
    });

    const handleAddTransaction = (data: TransactionData) => {
        // سيتم التعامل معها بواسطة المكون وإعادة التحميل
        setIsModalOpen(false);
        // إعادة تحميل البيانات
        queryClient.invalidateQueries({ queryKey: ['transactions', selectedMonth] });
    };

    const handleDeleteClick = (id: string) => {
        setTransactionToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (transactionToDelete) {
            deleteMutation.mutate(transactionToDelete);
        }
    };

    // دوال للتنقل بين الأشهر
    const handlePreviousMonth = () => {
        const [year, month] = selectedMonth.split('-');
        let prevMonth = parseInt(month) - 1;
        let prevYear = parseInt(year);
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
        }
        setSelectedMonth(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
    };

    const handleCurrentMonth = () => {
        const now = new Date();
        setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    };

    const handleNextMonth = () => {
        const [year, month] = selectedMonth.split('-');
        let nextMonth = parseInt(month) + 1;
        let nextYear = parseInt(year);
        if (nextMonth === 13) {
            nextMonth = 1;
            nextYear += 1;
        }
        setSelectedMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
    };

    return (
        <div className="space-y-6 pb-24 text-right p-4 md:p-6">
            {/* Delete Confirm Modal */}
            <DeleteConfirmModal
                isOpen={deleteConfirmOpen}
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                    setDeleteConfirmOpen(false);
                    setTransactionToDelete(null);
                }}
                title="حذف المعاملة"
                message="هل أنت متأكد من حذف هذه المعاملة؟ لا يمكن التراجع عن هذه العملية."
            />

            {/* Modal */}
            <AddTransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddTransaction}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-2 pt-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                <h1 className="text-xl font-bold text-gray-900">المصروفات والمالية</h1>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center p-0 hover:bg-blue-700"
                >
                    <Plus size={20} />
                </Button>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center h-96 px-2">
                    <div className="flex flex-col items-center gap-3">
                        <Loader size={40} className="text-blue-600 animate-spin" />
                        <p className="text-gray-500 text-sm">جاري تحميل البيانات...</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Month Selector */}
                    <div className="px-2 relative space-y-3">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePreviousMonth}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl p-2 flex items-center justify-center text-gray-600 font-semibold transition-colors text-sm"
                            >
                                ← السابق
                            </button>
                            <div className="relative flex-[2]">
                                <button
                                    onClick={() => setShowMonthPicker(!showMonthPicker)}
                                    className="w-full bg-white border border-gray-200 rounded-2xl p-3 flex items-center justify-between hover:border-gray-300 transition-colors"
                                >
                                    <ChevronDown size={20} className="text-gray-400" />
                                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                                        <Calendar size={18} />
                                        {months.find(m => m.value === selectedMonth)?.label}
                                    </div>
                                    <div className="w-6" />
                                </button>
                                {showMonthPicker && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg z-10">
                                        {months.map(month => (
                                            <button
                                                key={month.value}
                                                onClick={() => {
                                                    setSelectedMonth(month.value);
                                                    setShowMonthPicker(false);
                                                }}
                                                className={cn(
                                                    "w-full text-right px-4 py-3 border-b last:border-b-0 transition-colors",
                                                    selectedMonth === month.value
                                                        ? "bg-blue-50 text-blue-600 font-bold"
                                                        : "text-gray-700 hover:bg-gray-50"
                                                )}
                                            >
                                                {month.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleCurrentMonth}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 border border-blue-600 rounded-xl p-2 flex items-center justify-center text-white font-semibold transition-colors text-sm"
                            >
                                الحالي
                            </button>
                        </div>
                    </div>

                    {/* Balance Cards */}
                    <div className="grid grid-cols-2 gap-4 px-2">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-5 shadow-sm border border-green-200">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white">
                                    <ArrowUpCircle size={24} />
                                </div>
                                <span className="text-xs text-green-700 font-bold">إجمالي الدخل</span>
                                <span className="text-lg font-bold text-green-900">{totalIncome.toLocaleString()} ج.م</span>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-3xl p-5 shadow-sm border border-red-200">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white">
                                    <ArrowDownCircle size={24} />
                                </div>
                                <span className="text-xs text-red-700 font-bold">إجمالي المصروفات</span>
                                <span className="text-lg font-bold text-red-900">{totalExpenses.toLocaleString()} ج.م</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Balance Card */}
                    <div className="px-2">
                        <div className={cn(
                            "rounded-3xl p-5 shadow-sm border",
                            balance >= 0
                                ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
                                : "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"
                        )}>
                            <div className="flex flex-col items-center gap-2">
                                <span className={cn(
                                    "text-xs font-bold",
                                    balance >= 0 ? "text-blue-700" : "text-orange-700"
                                )}>
                                    الرصيد المتبقي
                                </span>
                                <span className={cn(
                                    "text-2xl font-bold",
                                    balance >= 0 ? "text-blue-900" : "text-orange-900"
                                )}>
                                    {balance >= 0 ? '+' : '-'}{Math.abs(balance).toLocaleString()} ج.م
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-gray-100/50 p-1 rounded-2xl mx-2">
                        <button
                            onClick={() => setActiveTab('expenses')}
                            className={cn(
                                "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                                activeTab === 'expenses' ? "bg-white shadow-sm text-gray-900" : "text-gray-400"
                            )}
                        >
                            المصروفات
                        </button>
                        <button
                            onClick={() => setActiveTab('income')}
                            className={cn(
                                "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                                activeTab === 'income' ? "bg-white shadow-sm text-gray-900" : "text-gray-400"
                            )}
                        >
                            الإيرادات
                        </button>
                    </div>

                    {/* Income Section */}
                    {activeTab === 'income' && (
                        <div className="px-2 space-y-4">
                            {/* Income Categories Summary */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-900">تفصيل الإيرادات</h3>
                                {filteredTransactions.filter(tr => tr.type === 'income').length > 0 ? (
                                    <div className="space-y-2">
                                        {Array.from(new Set(
                                            filteredTransactions
                                                .filter(tr => tr.type === 'income')
                                                .map(tr => tr.category)
                                        )).map(category => {
                                            const categoryTotal = filteredTransactions
                                                .filter(tr => tr.type === 'income' && tr.category === category)
                                                .reduce((sum, tr) => sum + tr.amount, 0);
                                            const categoryCount = filteredTransactions
                                                .filter(tr => tr.type === 'income' && tr.category === category).length;

                                            const categoryLabels: Record<string, string> = {
                                                'fees': 'الاشتراكات والرسوم',
                                                'donation': 'التبرعات',
                                                'تحصيل من مدرس': 'تحصيل من المدرسين',
                                                'other': 'إيرادات أخرى'
                                            };

                                            return (
                                                <div key={category} className="bg-white rounded-2xl p-4 border border-gray-100">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500 mb-1">{categoryCount} عملية</p>
                                                            <p className="text-sm font-bold text-green-600">{categoryTotal.toLocaleString()} ج.م</p>
                                                        </div>
                                                        <p className="font-semibold text-gray-700">{categoryLabels[category as string] || category}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                                        <p className="text-gray-500 text-sm">لا توجد إيرادات في هذا الشهر</p>
                                    </div>
                                )}
                            </div>

                            {/* Detailed Transactions */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-900 text-base">تفاصيل المعاملات</h3>
                                {filteredTransactions.filter(tr => tr.type === 'income').length > 0 ? (
                                    filteredTransactions
                                        .filter(tr => tr.type === 'income')
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((tr) => (
                                            <div key={tr.id} className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="font-bold text-green-600 text-lg">+{tr.amount.toLocaleString()} ج.م</span>
                                                        <span className="text-xs text-gray-400">{new Date(tr.date).toLocaleDateString('ar-EG')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold text-gray-800">{tr.title}</p>
                                                            <p className="text-xs text-gray-400">بواسطة: المدير العام</p>
                                                            {tr.notes && <p className="text-xs text-blue-600 mt-1">📝 {tr.notes}</p>}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleDeleteClick(tr.id)}
                                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                                                                title="حذف المعاملة"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                                                                <ArrowUpCircle size={20} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                                        <p className="text-gray-500 text-sm">لا توجد معاملات في هذا الشهر</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Expenses Section */}
                    {activeTab === 'expenses' && (
                        <div className="px-2 space-y-4">
                            {/* Expense Categories Summary */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-900">تفصيل المصروفات</h3>
                                {filteredTransactions.filter(tr => tr.type === 'expense').length > 0 ? (
                                    <div className="space-y-2">
                                        {Object.entries(expenseBreakdown).map(([category, amount]) => {
                                            const categoryCount = filteredTransactions
                                                .filter(tr => tr.type === 'expense' && tr.category === category).length;

                                            const categoryLabels: Record<string, string> = {
                                                'salary': 'الرواتب والمستحقات',
                                                'utilities': 'المرافق والصيانة',
                                                'fees': 'الرسوم والعمولات',
                                                'other': 'مصروفات أخرى'
                                            };

                                            return (
                                                <div key={category} className="bg-white rounded-2xl p-4 border border-gray-100">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500 mb-1">{categoryCount} عملية</p>
                                                            <p className="text-sm font-bold text-red-600">{amount.toLocaleString()} ج.م</p>
                                                        </div>
                                                        <p className="font-semibold text-gray-700">{categoryLabels[category as string] || category}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {Object.keys(expenseBreakdown).length === 0 && (
                                            <div className="bg-gray-50 rounded-2xl p-4 text-center">
                                                <p className="text-gray-500 text-sm">لا توجد مصروفات في هذا الشهر</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                                        <p className="text-gray-500 text-sm">لا توجد مصروفات في هذا الشهر</p>
                                    </div>
                                )}
                            </div>

                            {/* Detailed Transactions */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-900 text-base">تفاصيل المعاملات</h3>
                                {filteredTransactions.filter(tr => tr.type === 'expense').length > 0 ? (
                                    filteredTransactions
                                        .filter(tr => tr.type === 'expense')
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((tr) => (
                                            <div key={tr.id} className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="font-bold text-red-600 text-lg">-{tr.amount.toLocaleString()} ج.م</span>
                                                        <span className="text-xs text-gray-400">{new Date(tr.date).toLocaleDateString('ar-EG')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold text-gray-800">{tr.title}</p>
                                                            <p className="text-xs text-gray-400">بواسطة: المدير العام</p>
                                                            {tr.notes && <p className="text-xs text-blue-600 mt-1">📝 {tr.notes}</p>}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleDeleteClick(tr.id)}
                                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                                                                title="حذف المعاملة"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                                                                <ArrowDownCircle size={20} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                                        <p className="text-gray-500 text-sm">لا توجد معاملات في هذا الشهر</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

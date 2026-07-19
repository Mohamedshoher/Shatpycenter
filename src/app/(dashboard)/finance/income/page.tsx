"use client";

import { useState, useMemo, useEffect } from 'react';
import ArrowUpCircle from 'lucide-react/dist/esm/icons/arrow-up-circle'
import Wallet from 'lucide-react/dist/esm/icons/wallet'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Plus from 'lucide-react/dist/esm/icons/plus'
import X from 'lucide-react/dist/esm/icons/x'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTransactionsByMonth } from '@/features/finance/services/financeService';
import { getFeesByMonth } from '@/features/students/services/recordsService';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { FadeIn, SlideIn } from '@/components/ui/transition';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { useStudents } from '@/features/students/hooks/useStudents';
import dynamic from 'next/dynamic';
import type { TransactionData } from '@/features/finance/components/AddTransactionModal';

const AddTransactionModal = dynamic(() => import('@/features/finance/components/AddTransactionModal'), { ssr: false });

interface Transaction extends TransactionData {
    id: string;
    performedBy?: string;
    relatedUserId?: string;
}

export default function FinanceIncomePage() {
    const { user } = useAuthStore();
    const [selectedMonth, setSelectedMonth] = useState('');
    const [isClient, setIsClient] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [detailType, setDetailType] = useState<'manager' | 'teachers' | 'other' | null>(null);
    const queryClient = useQueryClient();
    const { data: teachers = [] } = useTeachers();
    const { data: students = [] } = useStudents();

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

    const { data: allFees = [] } = useQuery({
        queryKey: ['all-fees', selectedMonth],
        queryFn: async () => {
            if (!isClient) return [];
            const feesByKey = await getFeesByMonth(selectedMonth);
            const label = months.find(m => m.value === selectedMonth)?.label;
            const feesByLabel = label ? await getFeesByMonth(label) : [];
            const seen = new Set();
            return [...feesByKey, ...feesByLabel].filter(f => { if (seen.has(f.id)) return false; seen.add(f.id); return true; });
        },
        enabled: isClient && !!selectedMonth,
    });

    const transactions: Transaction[] = useMemo(() =>
        dbTransactions.map(tr => ({ id: tr.id, type: tr.type as 'income' | 'expense', title: tr.description, category: tr.category as any, amount: tr.amount, date: tr.date, notes: '', performedBy: tr.performedBy, relatedUserId: tr.relatedUserId })),
        [dbTransactions]
    );

    const filteredTransactions = useMemo(() => transactions.filter(tr => tr.date?.substring(0, 7) === selectedMonth), [transactions, selectedMonth]);

    const normalize = (s: string) => {
        if (!s) return '';
        return s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ءئؤ]/g, '').replace(/[ًٌٍَُِّ]/g, '').replace(/\s+/g, '').trim();
    };

    const incomeData = useMemo(() => {
        const incomeTransactions = filteredTransactions.filter(tr => tr.type === 'income');
        const feeTransactions = incomeTransactions.filter(tr => tr.category === 'تحصيل من مدرس');
        const otherIncomeTransactions = incomeTransactions.filter(tr => tr.category === 'donation' || tr.category === 'other');

        const fromTeachers = feeTransactions.reduce((sum, tr) => sum + tr.amount, 0);
        const otherIncome = otherIncomeTransactions.reduce((sum, tr) => sum + tr.amount, 0);

        const feesByManager = allFees.filter(fee => {
            const isByTeacher = teachers.some(t => fee.createdBy === t.fullName || fee.createdBy === t.phone || normalize(fee.createdBy) === normalize(t.fullName));
            const isExplicitManager = fee.createdBy === user?.displayName || fee.createdBy === 'المدير' || fee.createdBy === 'admin';
            return isExplicitManager || (!isByTeacher && fee.createdBy && fee.createdBy !== 'غير معروف');
        }).reduce((sum, fee) => sum + (Number(fee.amount?.toString().replace(/[^0-9.]/g, '')) || 0), 0);

        const managerDirectFeesList = allFees.filter(fee => {
            const isByTeacher = teachers.some(t => fee.createdBy === t.fullName || fee.createdBy === t.phone || normalize(fee.createdBy) === normalize(t.fullName));
            const isExplicitManager = fee.createdBy === user?.displayName || fee.createdBy === 'المدير' || fee.createdBy === 'admin';
            return isExplicitManager || (!isByTeacher && fee.createdBy && fee.createdBy !== 'غير معروف');
        });

        return { feesByManager, fromTeachers, otherIncome, totalReceived: feesByManager + fromTeachers + otherIncome, managerDirectFeesList, feeTransactions, otherIncomeTransactions, incomeTransactions };
    }, [filteredTransactions, allFees, teachers, user?.displayName]);

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
                        <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                            <Plus size={22} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => { const i = months.findIndex(m => m.value === selectedMonth); if (i < months.length - 1) setSelectedMonth(months[i + 1].value); }} disabled={months.findIndex(m => m.value === selectedMonth) === months.length - 1} className="w-9 h-9 bg-white border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 disabled:opacity-50">
                            <ChevronRight size={18} />
                        </button>
                        <div className="relative">
                            <button onClick={() => setShowMonthPicker(!showMonthPicker)} className="h-10 px-4 bg-white border border-blue-100 rounded-xl flex items-center gap-2 text-blue-700 font-black shadow-sm">
                                <Calendar size={16} /> <span className="text-xs whitespace-nowrap">{months.find(m => m.value === selectedMonth)?.label}</span> <ChevronDown size={14} />
                            </button>
                            {showMonthPicker && (
                                <div className="absolute top-[110%] left-1/2 -translate-x-1/2 w-44 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-1">
                                    {months.map(m => (
                                        <button key={m.value} onClick={() => { setSelectedMonth(m.value); setShowMonthPicker(false); }}
                                            className={cn("w-full px-4 py-2 text-right text-xs font-bold flex items-center justify-between", selectedMonth === m.value ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50")}>
                                            {m.label} {selectedMonth === m.value && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={() => { const i = months.findIndex(m => m.value === selectedMonth); if (i > 0) setSelectedMonth(months[i - 1].value); }} disabled={months.findIndex(m => m.value === selectedMonth) === 0} className="w-9 h-9 bg-white border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 disabled:opacity-50">
                            <ChevronLeft size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div onClick={() => setDetailType('manager')} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
                        <p className="text-xs font-bold text-gray-400 mb-1">تحصيل الإدارة</p>
                        <p className="text-2xl font-black text-blue-600 font-sans">{incomeData.feesByManager.toLocaleString()} <span className="text-xs">ج.م</span></p>
                    </div>
                    <div onClick={() => setDetailType('teachers')} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
                        <p className="text-xs font-bold text-gray-400 mb-1">مستلم من المدرسين</p>
                        <p className="text-2xl font-black text-sky-600 font-sans">{incomeData.fromTeachers.toLocaleString()} <span className="text-xs">ج.م</span></p>
                    </div>
                    <div onClick={() => setDetailType('other')} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
                        <p className="text-xs font-bold text-gray-400 mb-1">إيرادات أخرى</p>
                        <p className="text-2xl font-black text-purple-600 font-sans">{incomeData.otherIncome.toLocaleString()} <span className="text-xs">ج.م</span></p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl p-6 shadow-lg">
                    <p className="text-sm text-blue-100 font-bold mb-1">إجمالي الإيرادات</p>
                    <p className="text-4xl font-black font-sans">{incomeData.totalReceived.toLocaleString()} <span className="text-lg text-blue-200">ج.م</span></p>
                </div>

                {/* Detail Sections */}
                {detailType === 'manager' && (
                    <div className="space-y-3">
                        <h3 className="font-black text-gray-700 text-sm">تفاصيل تحصيل الإدارة</h3>
                        {incomeData.managerDirectFeesList.length === 0 ? (
                            <p className="text-xs text-gray-400 font-bold text-center py-8 bg-white rounded-2xl border border-dashed border-gray-100">لا توجد مبالغ محصلة هذا الشهر.</p>
                        ) : (
                            incomeData.managerDirectFeesList.map((fee: any) => {
                                const std = students.find(s => s.id === fee.studentId);
                                return (
                                    <div key={fee.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                        <div className="text-right">
                                            <p className="font-black text-gray-900 text-sm">{std?.fullName || fee.studentName || 'طالب'}</p>
                                            <p className="text-[10px] text-gray-400 font-bold">{typeof fee.date === 'string' ? fee.date.split('T')[0] : fee.date}</p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-lg font-black text-blue-600 font-sans">{Number(fee.amount?.toString().replace(/[^0-9.]/g, '') || 0).toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                                            {fee.createdBy && <p className="text-[9px] text-gray-400">بواسطة: {fee.createdBy}</p>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {detailType === 'teachers' && (
                    <div className="space-y-3">
                        <h3 className="font-black text-gray-700 text-sm">تفاصيل المستلم من المدرسين</h3>
                        {incomeData.feeTransactions.length === 0 ? (
                            <p className="text-xs text-gray-400 font-bold text-center py-8 bg-white rounded-2xl border border-dashed border-gray-100">لا توجد مبالغ مستلمة من المدرسين هذا الشهر.</p>
                        ) : (
                            incomeData.feeTransactions.map((tr: any) => (
                                <div key={tr.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                    <div className="text-right">
                                        <p className="font-black text-gray-900 text-sm">{tr.title}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">{tr.date}</p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-lg font-black text-sky-600 font-sans">{Number(tr.amount).toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                                        {tr.performedBy && <p className="text-[9px] text-gray-400">بواسطة: {tr.performedBy}</p>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {detailType === 'other' && (
                    <div className="space-y-3">
                        <h3 className="font-black text-gray-700 text-sm">تفاصيل الإيرادات الأخرى</h3>
                        {incomeData.otherIncomeTransactions.length === 0 ? (
                            <p className="text-xs text-gray-400 font-bold text-center py-8 bg-white rounded-2xl border border-dashed border-gray-100">لا توجد إيرادات أخرى هذا الشهر.</p>
                        ) : (
                            incomeData.otherIncomeTransactions.map((tr: any) => (
                                <div key={tr.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                    <div className="text-right">
                                        <p className="font-black text-gray-900 text-sm">{tr.title}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">{tr.date}</p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-lg font-black text-purple-600 font-sans">{Number(tr.amount).toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

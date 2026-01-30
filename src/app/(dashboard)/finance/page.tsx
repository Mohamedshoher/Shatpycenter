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
import { getFeesByMonth } from '@/features/students/services/recordsService';
import { useAuthStore } from '@/store/useAuthStore';
import type { TransactionData } from '@/features/finance/components/AddTransactionModal';
import type { FinancialTransaction, Teacher } from '@/types';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useTeacherAttendance } from '@/features/teachers/hooks/useTeacherAttendance';
import TeacherCollectionsModal from '@/features/finance/components/TeacherCollectionsModal';
import TeacherDetailModal from '@/features/teachers/components/TeacherDetailModal';

interface Transaction extends TransactionData {
    id: string;
    performedBy?: string;
    relatedUserId?: string;
}

export default function FinancePage() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income');
    const [selectedMonth, setSelectedMonth] = useState<string>('2026-01');
    const [isClient, setIsClient] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
    const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
    const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<Teacher | null>(null);
    const [isTeacherDetailOpen, setIsTeacherDetailOpen] = useState(false);
    const queryClient = useQueryClient();
    const { data: teachers = [] } = useTeachers();
    const { data: students = [] } = useStudents();
    const { data: groups = [] } = useGroups();

    const { attendance: detailAttendance, updateAttendance: detailUpdateAttendance } = useTeacherAttendance(selectedTeacherForDetail?.id, selectedMonth);

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

    // جلب الرسوم من جدول fees لضمان المطابقة مع تفاصيل المدرس
    const { data: allFees = [] } = useQuery({
        queryKey: ['all-fees', selectedMonth],
        queryFn: async () => {
            if (!isClient) return [];
            return await getFeesByMonth(selectedMonth);
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
            notes: '',
            performedBy: tr.performedBy,
            relatedUserId: tr.relatedUserId
        }));
    }, [dbTransactions]);

    // فلترة المعاملات حسب الشهر (بالفعل مفلترة من قاعدة البيانات)
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tr => tr.date.substring(0, 7) === selectedMonth);
    }, [transactions, selectedMonth]);

    // حساب الإجماليات
    const { teacherFees, feesByManager, fromTeachers, otherIncome, totalReceived, totalExpenses, balance, teacherCollections } = useMemo(() => {
        const incomeTransactions = filteredTransactions.filter(tr => tr.type === 'income');
        const expenseTransactions = filteredTransactions.filter(tr => tr.type === 'expense');

        // دالة لتوحيد الحروف العربية للمقارنة العميقة
        const normalize = (s: string) => {
            if (!s) return '';
            return s
                .replace(/[أإآ]/g, 'ا')
                .replace(/ة/g, 'ه')
                .replace(/ى/g, 'ي')
                .replace(/[ءئؤ]/g, '')
                .replace(/[ًٌٍَُِّ]/g, '') // حذف التشكيل
                .replace(/\s+/g, '')
                .trim();
        };

        const collectionsByTeacher: Record<string, { amount: number; count: number; teacher?: Teacher }> = {};

        // 1. تهيئة القائمة بكل المدرسين النشطين
        teachers.forEach(t => {
            if (t.status === 'active' || !t.status) {
                collectionsByTeacher[t.id] = { amount: 0, count: 0, teacher: t };
            }
        });

        // 2. تجميع التحصيل من جدول الرسوم (fees) لضمان الدقة
        allFees.forEach(fee => {
            const student = students.find(s => s.id === fee.studentId);
            // ملاحظة: حتى لو الطالب غير موجود حالياً (محذوف)، نحاول احتساب مبلغه إذا كان بيانات المدرس واضحة

            // البحث عن المدرس الذي قام بالتحصيل بناءً على حقل createdBy
            // هذا يضمن بقاء المبلغ مع المدرس حتى لو انتقل الطالب لمجموعة أخرى
            const matchedTeacher = teachers.find(t =>
                fee.createdBy === t.fullName ||
                fee.createdBy === t.phone ||
                (fee.createdBy && normalize(fee.createdBy) === normalize(t.fullName))
            );

            if (matchedTeacher) {
                if (!collectionsByTeacher[matchedTeacher.id]) {
                    collectionsByTeacher[matchedTeacher.id] = { amount: 0, count: 0, teacher: matchedTeacher };
                }
                const amt = Number(fee.amount.toString().replace(/[^0-9.]/g, '')) || 0;
                collectionsByTeacher[matchedTeacher.id].amount += amt;
                collectionsByTeacher[matchedTeacher.id].count += 1;
            } else if (student) {
                // محاولة أخيرة: إذا لم نجد اسم المدرس في الحقل، نعتمد على المدرس الحالي للمجموعة (فقط إذا كان الطالب موجوداً)
                const group = groups.find(g => g.id === student.groupId);
                if (group && group.teacherId) {
                    const groupTeacher = teachers.find(t => t.id === group.teacherId);
                    if (groupTeacher) {
                        // هنا لا نضيفه لمجموعة المدرس إلا لو كان الحقل createdBy فارغاً أو غير واضح
                        // لتجنب الازدواجية، نكتفي بالمطابقة أعلاه حالياً
                    }
                }
            }
        });

        // 3. حساب مبالغ المدير من incomeTransactions (financial_transactions)
        // نستبعد مبالغ المدرسين التي تم حسابها بدقة من جدول الرسوم
        const teacherCollections = Object.entries(collectionsByTeacher)
            .map(([id, data]) => ({
                teacherId: id,
                teacherName: data.teacher?.fullName || id,
                amount: data.amount,
                transactionCount: data.count,
                teacher: data.teacher
            }))
            .sort((a, b) => b.amount - a.amount);

        const totalFeesByTeachers = teacherCollections.reduce((sum, c) => sum + c.amount, 0);

        // حساب ما وصل للمدير فعلاً (رسوم مباشرة أو توريد من مدرسين)
        const totalFeesByManagerDirect = incomeTransactions
            .filter(tr => {
                if (tr.category !== 'fees') return false;
                const performerId = tr.performedBy?.replace('mock-', '');
                // إذا كان المنفذ هو أحد المدرسين، فهي "تحصيل مدرس" وليست "رسوم مباشرة للمدير"
                const isByTeacher = Object.keys(collectionsByTeacher).some(tid => tid === performerId || tid === tr.performedBy);
                return !isByTeacher;
            })
            .reduce((sum, tr) => sum + tr.amount, 0);

        const totalFromTeachers = incomeTransactions
            .filter(tr => tr.category === 'تحصيل من مدرس')
            .reduce((sum, tr) => sum + tr.amount, 0);

        const totalOtherIncome = incomeTransactions
            .filter(tr => tr.category === 'donation' || tr.category === 'other')
            .reduce((sum, tr) => sum + tr.amount, 0);

        const managerTotal = totalFeesByManagerDirect + totalFromTeachers;
        const totalExp = expenseTransactions.reduce((sum, tr) => sum + tr.amount, 0);

        return {
            teacherFees: totalFeesByTeachers,
            feesByManager: totalFeesByManagerDirect,
            fromTeachers: totalFromTeachers,
            otherIncome: totalOtherIncome,
            totalReceived: managerTotal,
            totalExpenses: totalExp,
            balance: managerTotal - totalExp,
            teacherCollections
        };
    }, [filteredTransactions, teachers, students, groups, allFees]);

    // تصنيفات الإنفاق
    const expenseBreakdown = useMemo(() => {
        const breakdown: Record<string, number> = {};
        filteredTransactions
            .filter(tr => tr.type === 'expense')
            .forEach(tr => {
                const category = tr.category || 'other';
                breakdown[category] = (breakdown[category] || 0) + tr.amount;
            });
        return breakdown;
    }, [filteredTransactions]);

    // تصنيفات الدخل
    const incomeBreakdown = useMemo(() => {
        const breakdown: Record<string, number> = {};
        filteredTransactions
            .filter(tr => tr.type === 'income')
            .forEach(tr => {
                const category = tr.category || 'other';
                breakdown[category] = (breakdown[category] || 0) + tr.amount;
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
        setIsModalOpen(false);
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

    const visibleTransactions = useMemo(() => {
        return filteredTransactions.filter(tr => {
            if (activeTab === 'expenses') return tr.type === 'expense';
            // Income
            if (tr.type !== 'income') return false;

            // Filter out teacher-collected fees (keep strictly manual/manager collections)
            if (tr.category === 'fees' && tr.performedBy !== user?.uid) return false;

            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredTransactions, activeTab, user?.uid]);

    return (
        <div className="pb-32 transition-all duration-500 bg-gray-50/50 min-h-screen">
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
            {/* Teacher Collections Breakdown Modal */}
            <TeacherCollectionsModal
                isOpen={isCollectionsModalOpen}
                onClose={() => setIsCollectionsModalOpen(false)}
                collections={teacherCollections}
                monthName={months.find(m => m.value === selectedMonth)?.label || ''}
                onTeacherClick={(teacher) => {
                    setSelectedTeacherForDetail(teacher);
                    setIsTeacherDetailOpen(true);
                }}
            />

            {/* Teacher Detail Modal */}
            <TeacherDetailModal
                teacher={selectedTeacherForDetail}
                isOpen={isTeacherDetailOpen}
                onClose={() => setIsTeacherDetailOpen(false)}
                attendanceData={detailAttendance as any}
                onAttendanceChange={(day, status) => detailUpdateAttendance({
                    date: `${selectedMonth}-${String(day).padStart(2, '0')}`,
                    status
                })}
            />

            <AddTransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddTransaction}
            />

            {/* Sticky Header */}
            <div className="sticky top-0 z-[70] bg-gray-50/95 backdrop-blur-xl px-4 py-4 border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 relative">
                    {/* Controls Row - Left */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-11 h-11 bg-blue-600 text-white rounded-[16px] flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                            title="إضافة معاملة"
                        >
                            <Plus size={22} />
                        </button>
                    </div>

                    {/* Month Picker - Center */}
                    {!isLoading && isClient && (
                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => setShowMonthPicker(!showMonthPicker)}
                                    className="h-12 px-6 bg-white border border-blue-100 rounded-[18px] flex items-center gap-3 text-blue-700 font-black transition-all shadow-md shadow-blue-500/5 active:scale-95 hover:border-blue-300 hover:bg-blue-50/30"
                                >
                                    <Calendar size={20} className="text-blue-600" />
                                    <span className="text-sm whitespace-nowrap">{months.find(m => m.value === selectedMonth)?.label}</span>
                                    <ChevronDown size={16} className={cn("transition-transform duration-300 text-blue-400", showMonthPicker && "rotate-180")} />
                                </button>

                                {showMonthPicker && (
                                    <div className="absolute top-[120%] left-1/2 -translate-x-1/2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                                        {months.map(month => (
                                            <button
                                                key={month.value}
                                                onClick={() => {
                                                    setSelectedMonth(month.value);
                                                    setShowMonthPicker(false);
                                                }}
                                                className={cn(
                                                    "w-full px-4 py-2.5 text-right text-xs font-bold transition-all flex items-center justify-between",
                                                    selectedMonth === month.value ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                                                )}
                                            >
                                                {month.label}
                                                {selectedMonth === month.value && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Title/Balance - Right */}
                    <div className="flex items-center gap-2">
                        <div className="text-right hidden sm:block">
                            <h1 className="text-sm font-black text-gray-900 leading-tight">المالية والمصروفات</h1>
                            <p className="text-[10px] font-bold text-gray-400">مركز الشاطبي</p>
                        </div>
                        <div className="w-11 h-11 bg-white border border-gray-100 rounded-[16px] flex items-center justify-center text-blue-600 shadow-sm">
                            <Wallet size={22} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
                {/* Loading State */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-gray-400 font-bold">جاري تحميل البيانات المالية...</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Teacher Collections */}
                            <div
                                onClick={() => setIsCollectionsModalOpen(true)}
                                className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-50 flex flex-col gap-3 relative overflow-hidden group cursor-pointer hover:border-purple-200 hover:shadow-lg transition-all"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                                        <ArrowUpCircle size={20} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400">محصل بواسطة المدرسين</p>
                                        <h3 className="text-xl font-black text-purple-600 font-sans tracking-tight">
                                            {teacherFees.toLocaleString()} <span className="text-[10px]">ج.م</span>
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            {/* Total Received */}
                            <div className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-50 flex flex-col gap-3 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                                <div className="flex flex-col gap-2 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                                            <ArrowUpCircle size={20} />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-gray-400">إجمالي المستلم (الصندوق)</p>
                                            <h3 className="text-xl font-black text-green-600 font-sans tracking-tight">
                                                {totalReceived.toLocaleString()} <span className="text-[10px]">ج.م</span>
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="space-y-1 border-t border-gray-50 pt-2 mt-1">
                                        <div className="flex justify-between items-center text-[9px] font-bold">
                                            <span className="text-gray-400">رسوم مباشرة:</span>
                                            <span className="text-green-600">{feesByManager.toLocaleString()} ج.م</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] font-bold">
                                            <span className="text-gray-400">تحصيل مدرسين:</span>
                                            <span className="text-blue-500">{fromTeachers.toLocaleString()} ج.م</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] font-bold opacity-60">
                                            <span className="text-gray-400">إيرادات أخرى (خارج الصندوق):</span>
                                            <span className="text-purple-500">{otherIncome.toLocaleString()} ج.م</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expenses */}
                            <div className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-50 flex flex-col gap-3 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                                        <ArrowDownCircle size={20} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400">المصروفات</p>
                                        <h3 className="text-xl font-black text-red-600 font-sans tracking-tight">
                                            {totalExpenses.toLocaleString()} <span className="text-[10px]">ج.م</span>
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            {/* Balance/Profit */}
                            <div className={cn(
                                "rounded-[28px] p-5 shadow-sm border flex flex-col gap-3 relative overflow-hidden group",
                                balance >= 0 ? "bg-blue-600 text-white border-blue-600" : "bg-orange-500 text-white border-orange-500"
                            )}>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="w-10 h-10 bg-white/20 text-white rounded-xl flex items-center justify-center backdrop-blur-md">
                                        <Wallet size={20} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold opacity-80">{balance >= 0 ? 'صافي الربح' : 'صافي الخسارة'}</p>
                                        <h3 className="text-xl font-black font-sans tracking-tight">
                                            {balance >= 0 ? '+' : ''}{balance.toLocaleString()} <span className="text-[10px]">ج.م</span>
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs & Transactions */}
                        <div className="space-y-6">
                            <div className="flex bg-white p-1.5 rounded-[20px] shadow-sm border border-gray-100 max-w-md mx-auto">
                                <button
                                    onClick={() => setActiveTab('expenses')}
                                    className={cn(
                                        "flex-1 py-3 rounded-[14px] text-xs font-black transition-all",
                                        activeTab === 'expenses' ? "bg-red-50 text-red-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    المصروفات
                                </button>
                                <button
                                    onClick={() => setActiveTab('income')}
                                    className={cn(
                                        "flex-1 py-3 rounded-[14px] text-xs font-black transition-all",
                                        activeTab === 'income' ? "bg-green-50 text-green-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    الإيرادات
                                </button>
                            </div>

                            {/* Detailed List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                {visibleTransactions.length > 0 ? (
                                    visibleTransactions.map((tr) => (
                                        <div
                                            key={tr.id}
                                            className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-50 flex flex-col gap-4 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden h-full"
                                        >
                                            {/* Line 1: Title & Icon */}
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-900 text-sm leading-relaxed" dir="rtl">
                                                        {tr.title}
                                                    </h4>
                                                </div>
                                                <div className={cn(
                                                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                                                    activeTab === 'income' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                                )}>
                                                    {activeTab === 'income' ? <ArrowUpCircle size={22} /> : <ArrowDownCircle size={22} />}
                                                </div>
                                            </div>

                                            {/* Line 2: Amount & Date */}
                                            <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-2xl">
                                                <div className={cn(
                                                    "text-base font-black font-sans tracking-tight",
                                                    activeTab === 'income' ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {activeTab === 'income' ? '+' : '-'}{tr.amount.toLocaleString()} <span className="text-[10px]">ج.م</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <span className="text-[10px] font-bold">
                                                        {new Date(tr.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}
                                                    </span>
                                                    <Calendar size={12} />
                                                </div>
                                            </div>

                                            {/* Line 3: Category & Delete */}
                                            <div className="flex justify-between items-center mt-auto pt-1">
                                                <button
                                                    onClick={() => handleDeleteClick(tr.id)}
                                                    className="w-10 h-10 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all shadow-sm active:scale-90"
                                                    title="حذف"
                                                >
                                                    <Trash2 size={18} />
                                                </button>

                                                <div className="text-right">
                                                    <span className="text-[10px] font-black text-gray-500 bg-gray-100/50 px-4 py-1.5 rounded-xl border border-gray-100/50">
                                                        {tr.category === 'fees' ? 'رسوم واشتراكات' :
                                                            tr.category === 'salary' ? 'رواتب' :
                                                                tr.category === 'donation' ? 'تبرعات' :
                                                                    tr.category === 'utilities' ? 'مرافق' : tr.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-20 text-center space-y-3 bg-white rounded-[40px] border border-gray-100 border-dashed">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto">
                                            <Wallet size={40} />
                                        </div>
                                        <p className="text-gray-400 font-bold">لا توجد معاملات مسجلة في هذا التبويب</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

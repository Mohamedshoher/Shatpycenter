"use client";

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    Wallet,
    Plus,
    Gift,
    ChevronDown,
    Calendar,
    AlertCircle,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AddTransactionModal from '@/features/finance/components/AddTransactionModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactionsByMonth } from '@/features/finance/services/financeService';
import { getFeesByMonth } from '@/features/students/services/recordsService';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
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
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [isClient, setIsClient] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
    const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<Teacher | null>(null);
    const [isTeacherDetailOpen, setIsTeacherDetailOpen] = useState(false);
    const queryClient = useQueryClient();
    const { data: teachers = [] } = useTeachers();
    const { data: students = [] } = useStudents();
    const { data: groups = [] } = useGroups();
    const [deficitOnlyModal, setDeficitOnlyModal] = useState(false);
    const [expectedOnlyModal, setExpectedOnlyModal] = useState(false);
    const [isReceivedDetailsOpen, setIsReceivedDetailsOpen] = useState(false);
    const [isExpenseDetailsOpen, setIsExpenseDetailsOpen] = useState(false);
    const [isExemptionsModalOpen, setIsExemptionsModalOpen] = useState(false);

    // Get Exemptions
    const { data: exemptions = [] } = useQuery({
        queryKey: ['exemptions', selectedMonth],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('free_exemptions')
                .select('*')
                .eq('month', selectedMonth);
            return data || [];
        },
        enabled: isClient && !!selectedMonth
    });

    const { attendance: detailAttendance, updateAttendance: detailUpdateAttendance } = useTeacherAttendance(selectedTeacherForDetail?.id, selectedMonth);

    // Set current month on client side
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
            result.push({
                value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
            });
        }
        return result;
    }, []);

    // Fetch transactions from DB
    const { data: dbTransactions = [], isLoading } = useQuery({
        queryKey: ['transactions', selectedMonth],
        queryFn: async () => {
            if (!isClient) return [];
            const [year, month] = selectedMonth.split('-');
            return await getTransactionsByMonth(parseInt(year), parseInt(month));
        },
        enabled: isClient && !!selectedMonth
    });

    // Fetch fees from fee table
    const { data: allFees = [] } = useQuery({
        queryKey: ['all-fees', selectedMonth],
        queryFn: async () => {
            if (!isClient) return [];
            // Try fetching by both YYYY-MM and Arabic label to support all versions of data
            const feesByKey = await getFeesByMonth(selectedMonth);
            const label = months.find(m => m.value === selectedMonth)?.label;
            const feesByLabel = label ? await getFeesByMonth(label) : [];

            // Merge and deduplicate
            const seen = new Set();
            return [...feesByKey, ...feesByLabel].filter(f => {
                if (seen.has(f.id)) return false;
                seen.add(f.id);
                return true;
            });
        },
        enabled: isClient && !!selectedMonth
    });

    // Process transactions
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

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tr => tr.date.substring(0, 7) === selectedMonth);
    }, [transactions, selectedMonth]);

    // Calculate totals
    const {
        teacherFees,
        feesByManager,
        fromTeachers,
        otherIncome,
        totalReceived,
        totalExpenses,
        balance,
        teacherCollections,
        totalGlobalDeficit,
        totalGlobalExpected,
        totalGlobalExempted
    } = useMemo(() => {
        const incomeTransactions = filteredTransactions.filter(tr => tr.type === 'income');
        const expenseTransactions = filteredTransactions.filter(tr => tr.type === 'expense');

        const normalize = (s: string) => {
            if (!s) return '';
            return s
                .replace(/[أإآ]/g, 'ا')
                .replace(/ة/g, 'ه')
                .replace(/ى/g, 'ي')
                .replace(/[ءئؤ]/g, '')
                .replace(/[ًٌٍَُِّ]/g, '')
                .replace(/\s+/g, '')
                .trim();
        };

        const collectionsByTeacher: Record<string, { amount: number; count: number; teacher?: Teacher }> = {};

        teachers.forEach(t => {
            if (t.status === 'active' || !t.status) {
                collectionsByTeacher[t.id] = { amount: 0, count: 0, teacher: t };
            }
        });

        allFees.forEach(fee => {
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
            }
        });

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

        const totalFeesByManagerDirect = allFees
            .filter(fee => {
                const isByTeacher = teachers.some(t =>
                    fee.createdBy === t.fullName ||
                    fee.createdBy === t.phone ||
                    (fee.createdBy && normalize(fee.createdBy) === normalize(t.fullName))
                );
                const isExplicitManager = fee.createdBy === user?.displayName || fee.createdBy === 'المدير' || fee.createdBy === 'admin';
                const isNotTeacher = !isByTeacher && fee.createdBy && fee.createdBy !== 'غير معروف';
                return isExplicitManager || isNotTeacher;
            })
            .reduce((sum, fee) => sum + (Number(fee.amount?.toString().replace(/[^0-9.]/g, '')) || 0), 0);

        const totalFromTeachers = incomeTransactions
            .filter(tr => tr.category === 'تحصيل من مدرس')
            .reduce((sum, tr) => sum + tr.amount, 0);

        const totalOtherIncome = incomeTransactions
            .filter(tr => tr.category === 'donation' || tr.category === 'other')
            .reduce((sum, tr) => sum + tr.amount, 0);

        const managerTotal = totalFeesByManagerDirect + totalFromTeachers + totalOtherIncome;
        const totalExp = expenseTransactions.reduce((sum, tr) => sum + tr.amount, 0);

        const exemptedStudentIds = exemptions.map((e: any) => e.student_id);
        const collectionsWithDeficit = teacherCollections.map(col => {
            const teacherId = col.teacherId;
            const teacherGroups = groups.filter(g => g.teacherId === teacherId).map(g => g.id);
            const teacherStudents = students.filter(s => {
                const isMember = s.groupId && teacherGroups.includes(s.groupId) && s.status !== 'archived';
                if (!isMember) return false;

                // Only include student if they were enrolled on or before the selected month
                if (s.enrollmentDate) {
                    const enrollYearMonth = s.enrollmentDate.substring(0, 7); // YYYY-MM
                    return enrollYearMonth <= selectedMonth;
                }
                return true;
            });

            let teacherDeficit = 0;
            let teacherExpected = 0;
            let unpaidCount = 0;

            teacherStudents.forEach(student => {
                const studentFees = allFees.filter(f => f.studentId === student.id);
                const totalPaidByStudent = studentFees.reduce((sum, f) => sum + (Number(f.amount?.toString().replace(/[^0-9.]/g, '')) || 0), 0);
                const expectedAmount = Number(student.monthlyAmount) || 0;
                const remaining = Math.max(0, expectedAmount - totalPaidByStudent);
                const isExempted = exemptedStudentIds.includes(student.id);

                teacherExpected += expectedAmount;
                if (remaining > 0 && !isExempted) {
                    teacherDeficit += remaining;
                    unpaidCount += 1;
                }
            });

            return {
                ...col,
                deficit: teacherDeficit,
                expected: teacherExpected,
                unpaidCount
            };
        });

        const totalGlobalDeficit = collectionsWithDeficit.reduce((sum, c) => sum + (c.deficit || 0), 0);
        const totalGlobalExpected = collectionsWithDeficit.reduce((sum, c) => sum + (c.expected || 0), 0);

        return {
            teacherFees: totalFeesByTeachers,
            feesByManager: totalFeesByManagerDirect,
            fromTeachers: totalFromTeachers,
            otherIncome: totalOtherIncome,
            totalReceived: managerTotal,
            totalExpenses: totalExp,
            balance: managerTotal - totalExp,
            teacherCollections: collectionsWithDeficit,
            totalGlobalDeficit,
            totalGlobalExpected,
            totalGlobalExempted: exemptions.reduce((sum, e: any) => sum + (Number(e.amount) || 0), 0)
        };
    }, [filteredTransactions, teachers, students, groups, allFees, user?.displayName, exemptions, selectedMonth]);

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

    const handleAddTransaction = (data: TransactionData) => {
        setIsModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['transactions', selectedMonth] });
    };

    return (
        <div className="pb-32 transition-all duration-500 bg-gray-50/50 min-h-screen font-sans">
            {/* Modals */}
            <TeacherCollectionsModal
                isOpen={isCollectionsModalOpen}
                onClose={() => {
                    setIsCollectionsModalOpen(false);
                    setDeficitOnlyModal(false);
                    setExpectedOnlyModal(false);
                }}
                collections={teacherCollections}
                monthName={months.find(m => m.value === selectedMonth)?.label || ''}
                showDeficitOnly={deficitOnlyModal}
                showExpectedOnly={expectedOnlyModal}
                onTeacherClick={(teacher) => {
                    setSelectedTeacherForDetail(teacher);
                    setIsTeacherDetailOpen(true);
                }}
            />

            <TeacherDetailModal
                teacher={selectedTeacherForDetail}
                isOpen={isTeacherDetailOpen}
                onClose={() => setIsTeacherDetailOpen(false)}
            />

            <AddTransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddTransaction}
            />

            {/* Total Received Details Modal */}
            <AnimatePresence>
                {isReceivedDetailsOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsReceivedDetailsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] h-fit bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col border border-gray-100"
                        >
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                                <button
                                    onClick={() => setIsReceivedDetailsOpen(false)}
                                    className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                >
                                    <X size={20} />
                                </button>
                                <div className="text-right">
                                    <h2 className="text-xl font-black text-gray-900">تفاصيل الإيرادات</h2>
                                    <p className="text-xs font-bold text-gray-400">تحليل مبالغ الصندوق الواردة</p>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-green-50/50 rounded-2xl border border-green-100/50">
                                        <div className="text-lg font-black text-green-600 font-sans tracking-tight">
                                            {feesByManager.toLocaleString()} <span className="text-[10px]">ج.م</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-green-700">المحصل من المدير مباشر</p>
                                            <p className="text-[10px] font-bold text-green-600/60">رسوم ومبالغ تم تسليمها للإدارة مباشرة</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                        <div className="text-lg font-black text-blue-600 font-sans tracking-tight">
                                            {fromTeachers.toLocaleString()} <span className="text-[10px]">ج.م</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-blue-700">المستلم من المدرسين</p>
                                            <p className="text-[10px] font-bold text-blue-600/60">مبالغ تم توريدها من تحصيل المجموعات</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50">
                                        <div className="text-lg font-black text-purple-600 font-sans tracking-tight">
                                            {otherIncome.toLocaleString()} <span className="text-[10px]">ج.م</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-purple-700">الإيرادات الأخرى</p>
                                            <p className="text-[10px] font-bold text-purple-600/60">تبرعات ومصادر دخل متنوعة</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                                    <div className="text-2xl font-black text-gray-900 font-sans tracking-tight">
                                        {totalReceived.toLocaleString()} <span className="text-sm">ج.م</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-gray-400">إجمالي الصندوق للفترة</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Exemptions Details Modal */}
            <AnimatePresence>
                {isExemptionsModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md"
                            onClick={() => setIsExemptionsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[95%] max-w-2xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20"
                        >
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
                                        <Gift size={24} />
                                    </div>
                                    <div className="text-right">
                                        <h3 className="text-xl font-black text-gray-900">تفاصيل الإعفاءات المالية</h3>
                                        <p className="text-xs font-bold text-gray-400 mt-0.5">لشهر {months.find(m => m.value === selectedMonth)?.label}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsExemptionsModalOpen(false)}
                                    className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto no-scrollbar space-y-4">
                                {exemptions.length === 0 ? (
                                    <div className="py-20 text-center text-gray-400 text-sm font-bold bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                                        لا توجد إعفاءات مسجلة لهذا الشهر.
                                    </div>
                                ) : (
                                    exemptions.map((ex: any) => (
                                        <div key={ex.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:border-teal-200 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center font-black text-xs">كلي</div>
                                                <div className="text-right">
                                                    <h4 className="font-black text-gray-900 group-hover:text-teal-600 transition-colors">{ex.student_name}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold">بواسطة: {ex.exempted_by}</p>
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-lg font-black text-teal-600 font-sans">{Number(ex.amount).toLocaleString()} <span className="text-[10px]">ج.م</span></p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-6 bg-gray-50/50 border-t border-gray-50 shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-black text-teal-600 font-sans">
                                        {totalGlobalExempted.toLocaleString()} <span className="text-sm">ج.م</span>
                                    </div>
                                    <p className="text-xs font-black text-gray-400">إجمالي المبلغ المعفي عنه</p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Total Expenses Details Modal */}
            <AnimatePresence>
                {isExpenseDetailsOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsExpenseDetailsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] h-fit bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col border border-gray-100"
                        >
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                                <button
                                    onClick={() => setIsExpenseDetailsOpen(false)}
                                    className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                >
                                    <X size={20} />
                                </button>
                                <div className="text-right">
                                    <h2 className="text-xl font-black text-gray-900">تفاصيل المصروفات</h2>
                                    <p className="text-xs font-bold text-gray-400">تحليل المبالغ الخارجة</p>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                                        <div className="text-lg font-black text-orange-600 font-sans tracking-tight">
                                            {(expenseBreakdown['salary'] || 0).toLocaleString()} <span className="text-[10px]">ج.م</span>
                                        </div>
                                        <p className="text-xs font-black text-orange-700">رواتب ومستحقات</p>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                        <div className="text-lg font-black text-blue-600 font-sans tracking-tight">
                                            {(expenseBreakdown['utilities'] || 0).toLocaleString()} <span className="text-[10px]">ج.م</span>
                                        </div>
                                        <p className="text-xs font-black text-blue-700">مرافق وصيانة</p>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-2xl border border-red-100/50">
                                        <div className="text-lg font-black text-red-600 font-sans tracking-tight">
                                            {(expenseBreakdown['fees'] || 0).toLocaleString()} <span className="text-[10px]">ج.م</span>
                                        </div>
                                        <p className="text-xs font-black text-red-700">رسوم وعمولات</p>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                        <div className="text-lg font-black text-gray-600 font-sans tracking-tight">
                                            {(expenseBreakdown['other'] || 0).toLocaleString()} <span className="text-[10px]">ج.م</span>
                                        </div>
                                        <p className="text-xs font-black text-gray-700">مصروفات أخرى</p>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                                    <div className="text-2xl font-black text-gray-900 font-sans tracking-tight">
                                        {totalExpenses.toLocaleString()} <span className="text-sm">ج.م</span>
                                    </div>
                                    <p className="text-xs font-black text-gray-400">إجمالي المصروفات</p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Sticky Header */}
            <div className="sticky top-0 z-[70] bg-gray-50/95 backdrop-blur-xl px-4 py-4 border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 relative">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-11 h-11 bg-blue-600 text-white rounded-[16px] flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            <Plus size={22} />
                        </button>
                    </div>

                    {!isLoading && isClient && (
                        <div className="absolute left-1/2 -translate-x-1/2">
                            <button
                                onClick={() => setShowMonthPicker(!showMonthPicker)}
                                className="h-12 px-6 bg-white border border-blue-100 rounded-[18px] flex items-center gap-3 text-blue-700 font-black shadow-md shadow-blue-500/5 hover:border-blue-300"
                            >
                                <Calendar size={20} className="text-blue-600" />
                                <span className="text-sm whitespace-nowrap">{months.find(m => m.value === selectedMonth)?.label}</span>
                                <ChevronDown size={16} className={cn("transition-transform duration-300", showMonthPicker && "rotate-180")} />
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
                    )}

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

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-gray-400 font-bold font-sans">جاري التحميل...</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-5 sm:gap-6">
                            {/* Card: Expected */}
                            <div
                                onClick={() => { setExpectedOnlyModal(true); setIsCollectionsModalOpen(true); }}
                                className="bg-white/90 backdrop-blur-xl border border-indigo-100/50 rounded-[32px] p-6 flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all group cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100/30">
                                    <ArrowUpCircle size={24} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-gray-400 mb-1">إجمالي المتوقع</p>
                                    <h3 className="text-2xl font-black text-indigo-600 font-sans tracking-tight">
                                        {totalGlobalExpected.toLocaleString()} <span className="text-xs">ج.م</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Card: Teacher Collections */}
                            <div
                                onClick={() => { setDeficitOnlyModal(false); setExpectedOnlyModal(false); setIsCollectionsModalOpen(true); }}
                                className="bg-white/90 backdrop-blur-xl border border-purple-100/50 rounded-[32px] p-6 flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all group cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shadow-sm border border-purple-100/30">
                                    <ArrowUpCircle size={24} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-gray-400 mb-1">محصل المدرسين</p>
                                    <h3 className="text-2xl font-black text-purple-600 font-sans tracking-tight">
                                        {teacherFees.toLocaleString()} <span className="text-xs">ج.م</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Card: Total Received (Income) */}
                            <div
                                onClick={() => setIsReceivedDetailsOpen(true)}
                                className="bg-white/90 backdrop-blur-xl border border-green-100/50 rounded-[32px] p-6 flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-2xl hover:shadow-green-500/10 hover:-translate-y-1 transition-all group cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-sm border border-green-100/30">
                                    <ArrowUpCircle size={24} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-gray-400 mb-1">الإيرادات</p>
                                    <h3 className="text-2xl font-black text-green-600 font-sans tracking-tight">
                                        {totalReceived.toLocaleString()} <span className="text-xs">ج.م</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Card: Deficit */}
                            <div
                                onClick={() => { setDeficitOnlyModal(true); setIsCollectionsModalOpen(true); }}
                                className="bg-white/90 backdrop-blur-xl border border-amber-100/50 rounded-[32px] p-6 flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all group cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm border border-amber-100/30">
                                    <AlertCircle size={24} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-gray-400 mb-1">إجمالي العجز</p>
                                    <h3 className="text-2xl font-black text-amber-600 font-sans tracking-tight">
                                        {totalGlobalDeficit.toLocaleString()} <span className="text-xs">ج.م</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Card: Exempted */}
                            <div
                                onClick={() => setIsExemptionsModalOpen(true)}
                                className="bg-white/90 backdrop-blur-xl border border-teal-100/50 rounded-[32px] p-6 flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-2xl hover:shadow-teal-500/10 hover:-translate-y-1 transition-all group cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shadow-sm border border-teal-100/30">
                                    <Gift size={24} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-gray-400 mb-1">إجمالي المعفي عنه</p>
                                    <h3 className="text-2xl font-black text-teal-600 font-sans tracking-tight">
                                        {totalGlobalExempted.toLocaleString()} <span className="text-xs">ج.م</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Card: Expenses */}
                            <div
                                onClick={() => setIsExpenseDetailsOpen(true)}
                                className="bg-white/90 backdrop-blur-xl border border-red-100/50 rounded-[32px] p-6 flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-2xl hover:shadow-red-500/10 hover:-translate-y-1 transition-all group cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-sm border border-red-100/30">
                                    <ArrowDownCircle size={24} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-gray-400 mb-1">المصروفات</p>
                                    <h3 className="text-2xl font-black text-red-600 font-sans tracking-tight">
                                        {totalExpenses.toLocaleString()} <span className="text-xs">ج.م</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Card: Balance */}
                            <div className={cn(
                                "backdrop-blur-xl border rounded-[32px] p-6 flex flex-col justify-between min-h-[160px] shadow-sm transition-all col-span-2 sm:col-span-1",
                                balance >= 0 ? "bg-blue-600 text-white border-blue-400/30 shadow-blue-500/20" : "bg-orange-600 text-white border-orange-400/30 shadow-orange-500/20"
                            )}>
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border",
                                    balance >= 0 ? "bg-white/20 border-white/30 text-white" : "bg-white/20 border-white/30 text-white"
                                )}>
                                    <Wallet size={24} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-white/70 mb-1">{balance >= 0 ? 'صافي الربح' : 'صافي الخسارة'}</p>
                                    <h3 className="text-2xl font-black font-sans tracking-tight">
                                        {balance >= 0 ? '+' : ''}{balance.toLocaleString()} <span className="text-xs text-white/80">ج.م</span>
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

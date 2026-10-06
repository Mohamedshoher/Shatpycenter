"use client";

import { useState, useMemo, useEffect } from 'react';
import ArrowUpCircle from 'lucide-react/dist/esm/icons/arrow-up-circle'
import ArrowDownCircle from 'lucide-react/dist/esm/icons/arrow-down-circle'
import Wallet from 'lucide-react/dist/esm/icons/wallet'
import Plus from 'lucide-react/dist/esm/icons/plus'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import X from 'lucide-react/dist/esm/icons/x';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTransactionsByMonth, addTransaction } from '@/features/finance/services/financeService';
import { getFeesByMonth } from '@/features/students/services/recordsService';
import { useAuthStore } from '@/store/useAuthStore';
import { FadeIn, SlideIn } from '@/components/ui/transition';
import type { TransactionData } from '@/features/finance/components/AddTransactionModal';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useAllTeachersAttendance } from '@/features/teachers/hooks/useTeacherAttendance';
import { teacherDeductionService } from '@/features/teachers/services/deductionService';
import { computeTeacherSalaryStats } from '@/features/teachers/services/salaryCalculation';

const AddTransactionModal = dynamic(() => import('@/features/finance/components/AddTransactionModal'), { ssr: false });
const TeacherDetailModal = dynamic(() => import('@/features/teachers/components/TeacherDetailModal'), { ssr: false });

interface Transaction extends TransactionData {
    id: string;
    performedBy?: string;
    relatedUserId?: string;
}

interface ExemptionRecord {
    id: string;
    student_id: string;
    student_name?: string;
    amount: number;
    exempted_by?: string;
}

export default function FinancePage() {
    const { user } = useAuthStore();
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [isClient, setIsClient] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSalaryStatusOpen, setIsSalaryStatusOpen] = useState(false);
    const [selectedSalaryTeacher, setSelectedSalaryTeacher] = useState<typeof teachers[number] | null>(null);
    const [isSalaryTeacherOpen, setIsSalaryTeacherOpen] = useState(false);
    const [isDeficitOpen, setIsDeficitOpen] = useState(false);
    const [isManagerDirectOpen, setIsManagerDirectOpen] = useState(false);
    const [isFromTeachersOpen, setIsFromTeachersOpen] = useState(false);
    const [selectedFromTeacherId, setSelectedFromTeacherId] = useState<string | null>(null);
    const [isOtherIncomeOpen, setIsOtherIncomeOpen] = useState(false);
    const [isExemptionsOpen, setIsExemptionsOpen] = useState(false);
    const [isDeductionsOpen, setIsDeductionsOpen] = useState(false);
    const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
    const [isDeliveryDeficitOpen, setIsDeliveryDeficitOpen] = useState(false);
    const [isProfitBreakdownOpen, setIsProfitBreakdownOpen] = useState(false);
    const [isExpensesBreakdownOpen, setIsExpensesBreakdownOpen] = useState(false);
    const [expandedExpenseKey, setExpandedExpenseKey] = useState<string | null>(null);
    const [isDevelopmentOpen, setIsDevelopmentOpen] = useState(false);
    const queryClient = useQueryClient();
    const { data: teachers = [] } = useTeachers();
    const { data: students = [] } = useStudents();
    const { data: groups = [] } = useGroups();

    const normalize = (s: string) => {
        if (!s) return '';
        return s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ءئؤ]/g, '').replace(/[ًٌٍَُِّ]/g, '').replace(/\s+/g, '').trim();
    };

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

    const { data: dbTransactions = [], isLoading } = useQuery({
        queryKey: ['transactions', selectedMonth],
        queryFn: async () => {
            if (!isClient) return [];
            const [year, month] = selectedMonth.split('-');
            return await getTransactionsByMonth(parseInt(year), parseInt(month));
        },
        enabled: isClient && !!selectedMonth
    });

    const { data: allFees = [] } = useQuery({
        queryKey: ['all-fees', selectedMonth],
        queryFn: async () => {
            if (!isClient) return [];
            const feesByKey = await getFeesByMonth(selectedMonth);
            const label = months.find(m => m.value === selectedMonth)?.label;
            const feesByLabel = label ? await getFeesByMonth(label) : [];
            const seen = new Set();
            return [...feesByKey, ...feesByLabel].filter(f => {
                if (seen.has(f.id)) return false;
                seen.add(f.id);
                return true;
            });
        },
        enabled: isClient && !!selectedMonth
    });

    const { data: exemptions = [] } = useQuery({
        queryKey: ['exemptions', selectedMonth],
        queryFn: async () => {
            const res = await fetch(`/api/records/exemptions?month=${encodeURIComponent(selectedMonth)}`);
            const data: ExemptionRecord[] = res.ok ? await res.json() : [];
            return data || [];
        },
        enabled: isClient && !!selectedMonth
    });

    const { data: monthDeductions = [] } = useQuery({
        queryKey: ['all-deductions-finance', selectedMonth],
        queryFn: async () => teacherDeductionService.getAllDeductions(),
        enabled: isClient && !!selectedMonth
    });

    const allAttendanceResult = useAllTeachersAttendance(selectedMonth);
    const allAttendanceMap = useMemo(
        () => (allAttendanceResult.data || {}) as Record<string, Record<string, string>>,
        [allAttendanceResult.data]
    );

    const transactions: Transaction[] = useMemo(() => {
        return dbTransactions.map(tr => ({
            id: tr.id,
            type: tr.type as 'income' | 'expense',
            title: tr.description,
            category: tr.category as TransactionData['category'],
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

    const {
        totalReceived,
        totalExpenses,
        balance,
        totalGlobalDeficit,
        totalGlobalExempted,
        totalGlobalDeductions,
        teacherFees,
        feesByManager,
        fromTeachers,
        otherIncome,
        paidCount,
        unpaidCount,
    } = useMemo(() => {
        const incomeTransactions = filteredTransactions.filter(tr => tr.type === 'income');
        const expenseTransactions = filteredTransactions.filter(tr => tr.type === 'expense');

        const normalize = (s: string) => {
            if (!s) return '';
            return s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ءئؤ]/g, '').replace(/[ًٌٍَُِّ]/g, '').replace(/\s+/g, '').trim();
        };

        const collectionsByTeacher: Record<string, { amount: number; count: number }> = {};
        teachers.forEach(t => { if (t.status === 'active' || !t.status) collectionsByTeacher[t.id] = { amount: 0, count: 0 }; });

        allFees.forEach(fee => {
            const matched = teachers.find(t => fee.createdBy === t.fullName || fee.createdBy === t.phone || (fee.createdBy && normalize(fee.createdBy) === normalize(t.fullName)));
            if (matched) {
                if (!collectionsByTeacher[matched.id]) collectionsByTeacher[matched.id] = { amount: 0, count: 0 };
                collectionsByTeacher[matched.id].amount += Number(fee.amount?.toString().replace(/[^0-9.]/g, '')) || 0;
                collectionsByTeacher[matched.id].count += 1;
            }
        });

        const totalFeesByTeachers = Object.values(collectionsByTeacher).reduce((sum, c) => sum + c.amount, 0);
        const totalFeesByManagerDirect = allFees.filter(fee => {
            const isByTeacher = teachers.some(t => fee.createdBy === t.fullName || fee.createdBy === t.phone || (fee.createdBy && normalize(fee.createdBy) === normalize(t.fullName)));
            const isExplicitManager = fee.createdBy === user?.displayName || fee.createdBy === 'المدير' || fee.createdBy === 'admin';
            return isExplicitManager || (!isByTeacher && fee.createdBy && fee.createdBy !== 'غير معروف');
        }).reduce((sum, fee) => sum + (Number(fee.amount?.toString().replace(/[^0-9.]/g, '')) || 0), 0);

        const totalFromTeachers = incomeTransactions.filter(tr => tr.category === 'تحصيل من مدرس').reduce((sum, tr) => sum + tr.amount, 0);
        const totalOtherIncome = incomeTransactions.filter(tr => tr.category === 'donation' || tr.category === 'other').reduce((sum, tr) => sum + tr.amount, 0);
        const totalInc = totalFeesByManagerDirect + totalFromTeachers + totalOtherIncome;
        const totalExp = expenseTransactions.reduce((sum, tr) => sum + tr.amount, 0);

        const exemptedIds = new Set(exemptions.map((e) => e.student_id));
        const totalDeficit = Object.entries(collectionsByTeacher).reduce((sum, [id]) => {
            const tGroups = groups.filter(g => g.teacherId === id).map(g => g.id);
            const tStudents = students.filter(s => s.groupId && tGroups.includes(s.groupId) && s.status !== 'archived' && s.enrollmentDate && s.enrollmentDate.length >= 7 && s.enrollmentDate.substring(0, 7) <= selectedMonth);
            return sum + tStudents.reduce((acc, s) => {
                const paid = allFees.filter((f) => f.studentId === s.id).reduce((a, f) => a + (Number(f.amount?.toString().replace(/[^0-9.]/g, '')) || 0), 0);
                const amt = Number(s.monthlyAmount) || 0;
                return acc + (amt > paid && !exemptedIds.has(s.id) ? amt - paid : 0);
            }, 0);
        }, 0);

        const totalExempted = exemptions.reduce((s: number, e) => s + (Number(e.amount) || 0), 0);

        const filteredDeductions = monthDeductions.filter(d => {
            const dm = `${new Date(d.appliedDate).getFullYear()}-${String(new Date(d.appliedDate).getMonth() + 1).padStart(2, '0')}`;
            return dm === selectedMonth && d.status === 'applied' && !d.reason.startsWith('مكافأة:');
        });

        const totalDeductions = teachers.reduce((sum, t) => {
            const manual = filteredDeductions.filter(d => d.teacherId === t.id).reduce((a, d) => a + d.amount, 0);
            const att = allAttendanceMap[t.id] || {};
            const absence = Object.values(att).reduce((acc: number, stat) => { if (stat === 'absent') return acc + 1; if (stat === 'double_absent') return acc + 2; if (stat === 'half') return acc + 0.5; if (stat === 'quarter') return acc + 0.25; return acc; }, 0);
            const weeklyWorkingDays = Number(t.weeklyWorkingDays) || 5;
            const standardWorkingDays = Math.max(1, Math.round(weeklyWorkingDays * 4.33));
            const daily = t.accountingType === 'partnership' ? ((Number(t.partnershipPercentage) || 0) / standardWorkingDays) : ((Number(t.salary) || 1000) / standardWorkingDays);
            return sum + Math.round((manual + absence) * daily);
        }, 0);

        const salaryPaymentsThisMonth = filteredTransactions.filter(tr => tr.type === 'expense' && tr.category === 'salary');
        const paidSet = new Set(salaryPaymentsThisMonth.map(p => p.relatedUserId).filter(Boolean));
        const activeTeachers = teachers.filter(t => {
            if (t.status === 'inactive') return false;
            const joinDate = t.joinDate;
            if (joinDate) return joinDate.substring(0, 7) <= selectedMonth;
            return true;
        });
        const paidCount = activeTeachers.filter(t => paidSet.has(t.id)).length;
        const unpaidCount = activeTeachers.length - paidCount;
        const totalPaid = salaryPaymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);
        const totalEntitlement = activeTeachers.reduce((sum, t) => sum + (Number(t.salary) || 0), 0);
        const totalRemaining = Math.max(0, totalEntitlement - totalDeductions - totalPaid);

        return {
            totalReceived: totalInc,
            totalExpenses: totalExp,
            balance: totalInc - totalExp,
            totalGlobalDeficit: totalDeficit,
            totalGlobalExempted: totalExempted,
            totalGlobalDeductions: totalDeductions,
            teacherFees: totalFeesByTeachers,
            feesByManager: totalFeesByManagerDirect,
            fromTeachers: totalFromTeachers,
            otherIncome: totalOtherIncome,
            paidCount,
            unpaidCount,
            totalRemaining,
        };
    }, [filteredTransactions, teachers, students, groups, allFees, user?.displayName, exemptions, selectedMonth, monthDeductions, allAttendanceMap]);

    const developmentAmount = Math.floor(fromTeachers * 0.04 * 100) / 100;

    const incomeDetails = useMemo(() => {
        const incomeTransactions = filteredTransactions.filter(tr => tr.type === 'income');
        const managerFees = allFees.filter((fee) => {
            const isByTeacher = teachers.some(t => fee.createdBy === t.fullName || fee.createdBy === t.phone || (fee.createdBy && normalize(fee.createdBy) === normalize(t.fullName)));
            const isExplicitManager = fee.createdBy === user?.displayName || fee.createdBy === 'المدير' || fee.createdBy === 'admin';
            return isExplicitManager || (!isByTeacher && fee.createdBy && fee.createdBy !== 'غير معروف');
        });
        const fromTeacherTxns = incomeTransactions.filter(tr => tr.category === 'تحصيل من مدرس');
        const otherTxns = incomeTransactions.filter(tr => tr.category === 'donation' || tr.category === 'other');
        return { managerFees, fromTeacherTxns, otherTxns };
    }, [filteredTransactions, allFees, teachers, user?.displayName]);

    const fromTeacherGroups = useMemo(() => {
        const map = new Map<string, { teacherId: string; teacherName: string; total: number; count: number; transactions: typeof incomeDetails.fromTeacherTxns }>();
        incomeDetails.fromTeacherTxns.forEach(tr => {
            let teacherId: string;
            let teacherName: string;
            const relatedId = tr.relatedUserId as string | undefined;
            const matched = relatedId ? teachers.find(t => t.id === relatedId) : teachers.find(t => tr.title.includes(t.fullName) || normalize(tr.title).includes(normalize(t.fullName)));
            if (matched) { teacherId = matched.id; teacherName = matched.fullName; }
            else { teacherId = 'unknown'; teacherName = 'مدرس غير محدد'; }
            const entry = map.get(teacherId) || { teacherId, teacherName, total: 0, count: 0, transactions: [] };
            entry.total += Number(tr.amount) || 0;
            entry.count += 1;
            entry.transactions.push(tr);
            map.set(teacherId, entry);
        });
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [incomeDetails, teachers]);

    const selectedFromTeacher = fromTeacherGroups.find(g => g.teacherId === selectedFromTeacherId) || null;
    const selectedFromTeacherTxns = selectedFromTeacher?.transactions || [];

    const teacherPaymentStatus = useMemo(() => {
        const activeTeachers = teachers.filter(t => {
            if (t.status === 'inactive') return false;
            const joinDate = t.joinDate;
            if (joinDate) return joinDate.substring(0, 7) <= selectedMonth;
            return true;
        });

        // نفس الحساب المعتمد في صفحة المعلم (تبويب الراتب) لضمان تطابق دقيق
        const allWithStatus = activeTeachers.map(t => {
            const stats = computeTeacherSalaryStats({
                teacher: t,
                students,
                groups,
                allFees,
                handovers: filteredTransactions.filter(tr => tr.type === 'income' && tr.relatedUserId === t.id),
                exemptions,
                attendanceData: allAttendanceMap[t.id] || {},
                deductions: monthDeductions,
                paymentsHistory: filteredTransactions.filter(tr => tr.type === 'expense' && tr.category === 'salary' && tr.relatedUserId === t.id),
                selectedMonthRaw: selectedMonth,
                allTeachers: teachers
            });
            const deduction = stats.manualDeductionsTotal + (stats.isPartnership ? stats.autoDeductions : 0);
            return {
                teacher: t,
                paidAmount: stats.totalPaid,
                entitlement: stats.totalEntitlement,
                deduction,
                afterDeduction: stats.totalEntitlement,
                remaining: stats.remainingToPay,
                isPartnership: stats.isPartnership,
                partnershipPercentage: stats.partnershipPercentage,
                directorReceivedTotal: stats.directorReceivedTotal,
                basicSalary: stats.basicSalary,
            };
        });

        const paid = allWithStatus.filter(t => t.paidAmount > 0);
        const unpaid = allWithStatus.filter(t => t.paidAmount === 0);
        return {
            all: allWithStatus, paid, unpaid,
            totalPaidAmount: allWithStatus.reduce((s, t) => s + t.paidAmount, 0),
            totalRemaining: allWithStatus.reduce((s, t) => s + t.remaining, 0),
            paidCount: paid.length, unpaidCount: unpaid.length, totalCount: activeTeachers.length,
        };
    }, [filteredTransactions, teachers, selectedMonth, monthDeductions, allAttendanceMap, students, groups, allFees, exemptions]);

    // نصيب المدير من كل مدرس شراكة هذا الشهر: إجمالي ما استلمه المدير من مجموعته ناقص نصيب المدرس (حسب نسبته)
    const directorProfitByTeacher = useMemo(() => {
        return teacherPaymentStatus.all
            .filter(t => t.isPartnership && t.directorReceivedTotal > 0)
            .map(t => ({
                teacherId: t.teacher.id,
                teacherName: t.teacher.fullName,
                percentage: t.partnershipPercentage,
                directorReceivedTotal: t.directorReceivedTotal,
                teacherShare: t.basicSalary,
                directorProfit: Math.round((t.directorReceivedTotal - t.basicSalary) * 100) / 100,
            }))
            .sort((a, b) => b.directorProfit - a.directorProfit);
    }, [teacherPaymentStatus]);

    const totalDirectorProfitFromTeachers = useMemo(
        () => directorProfitByTeacher.reduce((sum, t) => sum + t.directorProfit, 0),
        [directorProfitByTeacher]
    );

    // تفصيل إجمالي المصروفات هذا الشهر: كل مدفوعات مدرس تتجمع تحت اسمه (حتى لو اتصرفت
    // على دفعات)، وأي مصروف تاني مالوش مدرس مرتبط بيه يتجمع تحت فئته
    const categoryLabels: Record<string, string> = {
        salary: 'رواتب (بدون مدرس محدد)',
        utilities: 'فواتير ومرافق',
        other: 'مصروفات أخرى',
    };

    const expenseBreakdown = useMemo(() => {
        const map = new Map<string, { key: string; label: string; total: number; transactions: { id: string; date: string; amount: number; title: string }[] }>();

        filteredTransactions
            .filter(tr => tr.type === 'expense')
            .forEach(tr => {
                const teacher = tr.relatedUserId ? teachers.find(t => t.id === tr.relatedUserId) : undefined;
                const key = teacher ? `teacher:${teacher.id}` : `category:${tr.category}`;
                const label = teacher ? teacher.fullName : (categoryLabels[tr.category] || tr.category || 'مصروفات أخرى');

                const entry = map.get(key) || { key, label, total: 0, transactions: [] };
                entry.total += tr.amount;
                entry.transactions.push({ id: tr.id, date: tr.date, amount: tr.amount, title: tr.title });
                map.set(key, entry);
            });

        return Array.from(map.values())
            .map(entry => ({
                ...entry,
                transactions: entry.transactions.sort((a, b) => b.date.localeCompare(a.date)),
            }))
            .sort((a, b) => b.total - a.total);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredTransactions, teachers]);

    const deficitPerTeacher = useMemo(() => {
        const normalize = (s: string) => { if (!s) return ''; return s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ءئؤ]/g, '').replace(/[ًٌٍَُِّ]/g, '').replace(/\s+/g, '').trim(); };
        const exemptedIds = new Set(exemptions.map((e) => e.student_id));

        const collectionsByTeacher: Record<string, { amount: number; count: number }> = {};
        teachers.filter(t => t.status === 'active' || !t.status).forEach(t => { collectionsByTeacher[t.id] = { amount: 0, count: 0 }; });

        allFees.forEach(fee => {
            const matched = teachers.find(t => fee.createdBy === t.fullName || fee.createdBy === t.phone || (fee.createdBy && normalize(fee.createdBy) === normalize(t.fullName)));
            if (matched) {
                if (!collectionsByTeacher[matched.id]) collectionsByTeacher[matched.id] = { amount: 0, count: 0 };
                collectionsByTeacher[matched.id].amount += Number(fee.amount?.toString().replace(/[^0-9.]/g, '')) || 0;
                collectionsByTeacher[matched.id].count += 1;
            }
        });

        return Object.entries(collectionsByTeacher).map(([id, data]) => {
            const teacher = teachers.find(t => t.id === id);
            const tGroups = groups.filter(g => g.teacherId === id).map(g => g.id);
            const tStudents = students.filter(s => s.groupId && tGroups.includes(s.groupId) && s.status !== 'archived' && s.enrollmentDate && s.enrollmentDate.length >= 7 && s.enrollmentDate.substring(0, 7) <= selectedMonth);
            let deficit = 0, expected = 0;
            tStudents.forEach(s => {
                const paid = allFees.filter((f) => f.studentId === s.id).reduce((a, f) => a + (Number(f.amount?.toString().replace(/[^0-9.]/g, '')) || 0), 0);
                const amt = Number(s.monthlyAmount) || 0;
                expected += amt;
                if (amt > paid && !exemptedIds.has(s.id)) deficit += amt - paid;
            });
            return { teacherId: id, teacherName: teacher?.fullName || id, collected: data.amount, count: data.count, deficit, expected, unpaidStudents: tStudents.filter(s => { const paid = allFees.filter((f) => f.studentId === s.id).reduce((a, f) => a + (Number(f.amount?.toString().replace(/[^0-9.]/g, '')) || 0), 0); return paid < (Number(s.monthlyAmount) || 0); }).length };
        }).sort((a, b) => b.deficit - a.deficit);
    }, [teachers, allFees, students, groups, exemptions, selectedMonth]);

    const deliveryDeficitByTeacher = useMemo(() => {
        const normalize = (s: string) => { if (!s) return ''; return s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ءئؤ]/g, '').replace(/[ًٌٍَُِّ]/g, '').replace(/\s+/g, '').trim(); };

        const collectedByTeacher: Record<string, number> = {};
        teachers.filter(t => t.status === 'active' || !t.status).forEach(t => { collectedByTeacher[t.id] = 0; });

        allFees.forEach(fee => {
            const matched = teachers.find(t => fee.createdBy === t.fullName || fee.createdBy === t.phone || (fee.createdBy && normalize(fee.createdBy) === normalize(t.fullName)));
            if (matched) {
                if (!collectedByTeacher[matched.id]) collectedByTeacher[matched.id] = 0;
                collectedByTeacher[matched.id] += Number(fee.amount?.toString().replace(/[^0-9.]/g, '')) || 0;
            }
        });

        const handedOverByTeacher: Record<string, number> = {};
        filteredTransactions.filter(tr => tr.category === 'تحصيل من مدرس').forEach(tr => {
            if (tr.relatedUserId) {
                handedOverByTeacher[tr.relatedUserId] = (handedOverByTeacher[tr.relatedUserId] || 0) + tr.amount;
            }
        });

        return Object.entries(collectedByTeacher).map(([id, collected]) => {
            const teacher = teachers.find(t => t.id === id);
            const handedOver = handedOverByTeacher[id] || 0;
            const deficit = collected - handedOver;
            return { teacherId: id, teacherName: teacher?.fullName || id, collected, handedOver, deficit };
        }).filter(d => d.deficit > 0).sort((a, b) => b.deficit - a.deficit);
    }, [teachers, allFees, filteredTransactions]);

    const totalDeliveryDeficit = useMemo(() => {
        return deliveryDeficitByTeacher.reduce((sum, d) => sum + d.deficit, 0);
    }, [deliveryDeficitByTeacher]);

    const teacherAnalysis = useMemo(() => {
        const collections = deficitPerTeacher.map(d => ({ teacherId: d.teacherId, teacherName: d.teacherName, collected: d.collected, deficit: d.deficit, expected: d.expected, unpaidStudents: d.unpaidStudents }));
        const exemptionList = exemptions.map((ex) => {
            const student = students.find(s => s.id === ex.student_id);
            return { id: ex.id, studentName: ex.student_name || student?.fullName || 'طالب', amount: ex.amount, exemptedBy: ex.exempted_by || 'المدير' };
        });
        const filteredDeductions = monthDeductions.filter((d) => {
            const dm = `${new Date(d.appliedDate).getFullYear()}-${String(new Date(d.appliedDate).getMonth() + 1).padStart(2, '0')}`;
            return dm === selectedMonth && d.status === 'applied' && !d.reason.startsWith('مكافأة:');
        });
        const deductionList = teachers.map(t => {
            const manual = filteredDeductions.filter((d) => d.teacherId === t.id).reduce((a, d) => a + d.amount, 0);
            const att = allAttendanceMap[t.id] || {};
            const absence = Object.values(att).reduce((acc: number, stat) => { if (stat === 'absent') return acc + 1; if (stat === 'double_absent') return acc + 2; if (stat === 'half') return acc + 0.5; if (stat === 'quarter') return acc + 0.25; return acc; }, 0);
            const weeklyWorkingDays = Number(t.weeklyWorkingDays) || 5;
            const standardWorkingDays = Math.max(1, Math.round(weeklyWorkingDays * 4.33));
            const daily = t.accountingType === 'partnership' ? ((Number(t.partnershipPercentage) || 0) / standardWorkingDays) : ((Number(t.salary) || 1000) / standardWorkingDays);
            const total = Math.round((manual + absence) * daily);
            return total > 0 ? { teacherId: t.id, teacherName: t.fullName, amount: total, manualDays: manual, absenceDays: absence } : null;
        }).filter((d): d is NonNullable<typeof d> => d !== null).sort((a, b) => b.amount - a.amount);
        return { collections, exemptionList, deductionList };
    }, [deficitPerTeacher, exemptions, students, teachers, selectedMonth, monthDeductions, allAttendanceMap]);

    const handleAddTransaction = () => {
        setIsModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['transactions', selectedMonth] });
    };

    const handleRecordDevelopment = async () => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const result = await addTransaction({
            amount: developmentAmount,
            type: 'expense',
            category: 'other',
            date: today,
            description: `تطوير الدرس (4% من مستلم المدرسين ${fromTeachers.toLocaleString()} ج.م)`,
            performedBy: user?.uid || 'المدير'
        });
        if (result) {
            queryClient.invalidateQueries({ queryKey: ['transactions', selectedMonth] });
            setIsDevelopmentOpen(false);
        }
    };

    if (!isClient) return null;

    return (
        <div className="pb-32 transition-all duration-500 bg-gray-50/50 min-h-screen font-sans">
            <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={handleAddTransaction} />

            <TeacherDetailModal
                teacher={selectedSalaryTeacher}
                isOpen={isSalaryTeacherOpen}
                onClose={() => setIsSalaryTeacherOpen(false)}
            />

            {/* Salary Status Modal */}
            <FadeIn show={isSalaryStatusOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsSalaryStatusOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            </FadeIn>
            <SlideIn show={isSalaryStatusOpen} className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[95%] max-w-4xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <Wallet size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-black text-gray-900">حالة صرف الرواتب</h3>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">المدرسين الذين قبضوا والذين لم يقبضوا — اضغط على أي مدرس لفتح صفحته</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSalaryStatusOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-black text-green-700 bg-green-50 px-3 py-1 rounded-full">✅ تم الصرف: {teacherPaymentStatus.paidCount}</div>
                        </div>
                        <div className="space-y-2">
                            {teacherPaymentStatus.paid.length === 0 ? (
                                <p className="text-xs text-gray-400 font-bold text-center py-4 bg-gray-50 rounded-2xl">لم يتم صرف راتب أي مدرس هذا الشهر.</p>
                            ) : (
                                teacherPaymentStatus.paid.map(t => (
                                    <button key={t.teacher.id} onClick={() => { setSelectedSalaryTeacher(t.teacher); setIsSalaryTeacherOpen(true); }} className="w-full p-4 bg-green-50/50 rounded-2xl border border-green-100/50 hover:border-green-300 hover:shadow-sm transition-all text-right space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-black text-green-700 text-sm truncate">{t.teacher.fullName}</span>
                                            {t.isPartnership && (
                                                <span className="shrink-0 text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                                                    شراكة {t.partnershipPercentage || 0}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-white/70 rounded-xl py-2">
                                                <p className="text-[9px] font-bold text-gray-400">المستحق</p>
                                                <p className="text-xs font-black text-gray-700 font-sans mt-0.5">{t.entitlement.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-white/70 rounded-xl py-2">
                                                <p className="text-[9px] font-bold text-gray-400">أخذ</p>
                                                <p className="text-xs font-black text-green-600 font-sans mt-0.5">{t.paidAmount.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-white/70 rounded-xl py-2">
                                                <p className="text-[9px] font-bold text-gray-400">باقي</p>
                                                <p className={`text-xs font-black font-sans mt-0.5 ${t.remaining > 0 ? 'text-amber-500' : 'text-green-700'}`}>{t.remaining.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {t.isPartnership && (
                                            <p className="text-[9px] font-bold text-blue-400">النسبة من إجمالي استلام المدير: {t.directorReceivedTotal.toLocaleString()} ج.م</p>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full">⏳ لم يصرف بعد: {teacherPaymentStatus.unpaidCount}</div>
                        </div>
                        <div className="space-y-2">
                            {teacherPaymentStatus.unpaid.length === 0 ? (
                                <p className="text-xs text-gray-400 font-bold text-center py-4 bg-gray-50 rounded-2xl">تم صرف رواتب جميع المدرسين لهذا الشهر.</p>
                            ) : (
                                teacherPaymentStatus.unpaid.map(t => (
                                    <button key={t.teacher.id} onClick={() => { setSelectedSalaryTeacher(t.teacher); setIsSalaryTeacherOpen(true); }} className="w-full p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 hover:border-amber-300 hover:shadow-sm transition-all text-right space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-black text-amber-700 text-sm truncate">{t.teacher.fullName}</span>
                                            {t.isPartnership && (
                                                <span className="shrink-0 text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                                                    شراكة {t.partnershipPercentage || 0}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-white/70 rounded-xl py-2">
                                                <p className="text-[9px] font-bold text-gray-400">المستحق</p>
                                                <p className="text-xs font-black text-gray-700 font-sans mt-0.5">{t.entitlement.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-white/70 rounded-xl py-2">
                                                <p className="text-[9px] font-bold text-gray-400">أخذ</p>
                                                <p className="text-xs font-black text-gray-500 font-sans mt-0.5">{t.paidAmount.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-white/70 rounded-xl py-2">
                                                <p className="text-[9px] font-bold text-gray-400">باقي</p>
                                                <p className="text-xs font-black text-amber-600 font-sans mt-0.5">{t.remaining.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {t.isPartnership && (
                                            <p className="text-[9px] font-bold text-blue-400">النسبة من إجمالي استلام المدير: {t.directorReceivedTotal.toLocaleString()} ج.م</p>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-50 shrink-0 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-black text-emerald-600 font-sans">{teacherPaymentStatus.totalPaidAmount.toLocaleString()} ج.م</span>
                        <span className="text-xs font-black text-gray-400">المبلغ المصروف</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-black text-amber-600 font-sans">{teacherPaymentStatus.totalRemaining.toLocaleString()} ج.م</span>
                        <span className="text-xs font-black text-gray-400">المبلغ المتبقي للصرف</span>
                    </div>
                </div>
            </SlideIn>

            {/* Deficit Modal */}
            <FadeIn show={isDeficitOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsDeficitOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            </FadeIn>
            <SlideIn show={isDeficitOpen} className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[95%] max-w-4xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <AlertCircle size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-black text-gray-900">تفاصيل العجز</h3>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">العجز لكل مدرس عن شهر {months.find(m => m.value === selectedMonth)?.label}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsDeficitOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto no-scrollbar space-y-3">
                    {deficitPerTeacher.filter(d => d.deficit > 0).length === 0 ? (
                        <div className="py-20 text-center text-gray-400 text-sm font-bold bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                            لا يوجد عجز هذا الشهر.
                        </div>
                    ) : (
                        deficitPerTeacher.filter(d => d.deficit > 0).map(d => (
                            <div key={d.teacherId} className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm flex items-center justify-between hover:border-amber-300 transition-all">
                                <div className="text-right">
                                    <p className="font-black text-gray-900 text-sm">{d.teacherName}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">محصل: {d.collected.toLocaleString()} ج.م | متوقع: {d.expected.toLocaleString()} ج.م | طلاب غير مسددين: {d.unpaidStudents}</p>
                                </div>
                                <p className="text-lg font-black text-amber-600 font-sans">{d.deficit.toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-2xl font-black text-amber-600 font-sans">
                            {totalGlobalDeficit.toLocaleString()} <span className="text-sm">ج.م</span>
                        </div>
                        <p className="text-xs font-black text-gray-400">إجمالي العجز</p>
                    </div>
                </div>
            </SlideIn>

            {/* Manager Direct Modal */}
            <FadeIn show={isManagerDirectOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsManagerDirectOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            </FadeIn>
            <SlideIn show={isManagerDirectOpen} className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[95%] max-w-4xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Wallet size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-black text-gray-900">تحصيل الإدارة</h3>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">المبالغ المحصلة مباشرة من المدير</p>
                        </div>
                    </div>
                    <button onClick={() => setIsManagerDirectOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto no-scrollbar space-y-3">
                    {incomeDetails.managerFees.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 text-sm font-bold bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                            لا توجد مبالغ محصلة هذا الشهر.
                        </div>
                    ) : (
                        incomeDetails.managerFees.map((fee) => {
                            const std = students.find(s => s.id === fee.studentId);
                            return (
                                <div key={fee.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                    <div className="text-right">
                                        <p className="font-black text-gray-900 text-sm">{std?.fullName || 'طالب'}</p>
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
                <div className="p-6 bg-gray-50/50 border-t border-gray-50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-2xl font-black text-blue-600 font-sans">{feesByManager.toLocaleString()} <span className="text-sm">ج.م</span></div>
                        <p className="text-xs font-black text-gray-400">إجمالي تحصيل الإدارة</p>
                    </div>
                </div>
            </SlideIn>

            {/* From Teachers Modal */}
            <FadeIn show={isFromTeachersOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsFromTeachersOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            </FadeIn>
            <SlideIn show={isFromTeachersOpen} className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[95%] max-w-4xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
                            <ArrowUpCircle size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-black text-gray-900">مستلم من المدرسين</h3>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">المبالغ التي سلمها المدرسون للمدير</p>
                        </div>
                    </div>
                    <button onClick={() => setIsFromTeachersOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto no-scrollbar space-y-3">
                    {selectedFromTeacherId === null ? (
                        <>
                            <h3 className="font-black text-gray-700 text-sm">إجمالي المستلم من كل مدرس</h3>
                            {fromTeacherGroups.length === 0 ? (
                                <div className="py-20 text-center text-gray-400 text-sm font-bold bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                                    لا توجد مبالغ مستلمة من المدرسين هذا الشهر.
                                </div>
                            ) : (
                                fromTeacherGroups.map(g => (
                                    <button key={g.teacherId} onClick={() => setSelectedFromTeacherId(g.teacherId)} className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all text-right">
                                        <div className="text-right">
                                            <p className="font-black text-gray-900 text-sm">{g.teacherName}</p>
                                            <p className="text-[10px] text-gray-400 font-bold">{g.count} عملية استلام</p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-lg font-black text-sky-600 font-sans">{g.total.toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-gray-700 text-sm">تفاصيل استلام {selectedFromTeacher?.teacherName || 'المدرس'}</h3>
                                <button onClick={() => setSelectedFromTeacherId(null)} className="text-[11px] font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-full hover:bg-sky-100 transition-colors">
                                    كل المدرسين
                                </button>
                            </div>
                            {selectedFromTeacher && (
                                <div className="bg-sky-50/70 rounded-2xl p-4 border border-sky-100 flex items-center justify-between">
                                    <p className="text-xs font-bold text-gray-500">إجمالي المستلم من {selectedFromTeacher.teacherName}</p>
                                    <p className="text-xl font-black text-sky-600 font-sans">{selectedFromTeacher.total.toLocaleString()} <span className="text-[10px]">ج.م</span></p>
                                </div>
                            )}
                            {selectedFromTeacherTxns.length === 0 ? (
                                <div className="py-20 text-center text-gray-400 text-sm font-bold bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                                    لا توجد مبالغ مستلمة من هذا المدرس هذا الشهر.
                                </div>
                            ) : (
                                selectedFromTeacherTxns.map((tr) => (
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
                        </>
                    )}
                </div>
                <div className="p-6 bg-gray-50/50 border-t border-gray-50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-2xl font-black text-sky-600 font-sans">{fromTeachers.toLocaleString()} <span className="text-sm">ج.م</span></div>
                        <p className="text-xs font-black text-gray-400">إجمالي المستلم من المدرسين</p>
                    </div>
                </div>
            </SlideIn>

            {/* Development Fund Modal (4%) */}
            <FadeIn show={isDevelopmentOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsDevelopmentOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            </FadeIn>
            <SlideIn show={isDevelopmentOpen} className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[95%] max-w-xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <Wallet size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-black text-gray-900">تطوير الدرس</h3>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">4% من المبالغ المستلمة من المدرسين</p>
                        </div>
                    </div>
                    <button onClick={() => setIsDevelopmentOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="bg-amber-50/50 rounded-[24px] p-6 border border-amber-100/50 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-500">إجمالي المستلم من المدرسين</span>
                            <span className="text-lg font-black text-gray-900 font-sans">{fromTeachers.toLocaleString()} ج.م</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-500">نسبة التطوير</span>
                            <span className="text-lg font-black text-amber-600 font-sans">4%</span>
                        </div>
                        <div className="border-t border-amber-200/50 pt-4 flex items-center justify-between">
                            <span className="text-sm font-black text-gray-700">مبلغ تطوير الدرس</span>
                            <span className="text-2xl font-black text-amber-600 font-sans">{developmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                        </div>
                    </div>
                    <button
                        onClick={handleRecordDevelopment}
                        disabled={developmentAmount <= 0}
                        className="w-full h-14 bg-amber-600 text-white rounded-[24px] font-black shadow-xl shadow-amber-600/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        تسجيل مصروف تطوير الدرس ({developmentAmount.toLocaleString()} ج.م)
                    </button>
                </div>
            </SlideIn>

            {/* Other Income Modal */}
            <FadeIn show={isOtherIncomeOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsOtherIncomeOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            </FadeIn>
            <SlideIn show={isOtherIncomeOpen} className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[95%] max-w-4xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600">
                            <ArrowUpCircle size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-black text-gray-900">إيرادات أخرى</h3>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">التبرعات والإيرادات الأخرى</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOtherIncomeOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto no-scrollbar space-y-3">
                    {incomeDetails.otherTxns.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 text-sm font-bold bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                            لا توجد إيرادات أخرى هذا الشهر.
                        </div>
                    ) : (
                        incomeDetails.otherTxns.map((tr) => (
                            <div key={tr.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="text-right">
                                    <p className="font-black text-gray-900 text-sm">{tr.title || tr.category}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{tr.date}</p>
                                </div>
                                <p className="text-lg font-black text-cyan-600 font-sans">{Number(tr.amount).toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-6 bg-gray-50/50 border-t border-gray-50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-2xl font-black text-cyan-600 font-sans">{otherIncome.toLocaleString()} <span className="text-sm">ج.م</span></div>
                        <p className="text-xs font-black text-gray-400">إجمالي الإيرادات الأخرى</p>
                    </div>
                </div>
            </SlideIn>

            {/* Collections Modal */}
            <FadeIn show={isCollectionsOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsCollectionsOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            </FadeIn>
            <SlideIn show={isCollectionsOpen} className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[95%] max-w-4xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                            <Wallet size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-black text-gray-900">تحصيل المدرسين</h3>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">المبالغ المحصلة من الطلاب لكل مدرس</p>
                        </div>
                    </div>
                    <button onClick={() => setIsCollectionsOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto no-scrollbar space-y-3">
                    {teacherAnalysis.collections.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 text-sm font-bold bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                            لا توجد تحصيلات هذا الشهر.
                        </div>
                    ) : (
                        teacherAnalysis.collections.map(c => (
                            <div key={c.teacherId} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="text-right">
                                    <p className="font-black text-gray-900 text-sm">{c.teacherName}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">عجز: {c.deficit.toLocaleString()} | متوقع: {c.expected.toLocaleString()} | طلاب غير مسددين: {c.unpaidStudents}</p>
                                </div>
                                <p className="text-lg font-black text-purple-600 font-sans">{c.collected.toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-6 bg-gray-50/50 border-t border-gray-50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-2xl font-black text-purple-600 font-sans">{teacherFees.toLocaleString()} <span className="text-sm">ج.م</span></div>
                        <p className="text-xs font-black text-gray-400">إجمالي تحصيل المدرسين</p>
                    </div>
                </div>
            </SlideIn>

            {/* Exemptions Modal */}
            <FadeIn show={isExemptionsOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsExemptionsOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            </FadeIn>
            <SlideIn show={isExemptionsOpen} className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[95%] max-w-4xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
                            <Wallet size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-black text-gray-900">الإعفاءات المالية</h3>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">الطلاب المعفيين من الدفع لهذا الشهر</p>
                        </div>
                    </div>
                    <button onClick={() => setIsExemptionsOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto no-scrollbar space-y-3">
                    {teacherAnalysis.exemptionList.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 text-sm font-bold bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                            لا توجد إعفاءات هذا الشهر.
                        </div>
                    ) : (
                        teacherAnalysis.exemptionList.map(ex => (
                            <div key={ex.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="text-right">
                                    <p className="font-black text-gray-900 text-sm">{ex.studentName}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">بواسطة: {ex.exemptedBy}</p>
                                </div>
                                <p className="text-lg font-black text-teal-600 font-sans">{Number(ex.amount).toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-6 bg-gray-50/50 border-t border-gray-50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-2xl font-black text-teal-600 font-sans">{totalGlobalExempted.toLocaleString()} <span className="text-sm">ج.م</span></div>
                        <p className="text-xs font-black text-gray-400">إجمالي الإعفاءات</p>
                    </div>
                </div>
            </SlideIn>

            {/* Deductions Modal */}
            <FadeIn show={isDeductionsOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsDeductionsOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            </FadeIn>
            <SlideIn show={isDeductionsOpen} className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[95%] max-w-4xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                            <AlertCircle size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-black text-gray-900">خصومات المدرسين</h3>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">الخصومات والغياب لكل مدرس</p>
                        </div>
                    </div>
                    <button onClick={() => setIsDeductionsOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto no-scrollbar space-y-3">
                    {teacherAnalysis.deductionList.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 text-sm font-bold bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                            لا توجد خصومات هذا الشهر.
                        </div>
                    ) : (
                        teacherAnalysis.deductionList.map((d) => (
                            <div key={d.teacherId} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="text-right">
                                    <p className="font-black text-gray-900 text-sm">{d.teacherName}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">غياب: {d.absenceDays}ي | يدوي: {d.manualDays}ي</p>
                                </div>
                                <p className="text-lg font-black text-red-600 font-sans">{d.amount.toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-6 bg-gray-50/50 border-t border-gray-50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-2xl font-black text-red-600 font-sans">{totalGlobalDeductions.toLocaleString()} <span className="text-sm">ج.م</span></div>
                        <p className="text-xs font-black text-gray-400">إجمالي الخصومات</p>
                    </div>
                </div>
            </SlideIn>

            {/* Delivery Deficit Modal */}
            <FadeIn show={isDeliveryDeficitOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsDeliveryDeficitOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            </FadeIn>
            <SlideIn show={isDeliveryDeficitOpen} className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[95%] max-w-4xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                            <AlertCircle size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-black text-gray-900">عجز التسليم</h3>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">المبالغ التي جمعها المدرسون من الطلاب ولم يسلموها للإدارة</p>
                        </div>
                    </div>
                    <button onClick={() => setIsDeliveryDeficitOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto no-scrollbar space-y-3">
                    {deliveryDeficitByTeacher.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 text-sm font-bold bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                            لا يوجد عجز تسليم هذا الشهر - جميع المدرسين سلموا كامل المبالغ.
                        </div>
                    ) : (
                        deliveryDeficitByTeacher.map(d => (
                            <div key={d.teacherId} className="bg-white rounded-2xl p-4 border border-rose-100 shadow-sm flex items-center justify-between hover:border-rose-300 transition-all">
                                <div className="text-right">
                                    <p className="font-black text-gray-900 text-sm">{d.teacherName}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">محصل: {d.collected.toLocaleString()} ج.م | سلم: {d.handedOver.toLocaleString()} ج.م</p>
                                </div>
                                <p className="text-lg font-black text-rose-600 font-sans">{d.deficit.toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-2xl font-black text-rose-600 font-sans">
                            {totalDeliveryDeficit.toLocaleString()} <span className="text-sm">ج.م</span>
                        </div>
                        <p className="text-xs font-black text-gray-400">إجمالي عجز التسليم</p>
                    </div>
                </div>
            </SlideIn>

            {/* Profit Breakdown Modal: نصيب المدير من كل مدرس شراكة هذا الشهر */}
            <FadeIn show={isProfitBreakdownOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsProfitBreakdownOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            </FadeIn>
            <SlideIn show={isProfitBreakdownOpen} className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[95%] max-w-4xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-700">
                            <TrendingUp size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-black text-gray-900">نصيبك من كل مدرس (شراكة)</h3>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">مرتبة من الأعلى نصيباً للأقل، عن شهر {months.find(m => m.value === selectedMonth)?.label || selectedMonth}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsProfitBreakdownOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto no-scrollbar space-y-3">
                    {directorProfitByTeacher.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 text-sm font-bold bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                            لا يوجد مدرسون بنظام الشراكة حصّلوا مبالغ هذا الشهر.
                        </div>
                    ) : (
                        directorProfitByTeacher.map((t, index) => (
                            <div key={t.teacherId} className="bg-white rounded-2xl p-4 border border-green-100 shadow-sm flex items-center justify-between gap-3 hover:border-green-300 transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 w-7 h-7 rounded-full bg-green-50 text-green-700 flex items-center justify-center text-[11px] font-black">
                                        {index + 1}
                                    </div>
                                    <div className="text-right min-w-0">
                                        <p className="font-black text-gray-900 text-sm truncate">{t.teacherName}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">
                                            نسبته {t.percentage}% | استلمت منه {t.directorReceivedTotal.toLocaleString()} ج.م | نصيبه {t.teacherShare.toLocaleString()} ج.م
                                        </p>
                                    </div>
                                </div>
                                <p className="shrink-0 text-lg font-black text-green-700 font-sans">
                                    {t.directorProfit.toLocaleString()} <span className="text-[9px]">ج.م</span>
                                </p>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-2xl font-black text-green-700 font-sans">
                            {totalDirectorProfitFromTeachers.toLocaleString()} <span className="text-sm">ج.م</span>
                        </div>
                        <p className="text-xs font-black text-gray-400">إجمالي نصيبك من كل المدرسين</p>
                    </div>
                </div>
            </SlideIn>

            {/* Expenses Breakdown Modal: تفصيل إجمالي المصروفات هذا الشهر حسب المدرس/الفئة */}
            <FadeIn show={isExpensesBreakdownOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsExpensesBreakdownOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            </FadeIn>
            <SlideIn show={isExpensesBreakdownOpen} className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[92%] sm:w-[95%] max-w-4xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] border border-white/20">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                            <ArrowDownCircle size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className="text-xl font-black text-gray-900">تفصيل إجمالي المصروفات</h3>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">عن شهر {months.find(m => m.value === selectedMonth)?.label || selectedMonth}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsExpensesBreakdownOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto no-scrollbar space-y-3">
                    {expenseBreakdown.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 text-sm font-bold bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                            لا توجد مصروفات مسجلة هذا الشهر.
                        </div>
                    ) : (
                        expenseBreakdown.map(entry => {
                            const isExpanded = expandedExpenseKey === entry.key;
                            return (
                                <div key={entry.key} className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                                    <button
                                        onClick={() => setExpandedExpenseKey(isExpanded ? null : entry.key)}
                                        className="w-full flex items-center justify-between gap-3 p-4 text-right hover:bg-red-50/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <ChevronDown size={16} className={cn("shrink-0 text-gray-400 transition-transform", isExpanded && "rotate-180")} />
                                            <div className="min-w-0">
                                                <p className="font-black text-gray-900 text-sm truncate">{entry.label}</p>
                                                <p className="text-[10px] text-gray-400 font-bold">{entry.transactions.length} عملية</p>
                                            </div>
                                        </div>
                                        <p className="shrink-0 text-lg font-black text-red-600 font-sans">
                                            {entry.total.toLocaleString()} <span className="text-[9px]">ج.م</span>
                                        </p>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-red-50 divide-y divide-red-50/70">
                                            {entry.transactions.map(txn => (
                                                <div key={txn.id} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-red-50/10">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-600 truncate">{txn.title}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold">{txn.date}</p>
                                                    </div>
                                                    <p className="shrink-0 text-sm font-black text-red-500 font-sans">
                                                        {txn.amount.toLocaleString()} <span className="text-[9px]">ج.م</span>
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-50 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-2xl font-black text-red-600 font-sans">
                            {totalExpenses.toLocaleString()} <span className="text-sm">ج.م</span>
                        </div>
                        <p className="text-xs font-black text-gray-400">إجمالي المصروفات</p>
                    </div>
                </div>
            </SlideIn>

            {/* Sticky Header */}
            <div className="sticky top-0 z-[70] bg-white/95 backdrop-blur-xl px-4 py-3 border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-10 h-10 bg-blue-600 text-white rounded-[14px] flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
                    >
                        <Plus size={20} />
                    </button>

                    {isClient && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => { const i = months.findIndex(m => m.value === selectedMonth); if (i < months.length - 1) setSelectedMonth(months[i + 1].value); }}
                                disabled={months.findIndex(m => m.value === selectedMonth) === months.length - 1}
                                className="w-9 h-9 bg-white border border-gray-100 rounded-[12px] flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 active:scale-95 transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:border-gray-100"
                            >
                                <ChevronRight size={17} />
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setShowMonthPicker(!showMonthPicker)}
                                    className="h-9 px-4 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-[14px] flex items-center gap-2 text-blue-700 font-black shadow-sm hover:shadow-md hover:border-blue-200 active:scale-95 transition-all"
                                >
                                    <Calendar size={16} className="text-blue-500" />
                                    <span className="text-[11px] sm:text-xs whitespace-nowrap font-black">{months.find(m => m.value === selectedMonth)?.label}</span>
                                    <ChevronDown size={12} className={cn("transition-transform duration-300 text-blue-400", showMonthPicker && "rotate-180")} />
                                </button>
                                {showMonthPicker && (
                                    <div className="absolute top-[110%] left-1/2 -translate-x-1/2 w-44 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5">
                                        {months.map(month => (
                                            <button key={month.value}
                                                onClick={() => { setSelectedMonth(month.value); setShowMonthPicker(false); }}
                                                className={cn("w-full px-4 py-2 text-right text-[11px] font-bold transition-all flex items-center justify-between",
                                                    selectedMonth === month.value ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50")}>
                                                {month.label}
                                                {selectedMonth === month.value && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => { const i = months.findIndex(m => m.value === selectedMonth); if (i > 0) setSelectedMonth(months[i - 1].value); }}
                                disabled={months.findIndex(m => m.value === selectedMonth) === 0}
                                className="w-9 h-9 bg-white border border-gray-100 rounded-[12px] flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 active:scale-95 transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:border-gray-100"
                            >
                                <ChevronLeft size={17} />
                            </button>
                        </div>
                    )}

                    <div className="w-10" />
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-gray-400 font-bold font-sans">جاري التحميل...</p>
                    </div>
                ) : (
                    <>
                        {/* Section 1: Revenue */}
                        <div className="bg-white/90 backdrop-blur-xl border border-green-100/50 rounded-[32px] p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                                        <ArrowUpCircle size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-800">الإيرادات</h3>
                                        <p className="text-[10px] text-gray-400 font-bold">
                                            الإجمالي: <span className="text-green-600 font-black font-sans">{totalReceived.toLocaleString()} ج.م</span>
                                        </p>
                                    </div>
                                </div>
                                <Link href="/finance/income" className="text-[10px] font-bold text-green-600 hover:underline">التفاصيل ←</Link>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <button onClick={() => setIsCollectionsOpen(true)} className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50 hover:border-purple-300 hover:shadow-sm transition-all text-right w-full">
                                    <p className="text-[10px] font-bold text-gray-400 mb-1">محصل المدرسين</p>
                                    <p className="text-lg font-black text-purple-600 font-sans">{teacherFees.toLocaleString()} <span className="text-[8px]">ج.م</span></p>
                                </button>
                                <button onClick={() => setIsManagerDirectOpen(true)} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 hover:border-blue-300 hover:shadow-sm transition-all text-right w-full">
                                    <p className="text-[10px] font-bold text-gray-400 mb-1">تحصيل الإدارة</p>
                                    <p className="text-lg font-black text-blue-600 font-sans">{feesByManager.toLocaleString()} <span className="text-[8px]">ج.م</span></p>
                                </button>
                                <button onClick={() => { setSelectedFromTeacherId(null); setIsFromTeachersOpen(true); }} className="p-4 bg-sky-50/50 rounded-2xl border border-sky-100/50 hover:border-sky-300 hover:shadow-sm transition-all text-right w-full">
                                    <p className="text-[10px] font-bold text-gray-400 mb-1">مستلم من المدرسين</p>
                                    <p className="text-lg font-black text-sky-600 font-sans">{fromTeachers.toLocaleString()} <span className="text-[8px]">ج.م</span></p>
                                </button>
                                <button onClick={() => setIsOtherIncomeOpen(true)} className="p-4 bg-cyan-50/50 rounded-2xl border border-cyan-100/50 hover:border-cyan-300 hover:shadow-sm transition-all text-right w-full">
                                    <p className="text-[10px] font-bold text-gray-400 mb-1">إيرادات أخرى</p>
                                    <p className="text-lg font-black text-cyan-600 font-sans">{otherIncome.toLocaleString()} <span className="text-[8px]">ج.م</span></p>
                                </button>
                            </div>
                            <button onClick={() => setIsDevelopmentOpen(true)} className="mt-4 w-full p-5 bg-amber-50/50 rounded-2xl border border-amber-200/50 hover:border-amber-400 hover:shadow-sm hover:bg-amber-50/80 transition-all text-right">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                                            <Wallet size={20} />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] font-black text-gray-500">تطوير الدرس</p>
                                            <p className="text-[9px] font-bold text-gray-400">4% من مستلم المدرسين</p>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black text-amber-600 font-sans">{developmentAmount.toLocaleString()} <span className="text-[10px]">ج.م</span></p>
                                </div>
                            </button>
                        </div>

                        {/* Section 2: Analysis */}
                        <div className="bg-white/90 backdrop-blur-xl border border-amber-100/50 rounded-[32px] p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                                        <AlertCircle size={22} />
                                    </div>
                                    <h3 className="text-sm font-black text-gray-800">تحليل المدرسين</h3>
                                </div>
                                <Link href="/finance/teachers" className="text-[10px] font-bold text-amber-600 hover:underline">التفاصيل ←</Link>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <button onClick={() => setIsDeficitOpen(true)} className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 hover:border-amber-300 hover:shadow-sm transition-all text-right w-full">
                                    <p className="text-[10px] font-bold text-gray-400 mb-1">العجز</p>
                                    <p className="text-lg font-black text-amber-600 font-sans">{totalGlobalDeficit.toLocaleString()} <span className="text-[8px]">ج.م</span></p>
                                </button>
                                <button onClick={() => setIsExemptionsOpen(true)} className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100/50 hover:border-teal-300 hover:shadow-sm transition-all text-right w-full">
                                    <p className="text-[10px] font-bold text-gray-400 mb-1">المعفي عنه</p>
                                    <p className="text-lg font-black text-teal-600 font-sans">{totalGlobalExempted.toLocaleString()} <span className="text-[8px]">ج.م</span></p>
                                </button>
                                <button onClick={() => setIsDeductionsOpen(true)} className="p-4 bg-red-50/50 rounded-2xl border border-red-100/50 hover:border-red-300 hover:shadow-sm transition-all text-right w-full">
                                    <p className="text-[10px] font-bold text-gray-400 mb-1">الخصومات</p>
                                    <p className="text-lg font-black text-red-600 font-sans">{totalGlobalDeductions.toLocaleString()} <span className="text-[8px]">ج.م</span></p>
                                </button>
                                <button onClick={() => setIsSalaryStatusOpen(true)} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 hover:border-emerald-300 hover:shadow-sm transition-all text-right w-full">
                                    <p className="text-[10px] font-bold text-gray-400 mb-1">الرواتب</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✅ {paidCount}</span>
                                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">⏳ {unpaidCount}</span>
                                    </div>
                                </button>
                            </div>
                            <button onClick={() => setIsDeliveryDeficitOpen(true)} className="mt-4 w-full p-5 bg-rose-50/50 rounded-2xl border border-rose-200/50 hover:border-rose-400 hover:shadow-sm hover:bg-rose-50/80 transition-all text-right">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
                                            <AlertCircle size={20} />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] font-black text-gray-500">عجز التسليم</p>
                                            <p className="text-[9px] font-bold text-gray-400">المبالغ المحصلة ولم تسلم</p>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black text-rose-600 font-sans">{totalDeliveryDeficit.toLocaleString()} <span className="text-[10px]">ج.م</span></p>
                                </div>
                            </button>
                        </div>

                        {/* Section 3: Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => setIsExpensesBreakdownOpen(true)}
                                className="bg-white/90 backdrop-blur-xl border border-red-100/50 rounded-[32px] p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-right"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                                        <ArrowDownCircle size={24} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-black text-gray-400 mb-0.5">إجمالي المصروفات</p>
                                        <h3 className="text-2xl font-black text-red-600 font-sans">{totalExpenses.toLocaleString()} <span className="text-xs">ج.م</span></h3>
                                    </div>
                                </div>
                            </button>
                            <button
                                onClick={() => setIsProfitBreakdownOpen(true)}
                                className={cn(
                                    "rounded-[32px] p-6 shadow-sm transition-all text-right hover:shadow-lg hover:-translate-y-0.5",
                                    balance >= 0 ? "bg-green-700 text-white" : "bg-red-700 text-white"
                                )}>
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <Wallet size={24} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white/80 mb-1">{balance >= 0 ? 'صافي الربح' : 'صافي الخسارة'}</p>
                                        <h3 className="text-3xl font-black font-sans tracking-tight drop-shadow-md">
                                            {balance >= 0 ? '+' : ''}{balance.toLocaleString()} <span className="text-base text-white/80 font-bold">ج.م</span>
                                        </h3>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState, useMemo, useEffect } from 'react';
import Wallet from 'lucide-react/dist/esm/icons/wallet'
import Gift from 'lucide-react/dist/esm/icons/gift'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check'
import Loader from 'lucide-react/dist/esm/icons/loader'
import X from 'lucide-react/dist/esm/icons/x';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactionsByMonth } from '@/features/finance/services/financeService';
import { getFeesByMonth } from '@/features/students/services/recordsService';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { FadeIn, SlideIn } from '@/components/ui/transition';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useAllTeachersAttendance } from '@/features/teachers/hooks/useTeacherAttendance';
import { teacherDeductionService } from '@/features/teachers/services/deductionService';

export default function FinanceTeachersPage() {
    const { user } = useAuthStore();
    const [selectedMonth, setSelectedMonth] = useState('');
    const [isClient, setIsClient] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [detailView, setDetailView] = useState<'collections' | 'exemptions' | 'deductions' | 'expected' | null>(null);
    const queryClient = useQueryClient();
    const { data: teachers = [] } = useTeachers();
    const { data: students = [] } = useStudents();
    const { data: groups = [] } = useGroups();

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

    const { data: dbTransactions = [] } = useQuery({
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

    const { data: exemptions = [] } = useQuery({
        queryKey: ['exemptions', selectedMonth],
        queryFn: async () => {
            const { data } = await supabase.from('free_exemptions').select('id, student_id, student_name, exempted_by, amount, month').eq('month', selectedMonth);
            return data || [];
        },
        enabled: isClient && !!selectedMonth,
    });

    const { data: monthDeductions = [] } = useQuery({
        queryKey: ['all-deductions-finance', selectedMonth],
        queryFn: async () => teacherDeductionService.getAllDeductions(),
        enabled: isClient && !!selectedMonth,
    });

    const allAttendanceResult = useAllTeachersAttendance(selectedMonth);
    const allAttendanceMap = (allAttendanceResult.data || {}) as Record<string, any>;

    const normalize = (s: string) => { if (!s) return ''; return s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ءئؤ]/g, '').replace(/[ًٌٍَُِّ]/g, '').replace(/\s+/g, '').trim(); };

    const transactions = useMemo(() => dbTransactions.map(tr => ({ ...tr, type: tr.type as 'income' | 'expense' })), [dbTransactions]);
    const filteredTransactions = useMemo(() => transactions.filter((tr: any) => tr.date?.substring(0, 7) === selectedMonth), [transactions, selectedMonth]);

    const teacherData = useMemo(() => {
        const collectionsByTeacher: Record<string, { amount: number; count: number }> = {};
        teachers.filter(t => t.status === 'active' || !t.status).forEach(t => { collectionsByTeacher[t.id] = { amount: 0, count: 0 }; });

        allFees.forEach((fee: any) => {
            const matched = teachers.find(t => fee.createdBy === t.fullName || fee.createdBy === t.phone || normalize(fee.createdBy) === normalize(t.fullName));
            if (matched) { collectionsByTeacher[matched.id].amount += Number(fee.amount?.toString().replace(/[^0-9.]/g, '')) || 0; collectionsByTeacher[matched.id].count += 1; }
        });

        const exemptedIds = exemptions.map((e: any) => e.student_id);
        const collections = Object.entries(collectionsByTeacher).map(([id, data]) => {
            const teacher = teachers.find(t => t.id === id);
            const tGroups = groups.filter(g => g.teacherId === id).map(g => g.id);
            const tStudents = students.filter(s => s.groupId && tGroups.includes(s.groupId) && s.status !== 'archived' && s.enrollmentDate && s.enrollmentDate.length >= 7 && s.enrollmentDate.substring(0, 7) <= selectedMonth);
            let deficit = 0, expected = 0;
            tStudents.forEach(s => {
                const paid = allFees.filter((f: any) => f.studentId === s.id).reduce((sum: number, f: any) => sum + (Number(f.amount?.toString().replace(/[^0-9.]/g, '')) || 0), 0);
                const amt = Number(s.monthlyAmount) || 0;
                expected += amt;
                if (amt > paid && !exemptedIds.includes(s.id)) deficit += amt - paid;
            });
            return { teacherId: id, teacherName: teacher?.fullName || id, amount: data.amount, count: data.count, deficit, expected, unpaidCount: tStudents.filter(s => { const paid = allFees.filter((f: any) => f.studentId === s.id).reduce((sum: number, f: any) => sum + (Number(f.amount?.toString().replace(/[^0-9.]/g, '')) || 0), 0); return paid < (Number(s.monthlyAmount) || 0); }).length };
        });

        const filteredDeductions = monthDeductions.filter((d: any) => { const dDate = new Date(d.appliedDate); const dm = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`; return dm === selectedMonth && d.status === 'applied' && !d.reason.startsWith('مكافأة:'); });
        const deductionBreakdown = teachers.map(t => {
            const manualDays = filteredDeductions.filter((d: any) => d.teacherId === t.id).reduce((sum: number, d: any) => sum + d.amount, 0);
            const att = allAttendanceMap[t.id] || {};
            const absenceDays = Object.values(att).reduce((acc: number, s: any) => { if (s === 'absent') return acc + 1; if (s === 'half') return acc + 0.5; if (s === 'quarter') return acc + 0.25; return acc; }, 0);
            const dailyRate = t.accountingType === 'partnership' ? ((Number(t.partnershipPercentage) || 0) / 22) : ((Number(t.salary) || 1000) / 22);
            const totalDays = manualDays + absenceDays;
            const totalAmount = Math.max(0, Math.round(totalDays * dailyRate));
            return { teacherId: t.id, teacherName: t.fullName, manualDays, absenceDays, totalDays, totalAmount, dailyRate };
        }).filter(d => d.totalAmount > 0).sort((a, b) => b.totalAmount - a.totalAmount);

        const totalCollected = collections.reduce((s, c) => s + c.amount, 0);
        const totalDeficit = collections.reduce((s, c) => s + c.deficit, 0);
        const totalExpected = collections.reduce((s, c) => s + c.expected, 0);
        const totalExempted = exemptions.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
        const totalDeductions = deductionBreakdown.reduce((s, d) => s + d.totalAmount, 0);

        return { collections, deductionBreakdown, totalCollected, totalDeficit, totalExpected, totalExempted, totalDeductions };
    }, [teachers, allFees, students, groups, exemptions, selectedMonth, monthDeductions, allAttendanceMap]);

    const waiveMutation = useMutation({
        mutationFn: async ({ teacherId, amount }: { teacherId: string; amount: number }) => {
            const [year, month] = selectedMonth.split('-');
            return await teacherDeductionService.applyDeduction(teacherId, '', -amount, `عفو عن خصومات شهر ${months.find(m => m.value === selectedMonth)?.label || selectedMonth}`, user?.displayName || 'المدير', `${year}-${month}-01`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-deductions-finance'] }),
    });

    if (!isClient) return null;

    return (
        <div className="min-h-screen bg-gray-50/50 pb-32 font-sans">
            {/* Header */}
            <div className="sticky top-0 z-[70] bg-gray-50/95 backdrop-blur-xl px-4 py-4 border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/finance" className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50">
                            <ArrowLeft size={20} />
                        </Link>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { const i = months.findIndex(m => m.value === selectedMonth); if (i < months.length - 1) setSelectedMonth(months[i + 1].value); }} disabled={months.findIndex(m => m.value === selectedMonth) === months.length - 1} className="w-9 h-9 bg-white border border-purple-100 rounded-xl flex items-center justify-center text-purple-600 hover:bg-purple-50 disabled:opacity-50">
                            <ChevronRight size={18} />
                        </button>
                        <div className="relative">
                            <button onClick={() => setShowMonthPicker(!showMonthPicker)} className="h-10 px-4 bg-white border border-purple-100 rounded-xl flex items-center gap-2 text-purple-700 font-black shadow-sm">
                                <Calendar size={16} /> <span className="text-xs">{months.find(m => m.value === selectedMonth)?.label}</span> <ChevronDown size={14} />
                            </button>
                            {showMonthPicker && (
                                <div className="absolute top-[110%] left-1/2 -translate-x-1/2 w-44 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-1">
                                    {months.map(m => (
                                        <button key={m.value} onClick={() => { setSelectedMonth(m.value); setShowMonthPicker(false); }}
                                            className={cn("w-full px-4 py-2 text-right text-xs font-bold flex items-center justify-between", selectedMonth === m.value ? "bg-purple-50 text-purple-600" : "text-gray-600 hover:bg-gray-50")}>
                                            {m.label} {selectedMonth === m.value && <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={() => { const i = months.findIndex(m => m.value === selectedMonth); if (i > 0) setSelectedMonth(months[i - 1].value); }} disabled={months.findIndex(m => m.value === selectedMonth) === 0} className="w-9 h-9 bg-white border border-purple-100 rounded-xl flex items-center justify-center text-purple-600 hover:bg-purple-50 disabled:opacity-50">
                            <ChevronLeft size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div onClick={() => setDetailView(detailView === 'collections' ? null : 'collections')} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all">
                        <p className="text-[10px] font-bold text-gray-400">محصل</p>
                        <p className="text-xl font-black text-purple-600 font-sans">{teacherData.totalCollected.toLocaleString()} <span className="text-[8px]">ج.م</span></p>
                    </div>
                    <div onClick={() => setDetailView(detailView === 'expected' ? null : 'expected')} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all">
                        <p className="text-[10px] font-bold text-gray-400">المتوقع</p>
                        <p className="text-xl font-black text-indigo-600 font-sans">{teacherData.totalExpected.toLocaleString()} <span className="text-[8px]">ج.م</span></p>
                    </div>
                    <div onClick={() => setDetailView(detailView === 'exemptions' ? null : 'exemptions')} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all">
                        <p className="text-[10px] font-bold text-gray-400">إعفاءات</p>
                        <p className="text-xl font-black text-teal-600 font-sans">{teacherData.totalExempted.toLocaleString()} <span className="text-[8px]">ج.م</span></p>
                    </div>
                    <div onClick={() => setDetailView(detailView === 'deductions' ? null : 'deductions')} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all">
                        <p className="text-[10px] font-bold text-gray-400">خصومات</p>
                        <p className="text-xl font-black text-red-600 font-sans">{teacherData.totalDeductions.toLocaleString()} <span className="text-[8px]">ج.م</span></p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-3xl p-5 shadow-lg">
                    <p className="text-xs text-amber-100 font-bold mb-1">العجز الإجمالي</p>
                    <p className="text-3xl font-black font-sans">{teacherData.totalDeficit.toLocaleString()} <span className="text-base text-amber-200">ج.م</span></p>
                </div>

                {/* Detail View */}
                {detailView === 'collections' && (
                    <div className="space-y-2">
                        <h3 className="font-black text-gray-700 text-sm">تحصيل المدرسين</h3>
                        {teacherData.collections.map(c => (
                            <div key={c.teacherId} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="text-right"><p className="font-black text-sm text-gray-900">{c.teacherName}</p><p className="text-[10px] text-gray-400 font-bold">عجز: {c.deficit.toLocaleString()} | متوقع: {c.expected.toLocaleString()}</p></div>
                                <p className="text-lg font-black text-purple-600 font-sans">{c.amount.toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                            </div>
                        ))}
                    </div>
                )}

                {detailView === 'exemptions' && (
                    <div className="space-y-2">
                        <h3 className="font-black text-gray-700 text-sm">الإعفاءات المالية</h3>
                        {exemptions.length === 0 ? (
                            <p className="text-xs text-gray-400 font-bold text-center py-8 bg-white rounded-2xl border border-dashed border-gray-100">لا توجد إعفاءات.</p>
                        ) : (
                            exemptions.map((ex: any) => {
                                const student = students.find(s => s.id === ex.student_id);
                                const group = student ? groups.find(g => g.id === student.groupId) : null;
                                return (
                                    <div key={ex.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                        <div className="text-right">
                                            <p className="font-black text-sm text-gray-900">{ex.student_name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold">
                                                {group?.name && `${group.name} | `}بواسطة: {ex.exempted_by}
                                            </p>
                                        </div>
                                        <p className="text-lg font-black text-teal-600 font-sans">{Number(ex.amount).toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {detailView === 'deductions' && (
                    <div className="space-y-2">
                        <h3 className="font-black text-gray-700 text-sm">خصومات المدرسين</h3>
                        {teacherData.deductionBreakdown.length === 0 ? (
                            <p className="text-xs text-gray-400 font-bold text-center py-8 bg-white rounded-2xl border border-dashed border-gray-100">لا توجد خصومات.</p>
                        ) : (
                            teacherData.deductionBreakdown.map(d => (
                                <div key={d.teacherId} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                    <div className="text-right"><p className="font-black text-sm text-gray-900">{d.teacherName}</p><p className="text-[10px] text-gray-400 font-bold">غياب: {d.absenceDays}ي | يدوي: {d.manualDays}ي</p></div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-lg font-black text-red-600 font-sans">{d.totalAmount.toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                                        <button onClick={() => { const amt = prompt(`مبلغ العفو لـ ${d.teacherName}:`, d.totalAmount.toString()); if (amt) waiveMutation.mutate({ teacherId: d.teacherId, amount: parseFloat(amt) }); }}
                                            className="w-9 h-9 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all">
                                            <ShieldCheck size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {detailView === 'expected' && (
                    <div className="space-y-2">
                        <h3 className="font-black text-gray-700 text-sm">المتوقع تحصيله</h3>
                        {teacherData.collections.map(c => (
                            <div key={c.teacherId} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="text-right"><p className="font-black text-sm text-gray-900">{c.teacherName}</p><p className="text-[10px] text-gray-400 font-bold">طلاب: {c.count} | عجز: {c.deficit.toLocaleString()}</p></div>
                                <p className="text-lg font-black text-indigo-600 font-sans">{c.expected.toLocaleString()} <span className="text-[9px]">ج.م</span></p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

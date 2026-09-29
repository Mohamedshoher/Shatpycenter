"use client";

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Search from 'lucide-react/dist/esm/icons/search';
import User from 'lucide-react/dist/esm/icons/user';
import { cn, tieredSearchFilter } from '@/lib/utils';
import { useStudents } from '@/features/students/hooks/useStudents';
import {
    getAnalyticsOverview,
    getGroupsAnalytics,
    getStudentAnalytics,
} from '@/features/analytics/services/analyticsService';
import { Student } from '@/types';

// سهم/لون التغيّر بين شهرين: أخضر لتحسّن، أحمر لتراجع، رمادي لثبات
const Delta = ({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) => {
    const diff = current - previous;
    if (previous === 0 && current === 0) return <span className="text-gray-300 text-[10px] font-bold">—</span>;
    const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
    const color = diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-gray-400';
    return (
        <span className={cn('inline-flex items-center gap-1 text-[10px] font-black', color)}>
            <Icon size={11} />
            {diff !== 0 ? `${diff > 0 ? '+' : ''}${diff}${suffix}` : 'بدون تغيير'}
        </span>
    );
};

const StatCard = ({ title, current, previous, unit = '', rate = false }: { title: string; current: number | null; previous: number | null; unit?: string; rate?: boolean }) => (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-1.5">
        <p className="text-[11px] font-bold text-gray-400">{title}</p>
        <p className="text-2xl font-black text-gray-900 font-sans">
            {current === null ? '—' : `${current}${rate ? '%' : ''}`} <span className="text-xs text-gray-400 font-bold">{unit}</span>
        </p>
        {current !== null && previous !== null && <Delta current={current} previous={previous} suffix={rate ? '%' : ''} />}
    </div>
);

export default function AnalyticsPage() {
    const { data: allStudents } = useStudents();

    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = selectedDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

    const goToPrevMonth = () => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d); };
    const goToNextMonth = () => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d); };

    const { data: overview, isLoading: overviewLoading } = useQuery({
        queryKey: ['analytics-overview', monthKey],
        queryFn: () => getAnalyticsOverview(monthKey),
    });

    const { data: groups = [], isLoading: groupsLoading } = useQuery({
        queryKey: ['analytics-groups', monthKey],
        queryFn: () => getGroupsAnalytics(monthKey),
    });

    // --- قسم الطالب الفردي ---
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    const searchResults = useMemo(() => {
        if (!studentSearch.trim() || !allStudents) return [];
        return tieredSearchFilter(allStudents, studentSearch, (s) => s.fullName).slice(0, 8);
    }, [allStudents, studentSearch]);

    const { data: studentMonths = [], isLoading: studentLoading } = useQuery({
        queryKey: ['analytics-student', selectedStudent?.id],
        queryFn: () => getStudentAnalytics(selectedStudent!.id, 6),
        enabled: !!selectedStudent,
    });

    const maxPages = Math.max(1, ...studentMonths.map((m) => m.pagesSum));

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24 text-right font-sans overflow-x-hidden" dir="rtl">
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-3 md:px-6 py-3">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
                    <h1 className="text-sm md:text-lg font-black text-gray-800">التحليلات الشاملة</h1>
                    <div className="flex items-center gap-1 bg-gray-50 rounded-xl border border-gray-100 px-1 py-1">
                        <button onClick={goToNextMonth} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-500">
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-black text-gray-700 px-1 min-w-[90px] text-center">{monthLabel}</span>
                        <button onClick={goToPrevMonth} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-500">
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-3 md:px-6 py-5 space-y-8">
                {/* المستوى 1: نظرة عامة */}
                <section className="space-y-3">
                    <h2 className="text-sm font-black text-gray-500 px-1">نظرة عامة (مقارنة بالشهر السابق)</h2>
                    {overviewLoading ? (
                        <div className="text-center py-10 text-gray-400 text-sm font-bold">جاري التحميل...</div>
                    ) : overview ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <StatCard title="عدد الاختبارات" current={overview.current.examsCount} previous={overview.previous.examsCount} />
                            <StatCard title="مجموع الصفحات المُختبرة" current={overview.current.pagesSum} previous={overview.previous.pagesSum} />
                            <StatCard title="لم يختبروا هذا الشهر" current={overview.current.notTestedCount} previous={overview.previous.notTestedCount} />
                            <StatCard title="نسبة الحضور" current={overview.current.attendanceRate} previous={overview.previous.attendanceRate} rate />
                            <StatCard title="نسبة تحصيل المصروفات" current={overview.current.collectionRate} previous={overview.previous.collectionRate} rate />
                            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-1.5">
                                <p className="text-[11px] font-bold text-gray-400">إجمالي الطلاب النشطين</p>
                                <p className="text-2xl font-black text-gray-900 font-sans">{overview.totalStudents}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-400 text-sm font-bold">تعذر تحميل البيانات</div>
                    )}
                </section>

                {/* المستوى 2: مقارنة المجموعات */}
                <section className="space-y-3">
                    <h2 className="text-sm font-black text-gray-500 px-1">مقارنة المجموعات</h2>
                    {groupsLoading ? (
                        <div className="text-center py-10 text-gray-400 text-sm font-bold">جاري التحميل...</div>
                    ) : groups.length === 0 ? (
                        <div className="text-center py-10 bg-white/40 rounded-2xl border-2 border-dashed border-gray-100 text-gray-400 text-sm font-bold">لا توجد مجموعات لعرضها</div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 text-[10px] font-black text-gray-400 border-b border-gray-100">
                                <span className="col-span-4">المجموعة</span>
                                <span className="col-span-3">صفحات الاختبارات</span>
                                <span className="col-span-2">عدد الاختبارات</span>
                                <span className="col-span-3">نسبة الحضور</span>
                            </div>
                            {groups.map((g) => (
                                <div key={g.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-50 last:border-0 items-center">
                                    <div className="col-span-4 min-w-0">
                                        <p className="text-xs font-bold text-gray-800 truncate">{g.name}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{g.teacherName} · {g.studentsCount} طالب</p>
                                    </div>
                                    <div className="col-span-3 flex flex-col">
                                        <span className="text-sm font-black text-gray-800 font-sans">{g.current.pagesSum}</span>
                                        <Delta current={g.current.pagesSum} previous={g.previous.pagesSum} />
                                    </div>
                                    <div className="col-span-2 flex flex-col">
                                        <span className="text-sm font-black text-gray-800 font-sans">{g.current.examsCount}</span>
                                        <Delta current={g.current.examsCount} previous={g.previous.examsCount} />
                                    </div>
                                    <div className="col-span-3 flex flex-col">
                                        <span className="text-sm font-black text-gray-800 font-sans">{g.current.attendanceRate ?? '—'}{g.current.attendanceRate !== null && '%'}</span>
                                        {g.current.attendanceRate !== null && g.previous.attendanceRate !== null && (
                                            <Delta current={g.current.attendanceRate} previous={g.previous.attendanceRate} suffix="%" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* المستوى 3: تفاصيل طالب */}
                <section className="space-y-3">
                    <h2 className="text-sm font-black text-gray-500 px-1">متابعة طالب على مدار الشهور</h2>
                    <div className="relative">
                        <input
                            type="text"
                            value={studentSearch}
                            onChange={(e) => { setStudentSearch(e.target.value); setSelectedStudent(null); }}
                            placeholder="ابحث عن اسم الطالب..."
                            className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 pr-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />

                        {searchResults.length > 0 && !selectedStudent && (
                            <div className="absolute z-20 top-full mt-1 w-full bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
                                {searchResults.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setSelectedStudent(s); setStudentSearch(s.fullName); }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-blue-50 transition-colors text-right"
                                    >
                                        <User size={14} className="text-gray-400" />
                                        {s.fullName}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedStudent && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                            <h3 className="font-black text-gray-800">{selectedStudent.fullName}</h3>
                            {studentLoading ? (
                                <div className="text-center py-8 text-gray-400 text-sm font-bold">جاري التحميل...</div>
                            ) : (
                                <>
                                    {/* رسم أعمدة بسيط لعدد الصفحات شهريًا */}
                                    <div className="flex items-end gap-2 h-32">
                                        {studentMonths.map((m) => (
                                            <div key={m.monthKey} className="flex-1 flex flex-col items-center gap-1.5">
                                                <span className="text-[10px] font-black text-gray-500 font-sans">{m.pagesSum}</span>
                                                <div
                                                    className="w-full bg-blue-500 rounded-t-md transition-all"
                                                    style={{ height: `${Math.max(4, (m.pagesSum / maxPages) * 100)}%` }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-6 gap-1">
                                        {studentMonths.map((m) => (
                                            <span key={m.monthKey} className="text-[9px] font-bold text-gray-400 text-center truncate">{m.label.split(' ')[0]}</span>
                                        ))}
                                    </div>

                                    {/* جدول شهري تفصيلي */}
                                    <div className="border-t border-gray-100 pt-4 space-y-2">
                                        {studentMonths.slice().reverse().map((m, i, arr) => {
                                            const prevMonth = arr[i + 1];
                                            return (
                                                <div key={m.monthKey} className="flex items-center justify-between text-xs bg-gray-50/60 rounded-xl px-3 py-2.5">
                                                    <span className="font-bold text-gray-600">{m.label}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-black text-gray-800 font-sans">{m.pagesSum} صفحة</span>
                                                        {prevMonth && <Delta current={m.pagesSum} previous={prevMonth.pagesSum} />}
                                                        <span className="font-bold text-gray-400 font-sans">{m.examsCount} اختبار</span>
                                                        <span className="font-bold text-gray-400 font-sans">{m.attendanceRate ?? '—'}{m.attendanceRate !== null && '%'} حضور</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

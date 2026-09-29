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
import ArrowDownAZ from 'lucide-react/dist/esm/icons/arrow-down-a-z';
import ArrowUpDown from 'lucide-react/dist/esm/icons/arrow-up-down';
import { cn, tieredSearchFilter } from '@/lib/utils';
import { useStudents } from '@/features/students/hooks/useStudents';
import {
    getAnalyticsOverview,
    getGroupsAnalytics,
    getStudentAnalytics,
} from '@/features/analytics/services/analyticsService';
import { Student } from '@/types';

type TabType = 'general' | 'groups' | 'students';
type SortMode = 'name' | 'change';

const TABS: { id: TabType; label: string }[] = [
    { id: 'general', label: 'عام' },
    { id: 'groups', label: 'أداء المجموعات' },
    { id: 'students', label: 'الأولاد' },
];

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
    const [activeTab, setActiveTab] = useState<TabType>('general');

    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = selectedDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

    const goToPrevMonth = () => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d); };
    const goToNextMonth = () => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d); };

    const { data: overview, isLoading: overviewLoading } = useQuery({
        queryKey: ['analytics-overview', monthKey],
        queryFn: () => getAnalyticsOverview(monthKey),
        enabled: activeTab === 'general',
    });

    const { data: groups = [], isLoading: groupsLoading } = useQuery({
        queryKey: ['analytics-groups', monthKey],
        queryFn: () => getGroupsAnalytics(monthKey),
        enabled: activeTab === 'groups',
    });

    const [sortMode, setSortMode] = useState<SortMode>('name');
    const sortedGroups = useMemo(() => {
        const list = [...groups];
        // نجمع دلتا الصفحات والأسطر معًا كمقياس نشاط واحد، لأن بعض المجموعات
        // (كالتلقين) تُقاس بالأسطر أساسًا وليس الصفحات
        const activityDelta = (g: typeof list[number]) =>
            (g.current.pagesSum - g.previous.pagesSum) + (g.current.linesSum - g.previous.linesSum);
        if (sortMode === 'name') {
            list.sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'ar'));
        } else {
            list.sort((a, b) => activityDelta(b) - activityDelta(a));
        }
        return list;
    }, [groups, sortMode]);

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
                <div className="max-w-5xl mx-auto space-y-3">
                    <div className="flex items-center justify-between gap-2">
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

                    {/* تبويبات: عام / أداء المجموعات / الأولاد */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all whitespace-nowrap',
                                    activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-3 md:px-6 py-5 space-y-6">
                {/* تبويب عام: نظرة عامة */}
                {activeTab === 'general' && (
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
                )}

                {/* تبويب أداء المجموعات: مدرس/مجموعة + صفحات + عدد اختبارات + حضور، مع الترتيب */}
                {activeTab === 'groups' && (
                    <section className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-sm font-black text-gray-500">أداء المجموعات والمدرسين (مقارنة بالشهر السابق)</h2>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => setSortMode('name')}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all',
                                    sortMode === 'name' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                )}
                            >
                                <ArrowDownAZ size={13} /> ترتيب أبجدي (المدرس)
                            </button>
                            <button
                                onClick={() => setSortMode('change')}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all',
                                    sortMode === 'change' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                )}
                            >
                                <ArrowUpDown size={13} /> ترتيب حسب نسبة التغيّر
                            </button>
                        </div>

                        {groupsLoading ? (
                            <div className="text-center py-10 text-gray-400 text-sm font-bold">جاري التحميل...</div>
                        ) : sortedGroups.length === 0 ? (
                            <div className="text-center py-10 bg-white/40 rounded-2xl border-2 border-dashed border-gray-100 text-gray-400 text-sm font-bold">لا توجد مجموعات لعرضها</div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 text-[10px] font-black text-gray-400 border-b border-gray-100">
                                    <span className="col-span-3">المجموعة</span>
                                    <span className="col-span-3">صفحات</span>
                                    <span className="col-span-3">أسطر</span>
                                    <span className="col-span-1">اختبارات</span>
                                    <span className="col-span-2">الحضور</span>
                                </div>
                                {sortedGroups.map((g) => (
                                    <div key={g.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-50 last:border-0 items-center">
                                        <div className="col-span-3 min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">{g.name}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{g.teacherName} · {g.studentsCount} طالب</p>
                                        </div>
                                        <div className="col-span-3 flex flex-col">
                                            <span className="text-sm font-black text-gray-800 font-sans">{g.current.pagesSum}</span>
                                            <Delta current={g.current.pagesSum} previous={g.previous.pagesSum} />
                                        </div>
                                        <div className="col-span-3 flex flex-col">
                                            <span className="text-sm font-black text-gray-800 font-sans">{g.current.linesSum}</span>
                                            <Delta current={g.current.linesSum} previous={g.previous.linesSum} />
                                        </div>
                                        <div className="col-span-1 flex flex-col">
                                            <span className="text-sm font-black text-gray-800 font-sans">{g.current.examsCount}</span>
                                            <Delta current={g.current.examsCount} previous={g.previous.examsCount} />
                                        </div>
                                        <div className="col-span-2 flex flex-col">
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
                )}

                {/* تبويب الأولاد: بحث عن طالب + تفصيل شهري بالأنواع الثلاثة */}
                {activeTab === 'students' && (
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
                                        {/* رسم أعمدة بسيط لإجمالي عدد الصفحات شهريًا */}
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

                                        {/* جدول شهري تفصيلي بالأنواع الثلاثة */}
                                        <div className="border-t border-gray-100 pt-4 space-y-2">
                                            {studentMonths.slice().reverse().map((m, i, arr) => {
                                                const prevMonth = arr[i + 1];
                                                return (
                                                    <div key={m.monthKey} className="bg-gray-50/60 rounded-xl px-3 py-3 space-y-2">
                                                        <div className="flex items-center justify-between flex-wrap gap-1">
                                                            <span className="text-xs font-bold text-gray-600">{m.label}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-black text-gray-800 font-sans">{m.pagesSum} صفحة</span>
                                                                {prevMonth && <Delta current={m.pagesSum} previous={prevMonth.pagesSum} />}
                                                                <span className="text-xs font-black text-gray-800 font-sans">{m.linesSum} سطر</span>
                                                                {prevMonth && <Delta current={m.linesSum} previous={prevMonth.linesSum} />}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="bg-blue-50 rounded-lg px-2 py-1.5 text-center space-y-0.5">
                                                                <p className="text-[9px] font-bold text-blue-500">جديد</p>
                                                                <p className="text-xs font-black text-blue-700 font-sans">{m.newPages} ص</p>
                                                                {prevMonth && <Delta current={m.newPages} previous={prevMonth.newPages} />}
                                                                <p className="text-xs font-black text-blue-700 font-sans">{m.newLines} سط</p>
                                                                {prevMonth && <Delta current={m.newLines} previous={prevMonth.newLines} />}
                                                            </div>
                                                            <div className="bg-amber-50 rounded-lg px-2 py-1.5 text-center space-y-0.5">
                                                                <p className="text-[9px] font-bold text-amber-500">ماضي قريب</p>
                                                                <p className="text-xs font-black text-amber-700 font-sans">{m.nearPages} ص</p>
                                                                {prevMonth && <Delta current={m.nearPages} previous={prevMonth.nearPages} />}
                                                                <p className="text-xs font-black text-amber-700 font-sans">{m.nearLines} سط</p>
                                                                {prevMonth && <Delta current={m.nearLines} previous={prevMonth.nearLines} />}
                                                            </div>
                                                            <div className="bg-purple-50 rounded-lg px-2 py-1.5 text-center space-y-0.5">
                                                                <p className="text-[9px] font-bold text-purple-500">ماضي بعيد</p>
                                                                <p className="text-xs font-black text-purple-700 font-sans">{m.farPages} ص</p>
                                                                {prevMonth && <Delta current={m.farPages} previous={prevMonth.farPages} />}
                                                                <p className="text-xs font-black text-purple-700 font-sans">{m.farLines} سط</p>
                                                                {prevMonth && <Delta current={m.farLines} previous={prevMonth.farLines} />}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                                                            <span>{m.examsCount} اختبار</span>
                                                            <span className="flex items-center gap-1.5">
                                                                {m.attendanceRate ?? '—'}{m.attendanceRate !== null && '%'} حضور
                                                                {prevMonth && m.attendanceRate !== null && prevMonth.attendanceRate !== null && (
                                                                    <Delta current={m.attendanceRate} previous={prevMonth.attendanceRate} suffix="%" />
                                                                )}
                                                            </span>
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
                )}
            </main>
        </div>
    );
}

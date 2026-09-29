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
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import { cn, tieredSearchFilter } from '@/lib/utils';
import { useStudents } from '@/features/students/hooks/useStudents';
import {
    getAnalyticsOverview,
    getGroupsAnalytics,
    getStudentAnalytics,
    GroupAnalytics,
} from '@/features/analytics/services/analyticsService';
import { Student } from '@/types';

type TabType = 'general' | 'groups' | 'students';
type GroupSortColumn = 'name' | 'total' | 'new' | 'near' | 'far' | 'notTested' | 'withdrawn' | 'attendance';

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

// بطاقة مقياس واحد داخل بطاقة المجموعة (قيمة + دلتا التغيّر)
const GroupMetricTile = ({ label, current, previous, suffix = '' }: { label: string; current: number | null; previous: number | null; suffix?: string }) => (
    <div className="bg-gray-50/70 rounded-xl px-2 py-2 text-center space-y-0.5">
        <p className="text-[9px] font-bold text-gray-400 truncate">{label}</p>
        <p className="text-sm font-black text-gray-800 font-sans">{current ?? '—'}{current !== null && suffix}</p>
        {current !== null && previous !== null ? <Delta current={current} previous={previous} suffix={suffix} /> : <span className="text-gray-300 text-[10px] font-bold">—</span>}
    </div>
);

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

    // ترتيب بطاقات أداء المجموعات: فلتر "ترتيب حسب" + اتجاه تصاعدي/تنازلي
    const [groupSort, setGroupSort] = useState<{ column: GroupSortColumn; dir: 'asc' | 'desc' }>({ column: 'name', dir: 'asc' });
    const groupSortValue = (g: GroupAnalytics, column: GroupSortColumn): number | string => {
        switch (column) {
            case 'name': return g.name;
            case 'total': return g.current.pagesSum;
            case 'new': return g.current.newPages;
            case 'near': return g.current.nearPages;
            case 'far': return g.current.farPages;
            case 'notTested': return g.current.notTestedRate ?? -1;
            case 'withdrawn': return g.current.withdrawnRate ?? -1;
            case 'attendance': return g.current.attendanceRate ?? -1;
        }
    };
    const sortedGroups = useMemo(() => {
        const list = [...groups];
        list.sort((a, b) => {
            const va = groupSortValue(a, groupSort.column);
            const vb = groupSortValue(b, groupSort.column);
            const cmp = typeof va === 'string' ? va.localeCompare(vb as string, 'ar') : (va as number) - (vb as number);
            return groupSort.dir === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [groups, groupSort]);

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

                {/* تبويب أداء المجموعات: بطاقة لكل مجموعة (الكل/جديد/قريب/بعيد/لم يختبروا/الانصراف/الحضور) مع فلتر ترتيب */}
                {activeTab === 'groups' && (
                    <section className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-sm font-black text-gray-500">أداء المجموعات والمدرسين (مقارنة بالشهر السابق)</h2>
                        </div>

                        {/* فلتر الترتيب */}
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[11px] font-bold text-gray-400 shrink-0">ترتيب حسب</span>
                            <select
                                value={groupSort.column}
                                onChange={(e) => setGroupSort((prev) => ({ ...prev, column: e.target.value as GroupSortColumn }))}
                                className="flex-1 h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="name">اسم المجموعة</option>
                                <option value="total">الكل (الصفحات)</option>
                                <option value="new">جديد</option>
                                <option value="near">قريب</option>
                                <option value="far">بعيد</option>
                                <option value="notTested">لم يختبروا</option>
                                <option value="withdrawn">الانصراف</option>
                                <option value="attendance">الحضور</option>
                            </select>
                            <button
                                onClick={() => setGroupSort((prev) => ({ ...prev, dir: prev.dir === 'asc' ? 'desc' : 'asc' }))}
                                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                                title={groupSort.dir === 'asc' ? 'تصاعدي' : 'تنازلي'}
                            >
                                {groupSort.dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            </button>
                        </div>

                        {groupsLoading ? (
                            <div className="text-center py-10 text-gray-400 text-sm font-bold">جاري التحميل...</div>
                        ) : sortedGroups.length === 0 ? (
                            <div className="text-center py-10 bg-white/40 rounded-2xl border-2 border-dashed border-gray-100 text-gray-400 text-sm font-bold">لا توجد مجموعات لعرضها</div>
                        ) : (
                            <div className="space-y-2.5">
                                {sortedGroups.map((g) => (
                                    <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-gray-800 truncate">{g.name}</p>
                                            <p className="text-[11px] text-gray-400 truncate">{g.teacherName} · {g.studentsCount} طالب</p>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            <GroupMetricTile label="الكل" current={g.current.pagesSum} previous={g.previous.pagesSum} />
                                            <GroupMetricTile label="جديد" current={g.current.newPages} previous={g.previous.newPages} />
                                            <GroupMetricTile label="قريب" current={g.current.nearPages} previous={g.previous.nearPages} />
                                            <GroupMetricTile label="بعيد" current={g.current.farPages} previous={g.previous.farPages} />
                                            <GroupMetricTile label="لم يختبروا" current={g.current.notTestedRate} previous={g.previous.notTestedRate} suffix="%" />
                                            <GroupMetricTile label="الانصراف" current={g.current.withdrawnRate} previous={g.previous.withdrawnRate} suffix="%" />
                                            <GroupMetricTile label="الحضور" current={g.current.attendanceRate} previous={g.previous.attendanceRate} suffix="%" />
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
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="bg-blue-50 rounded-lg px-2 py-1.5 text-center space-y-0.5">
                                                                <p className="text-[9px] font-bold text-blue-500">جديد</p>
                                                                <p className="text-xs font-black text-blue-700 font-sans">{m.newPages} ص</p>
                                                                {prevMonth && <Delta current={m.newPages} previous={prevMonth.newPages} />}
                                                            </div>
                                                            <div className="bg-amber-50 rounded-lg px-2 py-1.5 text-center space-y-0.5">
                                                                <p className="text-[9px] font-bold text-amber-500">ماضي قريب</p>
                                                                <p className="text-xs font-black text-amber-700 font-sans">{m.nearPages} ص</p>
                                                                {prevMonth && <Delta current={m.nearPages} previous={prevMonth.nearPages} />}
                                                            </div>
                                                            <div className="bg-purple-50 rounded-lg px-2 py-1.5 text-center space-y-0.5">
                                                                <p className="text-[9px] font-bold text-purple-500">ماضي بعيد</p>
                                                                <p className="text-xs font-black text-purple-700 font-sans">{m.farPages} ص</p>
                                                                {prevMonth && <Delta current={m.farPages} previous={prevMonth.farPages} />}
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

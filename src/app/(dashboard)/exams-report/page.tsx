"use client";

import { useState, useMemo } from 'react';
import {
    Trophy,
    TrendingUp,
    ChevronDown,
    Bell,
    Share2,
    ChevronRight,
    User,
    AlertCircle,
    Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { useAuthStore } from '@/store/useAuthStore';
import StudentDetailModal from '@/features/students/components/StudentDetailModal';
import { useAllExams } from '@/features/students/hooks/useAllExams';

type TabType = 'notTested' | 'mostTested' | 'performance';

const EXAM_TYPE_MAP: Record<string, string> = {
    'new': 'جديد',
    'near': 'ماضي قريب',
    'far': 'ماضي بعيد'
};

export default function ExamsReportPage() {
    const { data: students } = useStudents();
    const { data: groups } = useGroups();
    const { data: teachers } = useTeachers();
    const { user } = useAuthStore();

    // تصفية المجموعات للمدرس
    const filteredGroupsList = groups?.filter((g: any) => {
        if (user?.role === 'teacher') return g.teacherId === user.teacherId;
        return true;
    }) || [];
    const assignedGroupIds = filteredGroupsList.map((g: any) => g.id);

    const [activeTab, setActiveTab] = useState<TabType>('notTested');
    const [selectedGroupId, setSelectedGroupId] = useState('all');
    const [selectedExamType, setSelectedExamType] = useState('new');
    const [examsLimit, setExamsLimit] = useState('1');
    const [performanceFilter, setPerformanceFilter] = useState<'all' | 'new' | 'near' | 'far'>('all');

    // استخدام التاريخ المختار بدلاً من offset
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any>(null);

    const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    const { data: allExams = [] } = useAllExams(monthKey);

    const currentMonthLabel = selectedDate.toLocaleDateString('ar-EG', { month: 'long' });
    const monthLabelWithYear = selectedDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

    const goToPreviousMonth = () => {
        const d = new Date(selectedDate);
        d.setMonth(d.getMonth() - 1);
        setSelectedDate(d);
    };

    const isCurrentMonth = useMemo(() => {
        const now = new Date();
        return now.getMonth() === selectedDate.getMonth() && now.getFullYear() === selectedDate.getFullYear();
    }, [selectedDate]);

    // --- حساب الطلاب الحقيقيين ---

    const notTestedStudents = useMemo(() => {
        let base = (students || []).filter((s: any) => s.status === 'active');

        // فلترة المجموعة
        if (selectedGroupId !== 'all') {
            base = base.filter((s: any) => s.groupId === selectedGroupId);
        } else if (user?.role === 'teacher') {
            base = base.filter((s: any) => s.groupId && assignedGroupIds.includes(s.groupId));
        }

        // تحديد نوع الاختبار للبحث
        const arabicType = EXAM_TYPE_MAP[selectedExamType] || 'جديد';

        // الطلاب الذين اختبروا هذا النوع في هذا الشهر
        const testedInMonthIds = new Set(
            allExams
                .filter((e: any) => e.type === arabicType)
                .map((e: any) => e.studentId)
        );

        // من لم يختبروا هم من ليسوا في القائمة أعلاه
        return base
            .filter((s: any) => !testedInMonthIds.has(s.id))
            .map((s: any, i: number) => ({
                ...s,
                rank: i + 1,
                groupName: groups?.find((g: any) => g.id === s.groupId)?.name || 'غير محدد'
            }));
    }, [students, groups, allExams, selectedGroupId, selectedExamType, user, assignedGroupIds]);

    const mostTestedStudents = useMemo(() => {
        let base = (students || []).filter((s: any) => s.status === 'active');

        // فلترة المجموعة
        if (selectedGroupId !== 'all') {
            base = base.filter((s: any) => s.groupId === selectedGroupId);
        } else if (user?.role === 'teacher') {
            base = base.filter((s: any) => s.groupId && assignedGroupIds.includes(s.groupId));
        }

        const limit = parseInt(examsLimit) || 0;
        const arabicType = EXAM_TYPE_MAP[selectedExamType];

        return base.map((s: any) => {
            const studentExams = allExams.filter((e: any) =>
                e.studentId === s.id &&
                (!arabicType || e.type === arabicType)
            );

            return {
                ...s,
                examsCount: studentExams.length,
                groupName: groups?.find((g: any) => g.id === s.groupId)?.name || 'غير محدد'
            };
        })
            .filter((s: any) => s.examsCount >= limit && s.examsCount > 0)
            .sort((a: any, b: any) => b.examsCount - a.examsCount)
            .map((s: any, i: number) => ({ ...s, rank: i + 1 }));
    }, [students, groups, allExams, selectedGroupId, selectedExamType, examsLimit, user, assignedGroupIds]);

    const performanceData = useMemo(() => {
        let baseGroups = (groups || []);
        if (user?.role === 'teacher') {
            baseGroups = baseGroups.filter((g: any) => assignedGroupIds.includes(g.id));
        }

        return baseGroups.map((g: any) => {
            const groupStudents = (students || []).filter((s: any) => s.groupId === g.id);
            const groupStudentIds = new Set(groupStudents.map((s: any) => s.id));

            const groupExams = allExams.filter((e: any) => groupStudentIds.has(e.studentId));

            return {
                id: g.id,
                name: g.name,
                total: groupExams.length,
                parts: {
                    new: groupExams.filter((e: any) => e.type === 'جديد').length,
                    near: groupExams.filter((e: any) => e.type === 'ماضي قريب').length,
                    far: groupExams.filter((e: any) => e.type === 'ماضي بعيد').length
                }
            };
        });
    }, [groups, students, allExams, user, assignedGroupIds]);

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24 text-right font-sans">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-4 md:px-6 py-4">
                <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-4 max-w-5xl mx-auto">
                    <div className="flex items-center justify-between w-full md:w-auto">
                        <h1 className="text-xl font-black text-gray-800">
                            تقارير الاختبارات <span className="md:inline hidden">({currentMonthLabel})</span>
                        </h1>
                        <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-full transition-colors order-first md:order-last">
                            <Bell size={20} />
                        </button>
                    </div>

                    <div className="flex bg-gray-100/50 p-1 rounded-2xl items-center gap-1 border border-gray-100 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className={cn(
                                "flex-1 md:flex-none px-4 md:px-6 py-2 rounded-xl md:rounded-[18px] text-[10px] md:text-xs font-bold transition-all whitespace-nowrap",
                                isCurrentMonth ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            الحالي
                        </button>

                        <div className="flex items-center gap-2 bg-white px-3 md:px-4 py-2 rounded-xl md:rounded-[18px] border border-gray-200 shadow-sm min-w-[120px] md:min-w-[150px] justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                            <Calendar size={12} className="text-blue-500" />
                            <span className="text-[10px] md:text-xs font-black text-gray-700 whitespace-nowrap">{monthLabelWithYear}</span>
                            <ChevronDown size={12} className="text-gray-400" />
                        </div>

                        <button
                            onClick={goToPreviousMonth}
                            className="flex items-center gap-1 md:gap-2 px-3 md:px-5 py-2 rounded-xl md:rounded-[18px] text-[10px] md:text-xs font-bold text-gray-400 hover:bg-white hover:text-gray-700 transition-all border border-transparent hover:border-gray-200 whitespace-nowrap"
                        >
                            <ChevronRight size={14} />
                            <span className="hidden md:inline">السابق</span>
                        </button>
                    </div>
                </div>


                {/* Tabs Navigation */}
                <div className="max-w-5xl mx-auto mt-6 flex bg-gray-100/80 p-1 rounded-2xl md:rounded-[22px] gap-1 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={cn(
                            "flex-1 min-w-[100px] py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap",
                            activeTab === 'performance' ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <TrendingUp size={16} />
                        مقارنة الأداء
                    </button>
                    <button
                        onClick={() => setActiveTab('mostTested')}
                        className={cn(
                            "flex-1 min-w-[100px] py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap",
                            activeTab === 'mostTested' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Trophy size={16} />
                        الأكثر اختباراً
                    </button>
                    <button
                        onClick={() => setActiveTab('notTested')}
                        className={cn(
                            "flex-1 min-w-[100px] py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap",
                            activeTab === 'notTested' ? "bg-white text-amber-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <AlertCircle size={16} />
                        لم يختبروا
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
                <AnimatePresence mode="wait">
                    {/* التبويب 1: لم يختبروا */}
                    {activeTab === 'notTested' && (
                        <motion.div
                            key="notTested"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-4">
                                <div className="flex flex-row-reverse items-center gap-2 md:gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:flex-none">
                                        <select
                                            value={selectedGroupId}
                                            onChange={(e) => setSelectedGroupId(e.target.value)}
                                            className="appearance-none bg-white border border-gray-100 px-8 py-2.5 pr-4 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/10 w-full md:min-w-[150px] text-right"
                                        >
                                            <option value="all">كل المجموعات</option>
                                            {filteredGroupsList?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                    <div className="relative flex-1 md:flex-none">
                                        <select
                                            value={selectedExamType}
                                            onChange={(e) => setSelectedExamType(e.target.value)}
                                            className="appearance-none bg-white border border-gray-100 px-8 py-2.5 pr-4 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/10 w-full md:min-w-[140px] text-right"
                                        >
                                            <option value="new">جديد</option>
                                            <option value="near">ماضي قريب</option>
                                            <option value="far">بعيد</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <h2 className="text-xl md:text-2xl font-black text-gray-800 w-full text-center md:text-right">لم يختبروا - {currentMonthLabel}</h2>
                            </div>

                            <div className="space-y-3">
                                {notTestedStudents.map((student: any) => (
                                    <div
                                        key={student.id}
                                        onClick={() => setSelectedStudentForDetails(student)}
                                        className="bg-white/60 hover:bg-white transition-all rounded-[28px] p-4 flex items-center justify-between border border-transparent hover:border-amber-100/50 group cursor-pointer"
                                    >
                                        <div className="flex flex-row-reverse items-center gap-4">
                                            <span className="text-base font-black text-gray-200 font-sans">{student.rank}.</span>
                                            <div className="w-11 h-11 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                                                <User size={22} />
                                            </div>
                                            <div className="text-right">
                                                <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors text-sm md:text-base">{student.fullName}</h3>
                                                <span className="text-[10px] md:text-xs text-gray-400 font-bold">{student.groupName}</span>
                                            </div>
                                        </div>

                                        <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-all">
                                            <ChevronRight size={20} className="rotate-0" />
                                        </button>
                                    </div>
                                ))}
                                {notTestedStudents.length === 0 && (
                                    <div className="text-center py-20 bg-white/40 rounded-[32px] border-2 border-dashed border-gray-100">
                                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Trophy size={32} />
                                        </div>
                                        <h3 className="text-lg font-black text-gray-800">ممتاز! الكل اختبروا</h3>
                                        <p className="text-sm text-gray-400 font-bold mt-1">جميع طلاب هذا الفلتر قد أتموا اختباراتهم لهذا الشهر</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* التبويب 2: الأكثر اختباراً */}
                    {activeTab === 'mostTested' && (
                        <motion.div
                            key="mostTested"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-4">
                                <div className="flex flex-row-reverse items-center gap-3 flex-wrap justify-center">
                                    <div className="relative">
                                        <select
                                            value={selectedGroupId}
                                            onChange={(e) => setSelectedGroupId(e.target.value)}
                                            className="appearance-none bg-white border border-gray-100 px-10 py-2.5 pr-4 rounded-2xl text-sm font-bold text-gray-600 focus:outline-none min-w-[140px] text-right"
                                        >
                                            <option value="all">كل المجموعات</option>
                                            {filteredGroupsList?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                        <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={selectedExamType}
                                            onChange={(e) => setSelectedExamType(e.target.value)}
                                            className="appearance-none bg-white border border-gray-100 px-10 py-2.5 pr-4 rounded-2xl text-sm font-bold text-gray-600 focus:outline-none min-w-[120px] text-right"
                                        >
                                            <option value="all">كل الأنواع</option>
                                            <option value="new">جديد</option>
                                            <option value="near">ماضي قريب</option>
                                            <option value="far">بعيد</option>
                                        </select>
                                        <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <div className="flex flex-row-reverse items-center bg-white border border-gray-100 px-3 py-1.5 rounded-2xl gap-2">
                                        <span className="text-xs font-bold text-gray-400">على الأقل:</span>
                                        <input
                                            type="number"
                                            value={examsLimit}
                                            onChange={(e) => setExamsLimit(e.target.value)}
                                            className="w-10 h-8 bg-gray-50 rounded-lg text-center font-black text-blue-600 border-none focus:outline-none"
                                        />
                                        <span className="text-xs font-bold text-gray-400">اختبار</span>
                                    </div>
                                </div>
                                <h2 className="text-2xl font-black text-gray-800">الأكثر اختباراً - {currentMonthLabel}</h2>
                            </div>

                            <div className="space-y-3">
                                {mostTestedStudents.map((student: any) => (
                                    <div
                                        key={student.id}
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).closest('.wa-btn')) return;
                                            setSelectedStudentForDetails(student);
                                        }}
                                        className="bg-white/60 hover:bg-white transition-all rounded-[32px] p-4 flex items-center justify-between border border-transparent hover:border-blue-100/50 group cursor-pointer"
                                    >
                                        <div className="flex flex-row-reverse items-center gap-3 md:gap-4 overflow-hidden">
                                            <span className="text-base font-black text-gray-200 font-sans shrink-0">{student.rank}.</span>
                                            <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                                                <User size={22} />
                                            </div>
                                            <div className="text-right overflow-hidden">
                                                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm md:text-base truncate">{student.fullName}</h3>
                                                <span className="text-[10px] md:text-xs text-gray-400 font-bold truncate block">{student.groupName}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-row-reverse items-center gap-2">
                                            <div className="bg-blue-50 px-3 py-1.5 rounded-2xl flex flex-row-reverse items-center gap-2">
                                                <span className="text-blue-600 font-black text-xs md:text-sm font-sans">{student.examsCount}</span>
                                                <span className="text-[9px] md:text-[10px] text-blue-400 font-bold uppercase whitespace-nowrap">اختبار</span>
                                            </div>
                                            <button
                                                onClick={() => setSelectedStudentForDetails(student)}
                                                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all"
                                            >
                                                <ChevronRight size={20} className="rotate-0" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* التبويب 3: مقارنة الأداء */}
                    {activeTab === 'performance' && (
                        <motion.div
                            key="performance"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-4">
                                <button className="flex flex-row-reverse items-center gap-2 bg-blue-50 text-blue-600 px-5 py-2.5 rounded-[22px] text-sm font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                    <Share2 size={18} />
                                    مشاركة التقرير
                                </button>
                                <h2 className="text-2xl font-black text-gray-800">مقارنة الأداء - {currentMonthLabel}</h2>
                            </div>

                            {/* Legend - Interactive Filters */}
                            <div className="flex flex-wrap items-center justify-center gap-6 py-4 border-y border-gray-100 flex-row-reverse">
                                <button
                                    onClick={() => setPerformanceFilter('all')}
                                    className={cn(
                                        "flex flex-row-reverse items-center gap-3 px-4 py-2 rounded-2xl transition-all",
                                        performanceFilter === 'all' ? "bg-blue-600 text-white shadow-md shadow-blue-200 scale-105" : "text-gray-400 hover:bg-gray-100"
                                    )}
                                >
                                    <span className="text-sm font-black uppercase">الكل</span>
                                    <div className={cn("w-6 h-6 rounded-lg", performanceFilter === 'all' ? "bg-white/20" : "bg-blue-600")} />
                                </button>

                                <button
                                    onClick={() => setPerformanceFilter('new')}
                                    className={cn(
                                        "flex flex-row-reverse items-center gap-3 px-4 py-2 rounded-2xl transition-all",
                                        performanceFilter === 'new' ? "bg-green-500 text-white shadow-md shadow-green-100 scale-105" : "text-gray-400 hover:bg-gray-100"
                                    )}
                                >
                                    <span className="text-sm font-black uppercase">جديد</span>
                                    <div className={cn("w-3 h-3 rounded-full", performanceFilter === 'new' ? "bg-white" : "bg-green-500")} />
                                </button>

                                <button
                                    onClick={() => setPerformanceFilter('near')}
                                    className={cn(
                                        "flex flex-row-reverse items-center gap-3 px-4 py-2 rounded-2xl transition-all",
                                        performanceFilter === 'near' ? "bg-blue-500 text-white shadow-md shadow-blue-100 scale-105" : "text-gray-400 hover:bg-gray-100"
                                    )}
                                >
                                    <span className="text-sm font-black uppercase">ماضي قريب</span>
                                    <div className={cn("w-3 h-3 rounded-full", performanceFilter === 'near' ? "bg-white" : "bg-blue-500")} />
                                </button>

                                <button
                                    onClick={() => setPerformanceFilter('far')}
                                    className={cn(
                                        "flex flex-row-reverse items-center gap-3 px-4 py-2 rounded-2xl transition-all",
                                        performanceFilter === 'far' ? "bg-purple-500 text-white shadow-md shadow-purple-100 scale-105" : "text-gray-400 hover:bg-gray-100"
                                    )}
                                >
                                    <span className="text-sm font-black uppercase">بعيد</span>
                                    <div className={cn("w-3 h-3 rounded-full", performanceFilter === 'far' ? "bg-white" : "bg-purple-500")} />
                                </button>
                            </div>

                            {/* Charts */}
                            <div className="space-y-6">
                                {(() => {
                                    // حساب القيمة القصوى للمقارنة النسبية بين المجموعات
                                    const maxVal = Math.max(...performanceData.map((d: any) => {
                                        if (performanceFilter === 'all') return d.total || 1;
                                        if (performanceFilter === 'new') return d.parts.new;
                                        if (performanceFilter === 'near') return d.parts.near;
                                        return d.parts.far;
                                    }), 1);

                                    return performanceData.map((data: any) => {
                                        const currentVal = performanceFilter === 'all' ? data.total : (data.parts as any)[performanceFilter];
                                        const overallWidth = `${(currentVal / maxVal) * 100}%`;

                                        return (
                                            <div key={data.id} className="space-y-2">
                                                <div className="flex flex-row-reverse items-center justify-between px-1">
                                                    <span className="text-sm font-bold text-gray-700">{data.name}</span>
                                                    <span className="text-xs font-black text-gray-400 font-sans">{currentVal}</span>
                                                </div>
                                                <div className="h-6 w-full flex flex-row-reverse">
                                                    <motion.div
                                                        layout
                                                        initial={{ width: 0 }}
                                                        animate={{ width: overallWidth }}
                                                        className="h-full bg-gray-100 rounded-full overflow-hidden flex flex-row-reverse shadow-inner"
                                                    >
                                                        {(performanceFilter === 'all' || performanceFilter === 'new') && (
                                                            <motion.div
                                                                layout
                                                                initial={{ width: 0 }}
                                                                animate={{ width: performanceFilter === 'all' ? `${(data.parts.new / (data.total || 1)) * 100}%` : '100%' }}
                                                                className="bg-green-500 h-full relative group cursor-pointer border-l border-white/10"
                                                            >
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <span className="text-[10px] font-black text-white">{data.parts.new}</span>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                        {(performanceFilter === 'all' || performanceFilter === 'near') && (
                                                            <motion.div
                                                                layout
                                                                initial={{ width: 0 }}
                                                                animate={{ width: performanceFilter === 'all' ? `${(data.parts.near / (data.total || 1)) * 100}%` : '100%' }}
                                                                className="bg-blue-500 h-full border-l border-white/10 relative group cursor-pointer"
                                                            >
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <span className="text-[10px] font-black text-white">{data.parts.near}</span>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                        {(performanceFilter === 'all' || performanceFilter === 'far') && (
                                                            <motion.div
                                                                layout
                                                                initial={{ width: 0 }}
                                                                animate={{ width: performanceFilter === 'all' ? `${(data.parts.far / (data.total || 1)) * 100}%` : '100%' }}
                                                                className="bg-purple-500 h-full border-l border-white/10 relative group cursor-pointer"
                                                            >
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <span className="text-[10px] font-black text-white">{data.parts.far}</span>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </motion.div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {selectedStudentForDetails && (
                    <StudentDetailModal
                        isOpen={!!selectedStudentForDetails}
                        student={selectedStudentForDetails}
                        onClose={() => setSelectedStudentForDetails(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

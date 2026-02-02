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
    LayoutGrid,
    Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// --- استيراد الـ Hooks والـ Stores الخاصة بالتطبيق ---
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { useAuthStore } from '@/store/useAuthStore';
import StudentDetailModal from '@/features/students/components/StudentDetailModal';
import { useAllExams } from '@/features/students/hooks/useAllExams';

// --- تعريف الأنواع والقواميس المساعدة ---
type TabType = 'notTested' | 'mostTested' | 'performance' | 'cycle';

const EXAM_TYPE_MAP: Record<string, string> = {
    'new': 'جديد',
    'near': 'ماضي قريب',
    'far': 'ماضي بعيد'
};

export default function ExamsReportPage() {
    // --- 1. جلب البيانات الأساسية من الـ Hooks ---
    const { data: students } = useStudents();
    const { data: groups } = useGroups();
    const { data: teachers } = useTeachers();
    const { user } = useAuthStore();

    // --- 2. إعدادات الفلترة والأذونات ---
    // إذا كان المستخدم "مدرس"، نقوم بتصفية المجموعات لتظهر مجموعاته فقط
    const filteredGroupsList = groups?.filter((g: any) => {
        if (user?.role === 'teacher') return g.teacherId === user.teacherId;
        if (user?.role === 'supervisor') {
            const sections = user.responsibleSections || [];
            return sections.some(section => g.name.includes(section));
        }
        return true;
    }) || [];
    const assignedGroupIds = filteredGroupsList.map((g: any) => g.id);

    // --- 3. حالات الصفحة (State Management) ---
    const [activeTab, setActiveTab] = useState<TabType>('cycle'); // التبويب النشط
    const [selectedGroupId, setSelectedGroupId] = useState('all'); // المجموعة المختارة للفلترة
    const [selectedExamType, setSelectedExamType] = useState('new'); // نوع الاختبار (جديد، قريب، بعيد)
    const [examsLimit, setExamsLimit] = useState('1'); // الحد الأدنى للاختبارات (لتبويب الأكثر اختباراً)
    const [performanceFilter, setPerformanceFilter] = useState<'all' | 'new' | 'near' | 'far'>('all'); // فلتر تبويب الأداء

    // --- 4. إدارة الوقت والتاريخ ---
    const [selectedDate, setSelectedDate] = useState(new Date()); // التاريخ المختار للتقارير الشهرية
    const [viewDate, setViewDate] = useState(new Date()); // التاريخ المختار لتبويب "الدورة" اليومي
    const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any>(null); // الطالب المختار لعرض تفاصيله
    const [postponedStudentIds, setPostponedStudentIds] = useState<string[]>([]); // قائمة الطلاب المؤجلين ليوم الأربعاء

    // تحويل التاريخ إلى مفتاح (مثل 2023-10) لجلب بيانات الاختبارات من السيرفر
    const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    const { data: allExams = [] } = useAllExams(monthKey);

    // تسميات الشهور باللغة العربية
    const currentMonthLabel = selectedDate.toLocaleDateString('ar-EG', { month: 'long' });
    const monthLabelWithYear = selectedDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

    // التنقل بين الشهور
    const goToPreviousMonth = () => {
        const d = new Date(selectedDate);
        d.setMonth(d.getMonth() - 1);
        setSelectedDate(d);
    };

    const isCurrentMonth = useMemo(() => {
        const now = new Date();
        return now.getMonth() === selectedDate.getMonth() && now.getFullYear() === selectedDate.getFullYear();
    }, [selectedDate]);

    // --- 5. منطق حساب البيانات (Business Logic) باستخدام useMemo لتحسين الأداء ---

    // أ- حساب الطلاب الذين "لم يختبروا" هذا الشهر بناءً على الفلاتر
    const notTestedStudents = useMemo(() => {
        let base = (students || []).filter((s: any) => s.status === 'active');

        if (selectedGroupId !== 'all') {
            base = base.filter((s: any) => s.groupId === selectedGroupId);
        } else if (user?.role === 'teacher' || user?.role === 'supervisor') {
            base = base.filter((s: any) => s.groupId && assignedGroupIds.includes(s.groupId));
        }

        const arabicType = EXAM_TYPE_MAP[selectedExamType] || 'جديد';
        const testedInMonthIds = new Set(
            allExams
                .filter((e: any) => e.type === arabicType)
                .map((e: any) => e.studentId)
        );

        return base
            .filter((s: any) => !testedInMonthIds.has(s.id))
            .map((s: any, i: number) => ({
                ...s,
                rank: i + 1,
                groupName: groups?.find((g: any) => g.id === s.groupId)?.name || 'غير محدد'
            }));
    }, [students, groups, allExams, selectedGroupId, selectedExamType, user, assignedGroupIds]);

    // ب- حساب الطلاب "الأكثر اختباراً" بناءً على عدد مرات الاختبار
    const mostTestedStudents = useMemo(() => {
        let base = (students || []).filter((s: any) => s.status === 'active');

        if (selectedGroupId !== 'all') {
            base = base.filter((s: any) => s.groupId === selectedGroupId);
        } else if (user?.role === 'teacher' || user?.role === 'supervisor') {
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

    // ج- تجميع بيانات الأداء لكل مجموعة (إحصائيات الرسوم البيانية)
    const performanceData = useMemo(() => {
        let baseGroups = (groups || []);
        if (user?.role === 'teacher' || user?.role === 'supervisor') {
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
        <div className="min-h-screen bg-gray-50/50 pb-24 text-right font-sans" dir="rtl">

            {/* --- الهيدر (رأس الصفحة) --- */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-4 md:px-6 py-3">
                <div className="flex items-center justify-between max-w-5xl mx-auto gap-4">
                    <h1 className="text-lg font-black text-gray-800">
                        تقارير الاختبارات <span className="md:inline hidden">({currentMonthLabel})</span>
                    </h1>

                    {/* زر اختيار الشهر */}
                    <div className="flex bg-gray-100/50 p-1 rounded-xl items-center gap-1 border border-gray-100">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm justify-center cursor-pointer" onClick={goToPreviousMonth}>
                            <Calendar size={12} className="text-blue-500" />
                            <span className="text-xs font-black text-gray-700">{monthLabelWithYear}</span>
                        </div>
                    </div>
                </div>

                {/* --- شريط التنقل بين التبويبات --- */}
                <div className="max-w-5xl mx-auto mt-4 flex bg-gray-100/80 p-1 rounded-xl gap-1 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('cycle')}
                        className={cn(
                            "flex-1 min-w-[90px] py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
                            activeTab === 'cycle' ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Calendar size={14} />
                        الدورة
                    </button>
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={cn(
                            "flex-1 min-w-[90px] py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
                            activeTab === 'performance' ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <TrendingUp size={14} />
                        الأداء
                    </button>
                    <button
                        onClick={() => setActiveTab('mostTested')}
                        className={cn(
                            "flex-1 min-w-[90px] py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
                            activeTab === 'mostTested' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Trophy size={14} />
                        الأكثر
                    </button>
                    <button
                        onClick={() => setActiveTab('notTested')}
                        className={cn(
                            "flex-1 min-w-[90px] py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
                            activeTab === 'notTested' ? "bg-white text-amber-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <AlertCircle size={14} />
                        لم يختبروا
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
                <AnimatePresence mode="wait">

                    {/* --- التبويب 1: قائمة الطلاب الذين لم يختبروا (الباقي) --- */}
                    {activeTab === 'notTested' && (
                        <motion.div
                            key="notTested"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-4">
                                <div className="flex flex-row-reverse items-center gap-2 md:gap-3 w-full md:w-auto">
                                    {/* فلتر المجموعة ونوع الاختبار */}
                                    <div className="relative flex-1 md:flex-none">
                                        <select
                                            value={selectedGroupId}
                                            onChange={(e) => setSelectedGroupId(e.target.value)}
                                            className="appearance-none bg-white border border-gray-100 px-8 py-3 pr-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-gray-600 focus:outline-none w-full md:min-w-[150px] text-right"
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
                                            className="appearance-none bg-white border border-gray-100 px-8 py-3 pr-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-gray-600 focus:outline-none w-full md:min-w-[140px] text-right"
                                        >
                                            <option value="new">جديد</option>
                                            <option value="near">ماضي قريب</option>
                                            <option value="far">بعيد</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {notTestedStudents.map((student: any) => (
                                    <div
                                        key={student.id}
                                        onClick={() => setSelectedStudentForDetails(student)}
                                        className="bg-white rounded-[20px] p-3 flex items-center justify-between border border-gray-100 shadow-sm group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                                                <User size={18} />
                                            </div>
                                            <div className="text-right">
                                                <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors text-base">{student.fullName}</h3>
                                                <span className="text-xs text-gray-400 font-bold">{student.groupName}</span>
                                            </div>
                                        </div>
                                        <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                ))}
                                {/* حالة عدم وجود طلاب (الكل اختبر) */}
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

                    {/* --- التبويب 2: الطلاب الأكثر اختباراً --- */}
                    {activeTab === 'mostTested' && (
                        <motion.div
                            key="mostTested"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-4">
                                <div className="flex flex-row-reverse items-center gap-3 flex-wrap justify-center">
                                    {/* فلاتر إضافية للعدد الأدنى والمجموعة */}
                                    <div className="relative">
                                        <select
                                            value={selectedGroupId}
                                            onChange={(e) => setSelectedGroupId(e.target.value)}
                                            className="appearance-none bg-white border border-gray-100 px-10 py-2.5 pr-4 rounded-2xl text-sm font-bold text-gray-600 focus:outline-none min-w-[140px] text-right"
                                        >
                                            <option value="all"> المجموعات</option>
                                            {filteredGroupsList?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                        <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <div className="flex flex-row-reverse items-center bg-white border border-gray-100 px-3 py-1.5 rounded-2xl gap-2">
                                        <span className="text-xs font-bold text-gray-400"> الأقل:</span>
                                        <input
                                            type="number"
                                            value={examsLimit}
                                            onChange={(e) => setExamsLimit(e.target.value)}
                                            className="w-10 h-8 bg-gray-50 rounded-lg text-center font-black text-blue-600 border-none focus:outline-none"
                                        />
                                        <span className="text-xs font-bold text-gray-400">اختبار</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {mostTestedStudents.map((student: any) => (
                                    <div
                                        key={student.id}
                                        onClick={() => setSelectedStudentForDetails(student)}
                                        className="bg-white rounded-[20px] p-3 flex items-center justify-between border border-gray-100 shadow-sm group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                                <User size={18} />
                                            </div>
                                            <div className="text-right overflow-hidden">
                                                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-base truncate">{student.fullName}</h3>
                                                <span className="text-xs text-gray-400 font-bold truncate block">{student.groupName}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                                <span className="text-blue-600 font-black text-sm font-sans">{student.examsCount}</span>
                                                <span className="text-xs text-blue-400 font-bold">اختبار</span>
                                            </div>
                                            <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* --- التبويب 3: جدول الدورة والاختبارات المجدولة --- */}
                    {activeTab === 'cycle' && (
                        <motion.div
                            key="cycle"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {(() => {
                                // حساب منطق "الدورة": توزيع الطلاب على أيام الأسبوع (السبت - الأربعاء)
                                const jsDay = viewDate.getDay();
                                const dayMap: Record<number, number> = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4 }; // السبت=0 ... الأربعاء=4
                                const dayIndex = dayMap[jsDay] ?? -1;

                                // تصفية الطلاب النشطين حسب المعلم/المجموعة
                                const base = (students || [])
                                    .filter((s: any) => s.status === 'active')
                                    .filter((s: any) => {
                                        if (selectedGroupId !== 'all') return s.groupId === selectedGroupId;
                                        if (user?.role === 'teacher' || user?.role === 'supervisor') return assignedGroupIds.includes(s.groupId);
                                        return true;
                                    })
                                    .sort((a, b) => {
                                        const gA = groups?.find(g => g.id === a.groupId)?.name || '';
                                        const gB = groups?.find(g => g.id === b.groupId)?.name || '';
                                        if (gA !== gB) return gA.localeCompare(gB, 'ar');
                                        return a.fullName.localeCompare(b.fullName, 'ar');
                                    });

                                // حساب مؤشر البداية لكل يوم (لضمان تدوير الطلاب بشكل عادل كل أسبوعين)
                                const weekIndex = Math.floor((viewDate.getDate() - 1) / 7) % 2;
                                const startIndex = (weekIndex * 20) + (Math.max(0, dayIndex) * 5);

                                // تجميع الطلاب في هيكل بيانات حسب مجموعاتهم
                                const studentsByGroup: { groupId: string, name: string, students: any[] }[] = [];
                                if (dayIndex !== -1 && dayIndex !== 4) {
                                    base.forEach(s => {
                                        const gid = s.groupId || 'unknown';
                                        let groupObj = studentsByGroup.find(g => g.groupId === gid);
                                        if (!groupObj) {
                                            const groupName = groups?.find(g => g.id === gid)?.name || 'غير محدد';
                                            groupObj = { groupId: gid, name: groupName, students: [] };
                                            studentsByGroup.push(groupObj);
                                        }
                                        groupObj.students.push(s);
                                    });
                                }

                                // حساب عدد الطلاب المجدولين لليوم المختار
                                let totalScheduled = 0;
                                if (dayIndex === 4) {
                                    totalScheduled = base.filter(s => postponedStudentIds.includes(s.id)).length;
                                } else if (dayIndex !== -1) {
                                    totalScheduled = studentsByGroup.reduce((sum, g) => {
                                        const groupStart = startIndex % g.students.length;
                                        const groupScheduled = g.students.slice(groupStart, groupStart + 5);
                                        return sum + groupScheduled.filter(s => !postponedStudentIds.includes(s.id)).length;
                                    }, 0);
                                }

                                return (
                                    <div className="space-y-6">
                                        {/* التحكم في التنقل اليومي داخل الدورة */}
                                        <div className="flex items-center justify-between gap-2 px-1">
                                            <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-100 shadow-sm shrink-0 scale-95 origin-right">
                                                <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d); }} className="w-8 h-8 flex items-center justify-center text-gray-400"><ChevronRight className="rotate-180" size={18} /></button>
                                                <div className="px-2 py-0.5 text-center min-w-[100px]">
                                                    <p className="text-[9px] font-black text-blue-600 uppercase">{viewDate.toLocaleDateString('ar-EG', { weekday: 'long' })}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{viewDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</p>
                                                </div>
                                                <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d); }} className="w-8 h-8 flex items-center justify-center text-gray-400"><ChevronRight size={18} /></button>
                                            </div>

                                            <span className="text-[14px] font-black text-blue-600 bg-blue-50 px-2 py-2 rounded-full shadow-sm uppercase shrink-0">
                                                {dayIndex === -1 ? 'عطلة الأسبوع' : (dayIndex === 4 ? `الاستدراك (${totalScheduled})` : `قائمة اليوم (${totalScheduled})`)}
                                            </span>
                                        </div>

                                        {/* --- عرض المحتوى حسب اليوم --- */}
                                        {dayIndex === -1 ? (
                                            /* 1. عرض حالة العطلة (الخميس والجمعة) */
                                            <div className="text-center py-20 bg-white/40 rounded-[32px] border-2 border-dashed border-gray-100">
                                                <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Calendar size={32} />
                                                </div>
                                                <h3 className="text-lg font-black text-gray-800">عطلة نهاية الأسبوع</h3>
                                                <p className="text-sm text-gray-400 font-bold mt-1">لا توجد اختبارات مبرمجة ليومي الخميس والجمعة</p>
                                            </div>
                                        ) : dayIndex === 4 ? (
                                            /* 2. عرض يوم الاستدراك (الأربعاء) للطلاب الذين تم تأجيلهم */
                                            <div className="space-y-4">
                                                <div className="bg-orange-50 p-6 rounded-[28px] border border-orange-100 text-center">
                                                    <h3 className="text-orange-700 font-black text-lg">يوم الاستدراك</h3>
                                                    <p className="text-orange-600/70 text-sm font-bold mt-1">الطلاب المؤجلون من هذا الأسبوع</p>
                                                </div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {base.filter(s => postponedStudentIds.includes(s.id)).map((student: any) => (
                                                        <div key={student.id} className="bg-white rounded-[24px] p-4 flex items-center justify-between border border-gray-100 shadow-sm">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 font-black text-lg shrink-0">
                                                                    <AlertCircle size={24} />
                                                                </div>
                                                                <div className="text-right">
                                                                    <h3 className="font-bold text-gray-900 text-base">{student.fullName}</h3>
                                                                    <p className="text-xs text-gray-400 font-bold">{groups?.find(g => g.id === student.groupId)?.name}</p>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => setSelectedStudentForDetails(student)} className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20"><ChevronRight size={18} /></button>
                                                        </div>
                                                    ))}
                                                    {totalScheduled === 0 && <div className="text-center py-10 text-gray-400 font-bold border-2 border-dashed border-gray-50 rounded-[32px]">لا يوجد طلاب مؤجلون حالياً</div>}
                                                </div>
                                            </div>
                                        ) : (
                                            /* 3. عرض القائمة العادية لباقي أيام الأسبوع */
                                            <div className="space-y-8">
                                                {studentsByGroup.map((group) => {
                                                    const groupStart = startIndex % group.students.length;
                                                    const scheduledInGroup = group.students.slice(groupStart, groupStart + 5)
                                                        .filter(s => !postponedStudentIds.includes(s.id));

                                                    if (scheduledInGroup.length === 0) return null;

                                                    return (
                                                        <div key={group.groupId} className="space-y-3">
                                                            <div className="flex items-center gap-3 px-1">
                                                                <div className="h-px bg-gray-200 flex-1" />
                                                                <h4 className="text-[10px] font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-2">
                                                                    <LayoutGrid size={10} /> مجموعة: {group.name}
                                                                </h4>
                                                                <div className="h-px bg-gray-200 flex-1" />
                                                            </div>

                                                            <div className="grid grid-cols-1 gap-3">
                                                                {scheduledInGroup.map((student: any) => (
                                                                    <div key={student.id} className="bg-white rounded-[24px] p-4 flex items-center justify-between border border-gray-100 shadow-sm hover:border-blue-200 transition-all group overflow-hidden relative">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-12 h-12 bg-blue-50/50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-lg shrink-0 font-sans">
                                                                                {group.students.indexOf(student) + 1}
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <h3 className="font-bold text-gray-900 text-base">{student.fullName}</h3>
                                                                                <p className="text-xs text-gray-400 font-bold">{group.name}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            {/* زر التأجيل للمدرس فقط */}
                                                                            {user?.role === 'teacher' && (
                                                                                <button
                                                                                    className="text-[10px] font-black bg-gray-50 text-gray-400 px-3 py-2 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all border border-transparent hover:border-orange-100"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setPostponedStudentIds(prev => [...prev, student.id]);
                                                                                    }}
                                                                                >
                                                                                    تأجيل للأربعاء
                                                                                </button>
                                                                            )}
                                                                            <button onClick={() => setSelectedStudentForDetails(student)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                                                <ChevronRight size={18} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </motion.div>
                    )}

                    {/* --- التبويب 4: مقارنة أداء المجموعات --- */}
                    {activeTab === 'performance' && (
                        <motion.div
                            key="performance"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            {/* شريط الفلاتر التفاعلي لتبويب الأداء */}
                            <div className="flex flex-wrap items-center justify-center gap-6 py-4 border-y border-gray-100 flex-row-reverse">
                                <button
                                    onClick={() => setPerformanceFilter('all')}
                                    className={cn("flex flex-row-reverse items-center gap-3 px-4 py-2 rounded-2xl transition-all", performanceFilter === 'all' ? "bg-blue-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-100")}
                                >
                                    <span className="text-sm font-black uppercase">الكل</span>
                                    <div className={cn("w-2 h-2 rounded-lg", performanceFilter === 'all' ? "bg-white/20" : "bg-blue-600")} />
                                </button>
                                <button
                                    onClick={() => setPerformanceFilter('new')}
                                    className={cn("flex flex-row-reverse items-center gap-3 px-4 py-2 rounded-2xl transition-all", performanceFilter === 'new' ? "bg-green-500 text-white shadow-md" : "text-gray-400 hover:bg-gray-100")}
                                >
                                    <span className="text-sm font-black uppercase">جديد</span>
                                    <div className={cn("w-2 h-2 rounded-full", performanceFilter === 'new' ? "bg-white" : "bg-green-500")} />
                                </button>
                                <button
                                    onClick={() => setPerformanceFilter('near')}
                                    className={cn("flex flex-row-reverse items-center gap-3 px-4 py-2 rounded-2xl transition-all", performanceFilter === 'near' ? "bg-blue-500 text-white shadow-md" : "text-gray-400 hover:bg-gray-100")}
                                >
                                    <span className="text-sm font-black uppercase">ماضي قريب</span>
                                    <div className={cn("w-2 h-2 rounded-full", performanceFilter === 'near' ? "bg-white" : "bg-blue-500")} />
                                </button>
                                <button
                                    onClick={() => setPerformanceFilter('far')}
                                    className={cn("flex flex-row-reverse items-center gap-3 px-4 py-2 rounded-2xl transition-all", performanceFilter === 'far' ? "bg-purple-500 text-white shadow-md" : "text-gray-400 hover:bg-gray-100")}
                                >
                                    <span className="text-sm font-black uppercase">بعيد</span>
                                    <div className={cn("w-2 h-2 rounded-full", performanceFilter === 'far' ? "bg-white" : "bg-purple-500")} />
                                </button>
                            </div>

                            {/* الرسوم البيانية (أشرطة التقدم) */}
                            <div className="space-y-6">
                                {(() => {
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
                                                    <motion.div layout initial={{ width: 0 }} animate={{ width: overallWidth }} className="h-full bg-gray-100 rounded-full overflow-hidden flex flex-row-reverse shadow-inner">
                                                        {(performanceFilter === 'all' || performanceFilter === 'new') && (
                                                            <motion.div layout initial={{ width: 0 }} animate={{ width: performanceFilter === 'all' ? `${(data.parts.new / (data.total || 1)) * 100}%` : '100%' }} className="bg-green-500 h-full relative group cursor-pointer border-l border-white/10" />
                                                        )}
                                                        {(performanceFilter === 'all' || performanceFilter === 'near') && (
                                                            <motion.div layout initial={{ width: 0 }} animate={{ width: performanceFilter === 'all' ? `${(data.parts.near / (data.total || 1)) * 100}%` : '100%' }} className="bg-blue-500 h-full border-l border-white/10 relative group cursor-pointer" />
                                                        )}
                                                        {(performanceFilter === 'all' || performanceFilter === 'far') && (
                                                            <motion.div layout initial={{ width: 0 }} animate={{ width: performanceFilter === 'all' ? `${(data.parts.far / (data.total || 1)) * 100}%` : '100%' }} className="bg-purple-500 h-full border-l border-white/10 relative group cursor-pointer" />
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

            {/* --- مودال تفاصيل الطالب (يظهر عند النقر على أي طالب) --- */}
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
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

// --- استيراد الـ Hooks والـ Stores الخاصة بالتطبيق ---
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { useAuthStore } from '@/store/useAuthStore';
import StudentDetailModal from '@/features/students/components/StudentDetailModal';
import { useAllExams } from '@/features/students/hooks/useAllExams';

// --- تعريف الأنواع والقواميس المساعدة ---
type TabType = 'notTested' | 'mostTested' | 'performance';

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
    const [activeTab, setActiveTab] = useState<TabType>('performance'); // التبويب النشط
    const [selectedGroupId, setSelectedGroupId] = useState('all'); // المجموعة المختارة للفلترة
    const [selectedExamType, setSelectedExamType] = useState('new'); // نوع الاختبار (جديد، قريب، بعيد)
    const [examsLimit, setExamsLimit] = useState('1'); // الحد الأدنى للاختبارات (لتبويب الأكثر اختباراً)
    const [performanceFilter, setPerformanceFilter] = useState<'all' | 'new' | 'near' | 'far'>('all'); // فلتر تبويب الأداء

    const [selectedRemainingCount, setSelectedRemainingCount] = useState('all'); // فلتر عدد الاختبارات المتبقية (3، 2، 1)

    // --- 4. إدارة الوقت والتاريخ ---
    const [selectedDate, setSelectedDate] = useState(new Date()); // التاريخ المختار للتقارير الشهرية
    const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any>(null); // الطالب المختار لعرض تفاصيله

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

        const selectedArabicType = EXAM_TYPE_MAP[selectedExamType] || 'جديد';

        return base
            .map((s: any) => {
                const groupName = groups?.find((g: any) => g.id === s.groupId)?.name || 'غير محدد';

                // تحديد عدد الاختبارات المطلوبة حسب نوع المجموعة
                // تلقين/نور بيان: 2، قرآن (الافتراضي): 3
                const isReducedReq = groupName.includes('تلقين') || groupName.includes('نور بيان');
                const requiredCount = isReducedReq ? 2 : 3;

                // جلب اختبارات الطالب لهذا الشهر
                const studentExams = allExams.filter((e: any) => e.studentId === s.id);

                // حساب الأنواع الفريدة التي اختبرها الطالب (مثلاً: جديد، ماضي قريب)
                // إذا اختبر مرتين "جديد" تحسب مرة واحدة
                const completedTypes = Array.from(new Set(studentExams.map((e: any) => e.type)));

                // هل اختبر النوع المحدد في الفلتر؟
                const hasDoneSelected = completedTypes.includes(selectedArabicType);

                // هل استوفى النصاب المطلوب؟
                const hasMetQuota = completedTypes.length >= requiredCount;

                // عدد الاختبارات المتبقية
                const remainingCount = Math.max(0, requiredCount - completedTypes.length);

                return {
                    ...s,
                    groupName,
                    completedTypes,
                    hasDoneSelected,
                    hasMetQuota,
                    remainingCount
                };
            })
            .filter((s: any) => {
                // فلتر العدد المتبقي إذا كان محدداً
                if (selectedRemainingCount !== 'all' && s.remainingCount !== parseInt(selectedRemainingCount)) {
                    return false;
                }

                // يظهر الطالب إذا:
                // 1. لم يختبر النوع المختار حالياً
                // 2. ولم يستوف النصاب الكلي المطلوب منه بعد
                return !s.hasDoneSelected && !s.hasMetQuota;
            })
            .map((s: any, i: number) => ({
                ...s,
                rank: i + 1,
                // تنسيق العرض: محمد أحمد (جديد، ماضي قريب)
                completedDisplay: s.completedTypes.length > 0 ? `(${s.completedTypes.join(' - ')})` : ''
            }));
    }, [students, groups, allExams, selectedGroupId, selectedExamType, selectedRemainingCount, user, assignedGroupIds]);

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
                                            value={selectedRemainingCount}
                                            onChange={(e) => setSelectedRemainingCount(e.target.value)}
                                            className="appearance-none bg-white border border-gray-100 px-8 py-3 pr-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-gray-600 focus:outline-none w-full md:min-w-[120px] text-right"
                                        >
                                            <option value="all">الكل (بقي له)</option>
                                            <option value="3">بقي له 3</option>
                                            <option value="2">بقي له 2</option>
                                            <option value="1">بقي له 1</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
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
                                                <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors text-base">
                                                    {student.fullName}
                                                    {student.completedDisplay && <span className="text-xs text-amber-600/70 mr-2 font-normal">{student.completedDisplay}</span>}
                                                </h3>
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
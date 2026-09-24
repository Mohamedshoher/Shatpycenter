"use client";

import { useState, useMemo } from 'react';
import Trophy from 'lucide-react/dist/esm/icons/trophy'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import Bell from 'lucide-react/dist/esm/icons/bell'
import Share2 from 'lucide-react/dist/esm/icons/share-2'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import User from 'lucide-react/dist/esm/icons/user'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import { cn, getWhatsAppUrl } from '@/lib/utils';
import { FadeIn } from '@/components/ui/transition';

// --- استيراد الـ Hooks والـ Stores الخاصة بالتطبيق ---
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { useAuthStore } from '@/store/useAuthStore';

import dynamic from 'next/dynamic';
import { useAllExams } from '@/features/students/hooks/useAllExams';

const StudentDetailModal = dynamic(() => import('@/features/students/components/StudentDetailModal'), { ssr: false });

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
    const relevantStudentIds = useMemo(() => {
        if (!students || user?.role === 'director') return undefined;
        return students.filter(s => s.groupId && assignedGroupIds.includes(s.groupId)).map(s => s.id);
    }, [students, assignedGroupIds, user?.role]);

    // --- 3. حالات الصفحة (State Management) ---
    const [activeTab, setActiveTab] = useState<TabType>('performance'); // التبويب النشط
    const [selectedGroupId, setSelectedGroupId] = useState('all'); // المجموعة المختارة للفلترة
    const [selectedExamType, setSelectedExamType] = useState('new'); // نوع الاختبار (جديد، قريب، بعيد)
    const [examsLimit, setExamsLimit] = useState('1'); // الحد الأدنى للاختبارات (لتبويب الأكثر اختباراً)
    const [performanceFilter, setPerformanceFilter] = useState<'all' | 'new' | 'near' | 'far'>('all'); // فلتر تبويب الأداء
    const [performanceTypeFilter, setPerformanceTypeFilter] = useState<'all' | 'quran' | 'talqeen' | 'noor'>('all'); // فلتر نوع المجموعة

    const [selectedRemainingCount, setSelectedRemainingCount] = useState('all'); // فلتر عدد الاختبارات المتبقية (3، 2، 1)

    // --- 4. إدارة الوقت والتاريخ ---
    const [selectedDate, setSelectedDate] = useState(new Date()); // التاريخ المختار للتقارير الشهرية
    const [selectedHalf, setSelectedHalf] = useState<1 | 2>(new Date().getDate() <= 15 ? 1 : 2); // نصف الشهر المختار
    const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any>(null); // الطالب المختار لعرض تفاصيله

    // تحويل التاريخ إلى مفتاح (مثل 2023-10) لجلب بيانات الاختبارات من السيرفر
    const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    const { data: allExams = [] } = useAllExams(monthKey, selectedHalf, relevantStudentIds);

    // تسميات الشهور باللغة العربية
    const currentMonthLabel = selectedDate.toLocaleDateString('ar-EG', { month: 'long' });
    const monthLabelWithYear = selectedDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

    // التنقل بين الشهور
    const goToPreviousMonth = () => {
        const d = new Date(selectedDate);
        d.setMonth(d.getMonth() - 1);
        setSelectedDate(d);
    };

    const goToNextMonth = () => {
        const d = new Date(selectedDate);
        d.setMonth(d.getMonth() + 1);
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
                const isReducedReq = groupName.includes('تلقين') || groupName.includes('نور بيان') || groupName.includes('نور البيان');
                const requiredCount = isReducedReq ? 2 : 3;

                // جلب اختبارات الطالب لهذا النصف (باستثناء "يعاد")
                const studentExams = allExams.filter((e: any) => e.studentId === s.id && e.grade?.trim() !== 'يعاد');

                // حساب الأنواع الفريدة التي اختبرها الطالب (مثلاً: جديد، ماضي قريب)
                // إذا اختبر مرتين "جديد" تحسب مرة واحدة
                const completedTypes = Array.from(new Set(studentExams.map((e: any) => e.type?.trim())));

                // هل اختبر النوع المحدد في الفلتر؟
                const hasDoneSelected = completedTypes.includes(selectedArabicType.trim());

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
                (!arabicType || e.type?.trim() === arabicType.trim()) &&
                e.grade?.trim() !== 'يعاد' // استبعاد الاختبارات التي نتيجتها "يعاد"
            );

            const examsList = studentExams
                .map((e: any) => `${e.surah || 'اختبار'} (${e.type?.trim() || 'اختبار'}: ${e.grade?.trim() || 'لم يسجل'})`)
                .join('\n- ');

            return {
                ...s,
                examsCount: studentExams.length,
                examsList,
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

        // تصفية حسب نوع المجموعة (قرآن، تلقين، نور البيان)
        if (performanceTypeFilter !== 'all') {
            baseGroups = baseGroups.filter((g: any) => {
                const name = g.name || '';
                if (performanceTypeFilter === 'quran') return name.includes('قرآن');
                if (performanceTypeFilter === 'talqeen') return name.includes('تلقين');
                if (performanceTypeFilter === 'noor') return name.includes('نور بيان') || name.includes('نور البيان');
                return true;
            });
        }

                return baseGroups.map((g: any) => {
                    const groupStudents = (students || []).filter((s: any) => s.groupId === g.id && s.status === 'active');
                    const groupStudentIds = new Set(groupStudents.map((s: any) => s.id));

                    // لكل نوع، نحسب عدد الطلاب الفريدين الذين اختبروه (مرة واحدة على الأقل)
                    const doneStudents = {
                        new: new Set(),
                        near: new Set(),
                        far: new Set(),
                    };

                    for (const e of allExams || []) {
                        if (!groupStudentIds.has(e.studentId)) continue;
                        const type = e.type?.trim();
                        if (type === 'جديد') doneStudents.new.add(e.studentId);
                        if (type === 'ماضي قريب') doneStudents.near.add(e.studentId);
                        if (type === 'ماضي بعيد') doneStudents.far.add(e.studentId);
                    }

                    return {
                        id: g.id,
                        name: g.name,
                        totalStudents: groupStudents.length,
                        tested: {
                            new: doneStudents.new.size,
                            near: doneStudents.near.size,
                            far: doneStudents.far.size,
                        },
                        notTested: {
                            new: Math.max(0, groupStudents.length - doneStudents.new.size),
                            near: Math.max(0, groupStudents.length - doneStudents.near.size),
                            far: Math.max(0, groupStudents.length - doneStudents.far.size),
                        }
                    };
                });
    }, [groups, students, allExams, user, assignedGroupIds, performanceTypeFilter]);

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24 text-right font-sans overflow-x-hidden" dir="rtl">

            {/* --- الهيدر (رأس الصفحة) --- */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-2 md:px-6 py-3">
                <div className="flex items-center max-w-4xl mx-auto gap-1 md:gap-4">
                    <h1 className="text-sm md:text-lg font-black text-gray-800 shrink-0">
                    اختبارات <span className="md:inline hidden">({currentMonthLabel})</span>
                    </h1>

                    {/* مبدل النصف (للجوال) */}
                    <button 
                        onClick={() => setSelectedHalf(selectedHalf === 1 ? 2 : 1)}
                        className="md:hidden flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1.5 py-1 shadow-sm"
                        title={selectedHalf === 1 ? 'النصف الأول' : 'النصف الثاني'}
                    >
                        <span className={cn("text-[9px] font-black transition-colors", selectedHalf === 1 ? "text-blue-600" : "text-gray-300")}>1</span>
                        <div className="relative w-5 h-3 rounded-full bg-gray-200">
                            <div className={cn("absolute top-0.5 w-2 h-2 rounded-full bg-blue-500 transition-all", selectedHalf === 1 ? "right-0.5" : "right-2.5")} />
                        </div>
                        <span className={cn("text-[9px] font-black transition-colors", selectedHalf === 2 ? "text-blue-600" : "text-gray-300")}>2</span>
                    </button>

                    {/* زر اختيار الشهر والنصف */}
                    <div className="flex bg-gray-100/50 p-1 rounded-xl items-center gap-1 border border-gray-100 flex-row-reverse mr-auto">
                        <div className="hidden md:flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-sm flex-row-reverse">
                            <button onClick={() => setSelectedHalf(1)} className={cn("px-2 py-1 text-xs font-bold rounded transition-colors", selectedHalf === 1 ? "bg-blue-50 text-blue-600" : "text-gray-500")}>النصف الأول</button>
                            <button onClick={() => setSelectedHalf(2)} className={cn("px-2 py-1 text-xs font-bold rounded transition-colors", selectedHalf === 2 ? "bg-blue-50 text-blue-600" : "text-gray-500")}>النصف الثاني</button>
                        </div>
                        <div className="flex items-center gap-0.5 md:gap-1 bg-white p-0.5 md:p-1 rounded-lg border border-gray-200 shadow-sm justify-center">
                            <button onClick={goToNextMonth} className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600 transition-colors">
                                <ChevronLeft size={12} />
                            </button>
                            <div className="flex items-center gap-0.5 md:gap-1.5 px-0.5 md:px-2">
                                <Calendar size={10} className="text-blue-500" />
                                <span className="text-[8px] md:text-xs font-black text-gray-700">{monthLabelWithYear}</span>
                            </div>
                            <button onClick={goToPreviousMonth} className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600 transition-colors">
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- شريط التنقل بين التبويبات --- */}
                <div className="max-w-4xl mx-auto mt-2 md:mt-4 flex bg-gray-100/80 p-0.5 md:p-1 rounded-xl gap-0.5 md:gap-1 overflow-x-auto no-scrollbar px-1 md:px-0">

                    <button
                        onClick={() => setActiveTab('performance')}
                        className={cn(
                            "flex-1 py-1.5 md:py-2.5 rounded-lg text-[10px] md:text-sm font-bold transition-all flex items-center justify-center gap-0.5 md:gap-1.5",
                            activeTab === 'performance' ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <TrendingUp size={12} />
                        الأداء
                    </button>
                    <button
                        onClick={() => setActiveTab('mostTested')}
                        className={cn(
                            "flex-1 py-1.5 md:py-2.5 rounded-lg text-[10px] md:text-sm font-bold transition-all flex items-center justify-center gap-0.5 md:gap-1.5",
                            activeTab === 'mostTested' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Trophy size={12} />
                        الأكثر
                        <span className={cn("text-[8px] md:text-[10px] font-black px-1 md:px-1.5 py-0.5 rounded-full font-sans", activeTab === 'mostTested' ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-500")}>{mostTestedStudents.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('notTested')}
                        className={cn(
                            "flex-1 py-1.5 md:py-2.5 rounded-lg text-[10px] md:text-sm font-bold transition-all flex items-center justify-center gap-0.5 md:gap-1.5",
                            activeTab === 'notTested' ? "bg-white text-amber-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <AlertCircle size={12} />
                        لم يختبروا
                        <span className={cn("text-[8px] md:text-[10px] font-black px-1 md:px-1.5 py-0.5 rounded-full font-sans", activeTab === 'notTested' ? "bg-amber-100 text-amber-600" : "bg-gray-200 text-gray-500")}>{notTestedStudents.length}</span>
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-2 md:px-6 py-4 space-y-6">
                {/* --- التبويب 1: قائمة الطلاب الذين لم يختبروا (الباقي) --- */}
                    {activeTab === 'notTested' && (
                        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                            <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-4">
                                <div className="flex flex-row-reverse items-center gap-1 md:gap-3 w-full md:w-auto flex-wrap justify-center">
                                    {/* فلتر المجموعة ونوع الاختبار */}
                                    <div className="relative">
                                        <select
                                            value={selectedRemainingCount}
                                            onChange={(e) => setSelectedRemainingCount(e.target.value)}
                                            className="appearance-none bg-white border border-gray-100 px-5 py-2 pr-3 rounded-lg md:rounded-2xl text-[10px] md:text-sm font-bold text-gray-600 focus:outline-none text-right"
                                        >
                                            <option value="all">الكل</option>
                                            <option value="3">بقي 3</option>
                                            <option value="2">بقي 2</option>
                                            <option value="1">بقي 1</option>
                                        </select>
                                        <ChevronDown size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={selectedGroupId}
                                            onChange={(e) => setSelectedGroupId(e.target.value)}
                                            className="appearance-none bg-white border border-gray-100 px-5 py-2 pr-3 rounded-lg md:rounded-2xl text-[10px] md:text-sm font-bold text-gray-600 focus:outline-none text-right"
                                        >
                                            <option value="all">كل المجموعات</option>
                                            {filteredGroupsList?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                        <ChevronDown size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={selectedExamType}
                                            onChange={(e) => setSelectedExamType(e.target.value)}
                                            className="appearance-none bg-white border border-gray-100 px-5 py-2 pr-3 rounded-lg md:rounded-2xl text-[10px] md:text-sm font-bold text-gray-600 focus:outline-none text-right"
                                        >
                                            <option value="new">جديد</option>
                                            <option value="near">ماضي قريب</option>
                                            <option value="far">بعيد</option>
                                        </select>
                                        <ChevronDown size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* عداد الطلاب */}
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <span className="text-xs font-bold text-gray-400">طلاب القائمة</span>
                                    <span className="bg-amber-100 text-amber-700 text-xs font-black px-3 py-1 rounded-full font-sans">{notTestedStudents.length} طالب</span>
                                </div>
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
                        </div>
                    )}

                    {/* --- التبويب 2: الطلاب الأكثر اختباراً --- */}
                    {activeTab === 'mostTested' && (
                        <div className="space-y-3">
                            {/* عداد الطلاب */}
                            <div className="flex items-center justify-between px-1 mb-2">
                                <span className="text-[10px] md:text-xs font-bold text-gray-400">طلاب القائمة</span>
                                <span className="bg-blue-100 text-blue-700 text-[10px] md:text-xs font-black px-2 md:px-3 py-0.5 md:py-1 rounded-full font-sans">{mostTestedStudents.length} طالب</span>
                            </div>
                            {mostTestedStudents.map((student: any) => (
                                <div
                                    key={student.id}
                                    onClick={() => setSelectedStudentForDetails(student)}
                                    className="bg-white rounded-[16px] md:rounded-[20px] p-2.5 md:p-3 flex items-center justify-between border border-gray-100 shadow-sm group cursor-pointer"
                                >
                                    <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-3">
                                        <div className="w-7 h-7 md:w-9 md:h-9 bg-blue-50 rounded-[10px] md:rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                            <User size={14} className="md:size-[18px]" />
                                        </div>
                                        <div className="text-right flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm md:text-base truncate">{student.fullName}</h3>
                                            <span className="text-[10px] md:text-xs text-gray-400 font-bold truncate block">{student.groupName}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                                        <div className="bg-blue-50 px-2 md:px-3 py-1 md:py-1.5 rounded-[8px] md:rounded-lg flex items-center gap-1 md:gap-2">
                                            <span className="text-blue-600 font-black text-xs md:text-sm font-sans">{student.examsCount}</span>
                                            <span className="text-[9px] md:text-xs text-blue-400 font-bold">اختبار</span>
                                        </div>
                                        
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const phone = student.parentPhone || student.studentPhone || '';
                                                const cleanPhone = phone.replace(/[^0-9]/g, '');
                                                const last6Digits = cleanPhone.slice(-6);
                                                
                                                const message = `السلام عليكم ورحمة الله وبركاته 🌹\nنزف إليكم سعادة وفرحاً بتفوق الطالب/ة: *${student.fullName}*\nلقد أتم اختباراته بنجاح لهذا الشهر (${currentMonthLabel}) 🌟\n\nما تم اختباره:\n${student.examsList}\n\nنتمنى له/لها دوام التوفيق والنجاح.\n\nيمكنكم متابعة النتائج والتسجيل في الحلقات عبر رابط موقعنا:\n🔗 https://shatpycenter-um2b.vercel.app/\n\n🔐 بيانات الدخول:\nاسم المستخدم: *رقم الهاتف المسجل*\nالباسورد: *آخر 6 أرقام (${last6Digits})*\n\nمع تحيات إدارة مركز الشاطبي 🏛️`;
                                                window.open(getWhatsAppUrl(phone, message), '_blank');
                                            }}
                                            className="w-7 h-7 md:w-9 md:h-9 bg-green-50 text-green-600 rounded-[10px] md:rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm border border-green-100"
                                            title="إرسال التهنئة عبر واتساب"
                                        >
                                            <MessageCircle size={14} className="md:size-[18px]" />
                                        </button>

                                        <button className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                                            <ChevronRight size={12} className="md:size-[16px]" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}



                    {/* --- التبويب 4: مقارنة أداء المجموعات --- */}
                    {activeTab === 'performance' && (
                        <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                            {/* شريط الفلاتر التفاعلي لتبويب الأداء - سطر واحد */}
                            <div className="flex items-center justify-start md:justify-center gap-1 md:gap-4 py-3 border-y border-gray-100 flex-row-reverse flex-wrap w-full">
                                <button
                                    onClick={() => setPerformanceFilter('all')}
                                    className={cn("flex flex-row-reverse items-center gap-1 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 rounded-xl transition-all", performanceFilter === 'all' ? "bg-blue-600 text-white shadow-md" : "bg-gray-50 text-gray-500 hover:bg-gray-100")}
                                >
                                    <span className="text-[9px] md:text-sm font-black">الكل</span>
                                    <div className={cn("w-1 h-1 md:w-2 md:h-2 rounded-full", performanceFilter === 'all' ? "bg-white/20" : "bg-blue-600")} />
                                </button>
                                <button
                                    onClick={() => setPerformanceFilter('new')}
                                    className={cn("flex flex-row-reverse items-center gap-1 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 rounded-xl transition-all", performanceFilter === 'new' ? "bg-green-500 text-white shadow-md" : "bg-gray-50 text-gray-500 hover:bg-gray-100")}
                                >
                                    <span className="text-[9px] md:text-sm font-black">جديد</span>
                                    <div className={cn("w-1 h-1 md:w-2 md:h-2 rounded-full", performanceFilter === 'new' ? "bg-white" : "bg-green-500")} />
                                </button>
                                <button
                                    onClick={() => setPerformanceFilter('near')}
                                    className={cn("flex flex-row-reverse items-center gap-1 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 rounded-xl transition-all", performanceFilter === 'near' ? "bg-amber-500 text-white shadow-md" : "bg-gray-50 text-gray-500 hover:bg-gray-100")}
                                >
                                    <span className="text-[9px] md:text-sm font-black">ماضي قريب</span>
                                    <div className={cn("w-1 h-1 md:w-2 md:h-2 rounded-full", performanceFilter === 'near' ? "bg-white" : "bg-amber-500")} />
                                </button>
                                <button
                                    onClick={() => setPerformanceFilter('far')}
                                    className={cn("flex flex-row-reverse items-center gap-1 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 rounded-xl transition-all", performanceFilter === 'far' ? "bg-purple-500 text-white shadow-md" : "bg-gray-50 text-gray-500 hover:bg-gray-100")}
                                >
                                    <span className="text-[9px] md:text-sm font-black">بعيد</span>
                                    <div className={cn("w-1 h-1 md:w-2 md:h-2 rounded-full", performanceFilter === 'far' ? "bg-white" : "bg-purple-500")} />
                                </button>

                                <div className="relative">
                                    <select
                                        value={performanceTypeFilter}
                                        onChange={(e) => setPerformanceTypeFilter(e.target.value as any)}
                                        className="appearance-none bg-white border border-gray-100 px-3 md:px-5 py-1.5 md:py-2 pr-2 md:pr-3 rounded-lg md:rounded-xl text-[9px] md:text-sm font-bold text-gray-600 focus:outline-none text-right cursor-pointer"
                                    >
                                        <option value="all">كل المجموعات</option>
                                        <option value="quran">قرآن</option>
                                        <option value="talqeen">تلقين</option>
                                        <option value="noor">نور البيان</option>
                                    </select>
                                    <ChevronDown size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* الرسوم البيانية (أشرطة التقدم) */}
                            <div className="space-y-6">
                                {performanceData.map((data: any) => {
                                        const totalSt = data.totalStudents;

                                        if (performanceFilter === 'all') {
                                            return (
                                                <div key={data.id} className="space-y-3 bg-white rounded-2xl p-4 border border-gray-100">
                                                    <div className="flex flex-row-reverse items-center justify-between">
                                                        <span className="text-sm font-bold text-gray-700">{data.name}</span>
                                                        <span className="text-xs font-black text-gray-400 font-sans">{totalSt} طالب</span>
                                                    </div>
                                                    <div className="space-y-2 pr-2">
                                                        {(['new', 'near', 'far'] as const).map(type => {
                                                            const label = { new: 'جديد', near: 'ماضي قريب', far: 'بعيد' }[type];
                                                            const testedVal = data.tested[type];
                                                            const notTestedVal = data.notTested[type];
                                                            const barColor = type === 'new' ? 'from-green-400 to-emerald-500'
                                                                : type === 'near' ? 'from-amber-400 to-orange-500'
                                                                : 'from-purple-400 to-violet-500';
                                                            const textColor = type === 'new' ? 'text-emerald-600'
                                                                : type === 'near' ? 'text-amber-600'
                                                                : 'text-purple-600';
                                                            return (
                                                                <div key={type} className="flex items-center gap-2">
                                                                    <span className="text-[11px] font-bold text-gray-400 w-16 shrink-0 text-left">{label}</span>
                                                                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner relative">
                                                                        <div style={{ width: `${(testedVal / Math.max(totalSt, 1)) * 100}%` }} className={`absolute right-0 top-0 h-full bg-gradient-to-l ${barColor} rounded-full animate-[chartFill_0.7s_ease-out]`} />
                                                                    </div>
                                                                    <span className="flex items-center gap-1 text-[11px] font-black text-gray-500 font-sans">
                                                                        <span className={textColor}>{testedVal}</span>
                                                                        <span className="text-gray-300">/</span>
                                                                        <span className="text-gray-400">{totalSt}</span>
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const testedVal = (data.tested as any)[performanceFilter];
                                        const barWidth = `${(testedVal / Math.max(totalSt, 1)) * 100}%`;
                                        const barColor = performanceFilter === 'new' ? 'from-green-400 to-emerald-500'
                                            : performanceFilter === 'near' ? 'from-amber-400 to-orange-500'
                                            : 'from-purple-400 to-violet-500';
                                        const textColor = performanceFilter === 'new' ? 'text-emerald-600'
                                            : performanceFilter === 'near' ? 'text-amber-600'
                                            : 'text-purple-600';

                                        return (
                                            <div key={data.id} className="space-y-2">
                                                <div className="flex flex-row-reverse items-center justify-between px-1">
                                                    <span className="text-sm font-bold text-gray-700">{data.name}</span>
                                                    <span className="text-xs font-black text-gray-400 font-sans">
                                                        <span className={textColor}>{testedVal}</span>
                                                        <span className="text-gray-300">/</span>
                                                        <span className="text-gray-500">{totalSt} اختبر</span>
                                                    </span>
                                                </div>
                                                <div className="h-6 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner relative">
                                                    <div style={{ width: barWidth }} className={`absolute right-0 top-0 h-full bg-gradient-to-l ${barColor} rounded-full animate-[chartFill_0.7s_ease-out]`} />
                                                </div>
                                            </div>
                                        );
                                })}
                            </div>
                        </div>
                    )}
            </main>

            {/* --- مودال تفاصيل الطالب (يظهر عند النقر على أي طالب) --- */}
            {selectedStudentForDetails && (
                <StudentDetailModal
                    isOpen={!!selectedStudentForDetails}
                    student={selectedStudentForDetails}
                    onClose={() => setSelectedStudentForDetails(null)}
                />
            )}
        </div>
    );
}
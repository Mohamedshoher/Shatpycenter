"use client";

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    CalendarCheck,
    Search,
    Filter,
    Download,
    ChevronRight,
    Calendar,
    Phone,
    MessageCircle,
    FileText,
    Trash2,
    User,
    ChevronDown,
    Bell,
    CheckCircle2,
    AlertCircle,
    Archive,
    Check,
    X,
    BarChart2
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useTeachers } from '@/features/teachers/hooks/useTeachers';
import { useAuthStore } from '@/store/useAuthStore';
import StudentDetailModal from '@/features/students/components/StudentDetailModal';
import { useStudentRecords } from '@/features/students/hooks/useStudentRecords';

// دالة لحساب الغياب المتصل (محدثة لدعم تداخل الأشهر)
export const calculateContinuousAbsence = (attendance: any[]) => {
    if (!attendance || attendance.length === 0) return 0;

    // ترتيب الحضور من الأحدث للأقدم
    // يجب تحويل التاريخ لكائن للمقارنة الصحيحة لأن "day" يتكرر عبر الأشهر
    const sortedAttendance = [...attendance].sort((a, b) => {
        const dateA = new Date(a.month + '-' + String(a.day).padStart(2, '0'));
        const dateB = new Date(b.month + '-' + String(b.day).padStart(2, '0'));
        return dateB.getTime() - dateA.getTime();
    });

    let continuous = 0;
    // نبدأ العد من أحدث سجل
    for (let i = 0; i < sortedAttendance.length; i++) {
        if (sortedAttendance[i].status === 'absent') {
            continuous++;
        } else {
            // إذا وجدنا "حاضر"، نتوقف لأن السلسلة انقطعت
            break;
        }
    }
    return continuous;
};

// دالة لحساب إجمالي الغياب في الشهر الحالي
export const calculateTotalAbsence = (attendance: any[]) => {
    // نستخدم Set لضمان عدم تكرار العد لنفس اليوم إذا وجدت سجلات مكررة
    const uniqueDays = new Set(
        attendance
            .filter(a => a.status === 'absent')
            .map(a => `${a.month}-${a.day}`)
    );
    return uniqueDays.size;
};

export default function AttendanceReportPage() {
    const { data: students, archiveStudent } = useStudents();
    const { data: groups } = useGroups();
    const { data: teachers } = useTeachers();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // State for tracking attendance submissions
    const [attendanceLoading, setAttendanceLoading] = useState<{ [key: string]: boolean }>({});
    const [recordedAttendance, setRecordedAttendance] = useState<{ [key: string]: 'present' | 'absent' }>({});
    const [showChart, setShowChart] = useState(false);
    const [showPresentChart, setShowPresentChart] = useState(false);

    // تصفية المجموعات للمدرس
    const filteredGroupsList = groups?.filter(g => {
        if (user?.role === 'teacher') return g.teacherId === user.teacherId;
        if (user?.role === 'supervisor') {
            const sections = user.responsibleSections || [];
            return sections.some(section => g.name.includes(section));
        }
        return true;
    }) || [];
    const assignedGroupIds = filteredGroupsList.map(g => g.id);

    const [selectedDateMode, setSelectedDateMode] = useState<'today' | 'yesterday' | 'before'>('today');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('all');

    // حالات التصفية الجديدة
    const [continuousAbsenceLimit, setContinuousAbsenceLimit] = useState<string>('');
    const [totalAbsenceLimit, setTotalAbsenceLimit] = useState<string>('');

    const [selectedStudentForModal, setSelectedStudentForModal] = useState<any>(null);

    // دالة لجلب تاريخ منسق
    const getDateStr = (mode: string) => {
        const d = new Date();
        if (mode === 'yesterday') d.setDate(d.getDate() - 1);
        if (mode === 'before') d.setDate(d.getDate() - 2);
        return d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    // جلب بيانات الحضور والملحوظات لجميع الطلاب
    const { data: reportData } = useQuery({
        queryKey: ['report-data'],
        queryFn: async () => {
            const { getAllAttendanceForMonth, getLatestNotes } = await import('@/features/students/services/recordsService');

            const today = new Date();
            const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

            // حساب مفتاح الشهر السابق
            const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

            // جلب بيانات الشهر الحالي والشهر السابق لمعالجة الغياب المتصل عبر الأشهر
            const [attendanceCurrent, attendancePrev, latestNotes] = await Promise.all([
                getAllAttendanceForMonth(currentMonthKey),
                getAllAttendanceForMonth(prevMonthKey),
                getLatestNotes()
            ]);

            // دمج سجلات الحضور
            const mergedAttendance: Record<string, any[]> = {};
            const allStudentIds = new Set([...Object.keys(attendanceCurrent), ...Object.keys(attendancePrev)]);

            allStudentIds.forEach(id => {
                mergedAttendance[id] = [
                    ...(attendanceCurrent[id] || []),
                    ...(attendancePrev[id] || [])
                ];
            });

            return { attendanceMap: mergedAttendance, latestNotes };
        },
        enabled: !!(students && students.length > 0)
    });

    const allAttendanceData = reportData?.attendanceMap;
    const allLatestNotes = reportData?.latestNotes;

    // معالجة بيانات الطلاب مع الحضور الحقيقي
    const processedStudents = useMemo(() => {
        return (students || [])
            .filter(s => {
                if (user?.role === 'teacher' || user?.role === 'supervisor') {
                    return s.groupId && assignedGroupIds.includes(s.groupId);
                }
                return s.status === 'active';
            })
            .map((s) => {
                const attendance = allAttendanceData?.[s.id] || [];
                const totalAbsences = calculateTotalAbsence(attendance);
                // استخدام الدالة الجديدة التي تدعم البحث في كل السجلات المدمجة
                const continuousAbsences = calculateContinuousAbsence([...attendance]); // Spread to avoid mutating original with sort
                const latestNote = allLatestNotes?.[s.id];

                // تحديد التاريخ المختار للتحقق من حالة الحضور الحالية
                const checkDate = new Date();
                if (selectedDateMode === 'yesterday') checkDate.setDate(checkDate.getDate() - 1);
                if (selectedDateMode === 'before') checkDate.setDate(checkDate.getDate() - 2);
                const day = checkDate.getDate();
                const month = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;

                const currentStatus = attendance.find(a => a.day === day && a.month === month)?.status;

                return {
                    ...s,
                    totalAbsences,
                    continuousAbsences,
                    currentStatus,
                    lastNote: latestNote?.text || "لا توجد ملحوظات مسجلة",
                    lastNoteDate: latestNote?.date || "",
                    groupName: groups?.find(g => g.id === s.groupId)?.name || 'غير محدد'
                };
            });
    }, [students, allAttendanceData, groups, user, assignedGroupIds, selectedDateMode, allLatestNotes]);

    // تصفية الطلاب بناءً على المدخلات
    const filteredStudents = processedStudents.filter(s => {
        const matchesGroup = selectedGroupId === 'all' || s.groupId === selectedGroupId;

        // نظهر فقط الطلاب الغائبين في اليوم المحدد
        const isAbsent = s.currentStatus === 'absent';

        const contLimit = Number(continuousAbsenceLimit);
        const totLimit = Number(totalAbsenceLimit);

        // إذا كانت الخانات فارغة، لا نطبق الفلتر الخاص بها
        const matchesContinuous = contLimit > 0 ? s.continuousAbsences >= contLimit : false;
        const matchesTotal = totLimit > 0 ? s.totalAbsences >= totLimit : false;

        // إذا لم يتم إدخال أي أرقام، نظهر كل طلاب المجموعة المختارة (شرط أن يكون غائباً)
        if (!contLimit && !totLimit) return matchesGroup && isAbsent;

        // إذا تم إدخال رقم في خانة واحدة، نظهر ما يطابق هذا الشرط فقط
        if (contLimit && !totLimit) return matchesGroup && matchesContinuous && isAbsent;
        if (!contLimit && totLimit) return matchesGroup && matchesTotal && isAbsent;

        // إذا تم إدخال أرقام في الخانتين، نظهر من ينطبق عليه أي من الشرطين
        return matchesGroup && (matchesContinuous || matchesTotal) && isAbsent;
    }).sort((a, b) => b.totalAbsences - a.totalAbsences);

    // دالة لجلب اسم الشهر الحالي بالعربية
    const currentMonthName = new Date().toLocaleDateString('ar-EG', { month: 'long' });

    // حساب التقرير اليومي من البيانات الحقيقية
    const dailyStats = useMemo(() => {
        const selectedDate = new Date();
        if (selectedDateMode === 'yesterday') selectedDate.setDate(selectedDate.getDate() - 1);
        if (selectedDateMode === 'before') selectedDate.setDate(selectedDate.getDate() - 2);

        const selectedDay = selectedDate.getDate();
        const selectedMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;

        let present = 0;
        let absent = 0;

        processedStudents.forEach(student => {
            const attendance = allAttendanceData?.[student.id] || [];
            const dayRecord = attendance.find(a =>
                a.month === selectedMonth && a.day === selectedDay
            );

            if (dayRecord) {
                if (dayRecord.status === 'present') present++;
                else if (dayRecord.status === 'absent') absent++;
            }
        });

        return { present, absent };
    }, [selectedDateMode, processedStudents, allAttendanceData]);

    // حساب توزيع الحضور حسب المجموعات
    const presentsByGroup = useMemo(() => {
        const selectedDate = new Date();
        if (selectedDateMode === 'yesterday') selectedDate.setDate(selectedDate.getDate() - 1);
        if (selectedDateMode === 'before') selectedDate.setDate(selectedDate.getDate() - 2);

        const selectedDay = selectedDate.getDate();
        const selectedMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;

        const breakdown: Record<string, number> = {};

        processedStudents.forEach(student => {
            const attendance = allAttendanceData?.[student.id] || [];
            const dayRecord = attendance.find(a =>
                a.month === selectedMonth && a.day === selectedDay
            );

            if (dayRecord && dayRecord.status === 'present') {
                const groupName = student.groupName || 'غير محدد';
                breakdown[groupName] = (breakdown[groupName] || 0) + 1;
            }
        });

        return Object.entries(breakdown)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [selectedDateMode, processedStudents, allAttendanceData]);

    // حساب توزيع الغياب حسب المجموعات
    const absentsByGroup = useMemo(() => {
        const selectedDate = new Date();
        if (selectedDateMode === 'yesterday') selectedDate.setDate(selectedDate.getDate() - 1);
        if (selectedDateMode === 'before') selectedDate.setDate(selectedDate.getDate() - 2);

        const selectedDay = selectedDate.getDate();
        const selectedMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;

        const breakdown: Record<string, number> = {};

        processedStudents.forEach(student => {
            const attendance = allAttendanceData?.[student.id] || [];
            const dayRecord = attendance.find(a =>
                a.month === selectedMonth && a.day === selectedDay
            );

            if (dayRecord && dayRecord.status === 'absent') {
                const groupName = student.groupName || 'غير محدد';
                breakdown[groupName] = (breakdown[groupName] || 0) + 1;
            }
        });

        return Object.entries(breakdown)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [selectedDateMode, processedStudents, allAttendanceData]);

    // دالة لتسجيل الحضور
    const recordAttendance = async (studentId: string, status: 'present' | 'absent') => {
        // إذا كان جارٍ التحميل حالياً لهذا الطالب، نرفض الضغطة الجديدة
        if (attendanceLoading[studentId]) return;

        try {
            setAttendanceLoading(prev => ({ ...prev, [studentId]: true }));

            const today = new Date();
            const day = today.getDate();
            const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

            // استخدام الخدمة مباشرة
            const { addAttendanceRecord } = await import('@/features/students/services/recordsService');
            await addAttendanceRecord({
                studentId,
                status,
                day,
                month
            });

            // تحديث الحالة المحلية فوراً
            setRecordedAttendance(prev => ({ ...prev, [studentId]: status }));

            // إعادة تحميل بيانات الحضور للتطبيق بالكامل
            await queryClient.invalidateQueries({ queryKey: ['report-data'] });
            await queryClient.invalidateQueries({ queryKey: ['all-attendance'] });

            // إخفاء مؤشر النجاح بعد ثانيتين
            setTimeout(() => {
                setRecordedAttendance(prev => {
                    const newState = { ...prev };
                    delete newState[studentId];
                    return newState;
                });
            }, 2000);
        } catch (error) {
            console.error('Error recording attendance:', error);
            alert('حدث خطأ في تسجيل الحضور');
        } finally {
            setAttendanceLoading(prev => ({ ...prev, [studentId]: false }));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24 text-right font-sans">
            {/* Sticky Header */}
            <div className="sticky top-0 z-[70] bg-gray-50/95 backdrop-blur-xl border-b border-gray-100 shadow-sm px-4 py-2">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex bg-white p-1 rounded-[14px] border border-gray-100 shadow-sm h-fit">
                            <button
                                onClick={() => setSelectedDateMode('today')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                    selectedDateMode === 'today' ? "bg-blue-50 text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                اليوم
                            </button>
                            <button
                                onClick={() => setSelectedDateMode('yesterday')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                    selectedDateMode === 'yesterday' ? "bg-blue-50 text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                أمس
                            </button>
                            <button
                                onClick={() => setSelectedDateMode('before')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                    selectedDateMode === 'before' ? "bg-blue-50 text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                أول أمس
                            </button>
                        </div>

                        <div className="flex-1" /> {/* مسافة فاصلة */}

                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                            <button
                                onClick={() => setShowPresentChart(!showPresentChart)}
                                className={cn(
                                    "border rounded-[12px] py-1 px-2.5 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm",
                                    showPresentChart ? "bg-green-500 border-green-600 text-white" : "bg-green-50/50 border-green-100 text-green-700"
                                )}
                            >
                                <div className="flex flex-col items-end">
                                    <span className={cn("text-[8px] font-black leading-tight", showPresentChart ? "text-green-100" : "text-green-700")}>حاضر</span>
                                    <span className={cn("text-lg font-black font-sans leading-none", showPresentChart ? "text-white" : "text-green-600")}>{dailyStats.present}</span>
                                </div>
                                <CheckCircle2 size={16} className={showPresentChart ? "text-white" : "text-green-500"} />
                            </button>
                            <button
                                onClick={() => setShowChart(!showChart)}
                                className={cn(
                                    "border rounded-[12px] py-1 px-2.5 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm",
                                    showChart ? "bg-red-500 border-red-600 text-white" : "bg-red-50/50 border-red-100 text-red-700"
                                )}
                            >
                                <div className="flex flex-col items-end">
                                    <span className={cn("text-[8px] font-black leading-tight", showChart ? "text-red-100" : "text-red-700")}>غائب</span>
                                    <span className={cn("text-lg font-black font-sans leading-none", showChart ? "text-white" : "text-red-500")}>{dailyStats.absent}</span>
                                </div>
                                <BarChart2 size={16} className={showChart ? "text-white" : "text-red-400"} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
                {/* السطر الثاني: الفلاتر والعدد الإجمالي (أصبح الآن جزءاً من محتوى الصفحة) */}
                <div className="flex items-center gap-1.5 pb-1">
                    {/* اختيار المجموعة */}
                    <div className="relative shrink min-w-0">
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="appearance-none bg-white border border-gray-100 px-6 py-2.5 pr-2 rounded-[16px] text-[10px] font-black text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 w-full truncate shadow-sm cursor-pointer"
                        >
                            <option value="all">الكل</option>
                            {filteredGroupsList?.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* غياب متصل */}
                    <div className="relative flex items-center bg-gray-100/50 rounded-[16px] p-0.5 border border-gray-100 shadow-sm shrink-0">
                        <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={continuousAbsenceLimit}
                            onChange={(e) => setContinuousAbsenceLimit(e.target.value.replace(/\D/g, ''))}
                            className="w-8 h-8 bg-white rounded-[12px] text-center font-black text-blue-600 focus:outline-none border-none text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-sm"
                        />
                        <span className="text-[8px] font-black text-blue-800/60 px-1.5 uppercase">متصل</span>
                    </div>

                    {/* غياب كلي */}
                    <div className="relative flex items-center bg-gray-100/50 rounded-[16px] p-0.5 border border-gray-100 shadow-sm shrink-0">
                        <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={totalAbsenceLimit}
                            onChange={(e) => setTotalAbsenceLimit(e.target.value.replace(/\D/g, ''))}
                            className="w-8 h-8 bg-white rounded-[12px] text-center font-black text-amber-600 focus:outline-none border-none text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-sm"
                        />
                        <span className="text-[8px] font-black text-amber-800/60 px-1.5 uppercase">فأكثر</span>
                    </div>

                    {/* العدد الإجمالي */}
                    <div className="w-9 h-9 bg-blue-600 rounded-[16px] flex items-center justify-center shadow-lg shadow-blue-200 shrink-0 mr-auto">
                        <span className="text-sm font-black text-white font-sans">{filteredStudents.length}</span>
                    </div>
                </div>



                {/* شبكة الطلاب */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredStudents.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-gray-400 font-bold bg-white rounded-[32px] border border-dashed border-gray-200">
                            لا يوجد طلاب يطابقون هذه المعايير
                        </div>
                    ) : (
                        filteredStudents.map((student, idx) => (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setSelectedStudentForModal(student)}
                                className="bg-white rounded-[24px] p-3.5 shadow-sm border border-gray-100 flex flex-col gap-1.5 relative group cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
                            >
                                {/* السطر الأول: الاسم والمجموعة */}
                                <div className="flex items-center justify-between gap-3 px-0.5">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-9 h-9 bg-blue-50 rounded-[14px] flex items-center justify-center text-blue-600 shrink-0 font-black text-base">
                                            {idx + 1}
                                        </div>
                                        <h3 className="font-black text-gray-900 text-xl truncate leading-tight">{student.fullName}</h3>
                                        <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 shrink-0">
                                            {student.groupName}
                                        </span>
                                    </div>
                                </div>

                                {/* السطر الثاني: الإحصائيات والأيقونات */}
                                <div className="flex items-center justify-between border-t border-gray-50 pt-2 px-0.5">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <div className="flex items-center gap-1.5 bg-red-50/50 px-2.5 py-1.5 rounded-xl border border-red-100/30">
                                            <span className="text-[10px] text-red-700 font-bold">إجمالي:</span>
                                            <span className="text-red-600 font-black text-base font-sans">{student.totalAbsences}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-amber-50/50 px-2.5 py-1.5 rounded-xl border border-amber-100/30">
                                            <span className="text-[10px] text-amber-800 font-bold">متصل:</span>
                                            <span className="text-amber-700 font-black text-base font-sans">{student.continuousAbsences}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {user?.role !== 'teacher' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`هل أنت متأكد من أرشفة الطالب ${student.fullName}؟`)) {
                                                        archiveStudent(student.id);
                                                    }
                                                }}
                                                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                                            >
                                                <Archive size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedStudentForModal(student);
                                            }}
                                            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                        >
                                            <FileText size={18} />
                                        </button>
                                        {user?.role !== 'teacher' && (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(`https://wa.me/${student.parentPhone}`, '_blank');
                                                    }}
                                                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all"
                                                >
                                                    <MessageCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.location.href = `tel:${student.parentPhone}`;
                                                    }}
                                                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                >
                                                    <Phone size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* السطر الثالث: الملحوظة */}
                                <div className="flex items-center gap-2">
                                    {/* نص الملحوظة */}
                                    <div className="bg-gray-50/60 rounded-xl p-2 border border-gray-100 text-right flex-1 group-hover:bg-blue-50/20 transition-colors relative min-h-[38px] flex items-center">
                                        {student.lastNoteDate && (
                                            <span className="absolute left-2 top-0.5 text-[7px] text-gray-300 font-bold">
                                                {student.lastNoteDate}
                                            </span>
                                        )}
                                        <p className="text-[10px] font-bold text-gray-500 leading-tight line-clamp-2 pr-1">
                                            {student.lastNote}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </main>


            {/* نافذة الرسم البياني المنبثقة */}
            <AnimatePresence>
                {showChart && absentsByGroup.length > 0 && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowChart(false)}
                            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative z-10 overflow-hidden border border-white mx-auto"
                        >
                            {/* Header */}
                            <div className="bg-red-500 p-6 flex items-center justify-between text-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                        <BarChart2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl">توزيع الغياب</h3>
                                        <p className="text-red-100 text-[10px] font-bold">بناءً على المجموعات لـ {getDateStr(selectedDateMode)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowChart(false)}
                                    className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center hover:bg-black/20 transition-all active:scale-90"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 sm:p-6 flex-1 overflow-hidden flex flex-col">
                                <div className="w-full h-[60vh]" dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={absentsByGroup} layout="vertical" margin={{ left: 20, right: 40, top: 20, bottom: 20 }}>
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                axisLine={false}
                                                tickLine={false}
                                                width={120}
                                                interval={0}
                                                tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-gray-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-xl">
                                                                {payload[0].value} طالب غائب
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={32}>
                                                {absentsByGroup.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#f87171'} />
                                                ))}
                                                <LabelList dataKey="count" position="right" style={{ fontSize: 14, fontWeight: '900', fill: '#ef4444' }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-center shrink-0">
                                <Button
                                    onClick={() => setShowChart(false)}
                                    className="bg-gray-900 text-white hover:bg-black px-12 rounded-2xl font-black h-12 shadow-lg shadow-gray-200 w-full sm:w-auto"
                                >
                                    إغلاق
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* نافذة الرسم البياني للحضور المنبثقة */}
            <AnimatePresence>
                {showPresentChart && presentsByGroup.length > 0 && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPresentChart(false)}
                            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative z-10 overflow-hidden border border-white mx-auto"
                        >
                            {/* Header */}
                            <div className="bg-green-500 p-6 flex items-center justify-between text-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl">توزيع الحضور</h3>
                                        <p className="text-green-100 text-[10px] font-bold">بناءً على المجموعات لـ {getDateStr(selectedDateMode)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPresentChart(false)}
                                    className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center hover:bg-black/20 transition-all active:scale-90"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 sm:p-6 flex-1 overflow-hidden flex flex-col">
                                <div className="w-full h-[60vh]" dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={presentsByGroup} layout="vertical" margin={{ left: 20, right: 40, top: 20, bottom: 20 }}>
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                axisLine={false}
                                                tickLine={false}
                                                width={120}
                                                interval={0}
                                                tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-gray-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-xl">
                                                                {payload[0].value} طالب حاضر
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={32}>
                                                {presentsByGroup.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#4ade80'} />
                                                ))}
                                                <LabelList dataKey="count" position="right" style={{ fontSize: 14, fontWeight: '900', fill: '#22c55e' }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-center shrink-0">
                                <Button
                                    onClick={() => setShowPresentChart(false)}
                                    className="bg-gray-900 text-white hover:bg-black px-12 rounded-2xl font-black h-12 shadow-lg shadow-gray-200 w-full sm:w-auto"
                                >
                                    إغلاق
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* نافذة التفاصيل - تعمل الآن عند الضغط على الأيقونات */}
            <StudentDetailModal
                student={selectedStudentForModal}
                isOpen={!!selectedStudentForModal}
                onClose={() => setSelectedStudentForModal(null)}
                initialTab="attendance"
            />
        </div >
    );
}

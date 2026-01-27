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

    // تصفية المجموعات للمدرس
    const filteredGroupsList = groups?.filter(g => {
        if (user?.role === 'teacher') return g.teacherId === user.teacherId;
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

    // دالة لحساب الغياب المتصل
    const calculateContinuousAbsence = (attendance: any[]) => {
        const today = new Date();
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

        // ترتيب الحضور من الأحدث للأقدم
        const sortedAttendance = attendance
            .filter(a => a.month === currentMonth)
            .sort((a, b) => b.day - a.day);

        let continuous = 0;
        for (let i = 0; i < sortedAttendance.length; i++) {
            if (sortedAttendance[i].status === 'absent') {
                continuous++;
            } else {
                break;
            }
        }
        return continuous;
    };

    // دالة لحساب إجمالي الغياب في الشهر الحالي
    const calculateTotalAbsence = (attendance: any[]) => {
        const today = new Date();
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

        return attendance.filter(a =>
            a.month === currentMonth && a.status === 'absent'
        ).length;
    };

    // جلب بيانات الحضور والملحوظات لجميع الطلاب
    const { data: reportData } = useQuery({
        queryKey: ['report-data'],
        queryFn: async () => {
            const { getStudentAttendance, getLatestNotes } = await import('@/features/students/services/recordsService');
            const attendancePromises = (students || []).map(s =>
                getStudentAttendance(s.id).catch(() => [])
            );
            const [attendanceResults, latestNotes] = await Promise.all([
                Promise.all(attendancePromises),
                getLatestNotes()
            ]);
            const attendanceMap: Record<string, any[]> = {};
            (students || []).forEach((s, i) => {
                attendanceMap[s.id] = attendanceResults[i];
            });
            return { attendanceMap, latestNotes };
        },
        enabled: !!(students && students.length > 0)
    });

    const allAttendanceData = reportData?.attendanceMap;
    const allLatestNotes = reportData?.latestNotes;

    // معالجة بيانات الطلاب مع الحضور الحقيقي
    const processedStudents = useMemo(() => {
        return (students || [])
            .filter(s => {
                if (user?.role === 'teacher') {
                    return s.groupId && assignedGroupIds.includes(s.groupId);
                }
                return s.status === 'active';
            })
            .map((s) => {
                const attendance = allAttendanceData?.[s.id] || [];
                const totalAbsences = calculateTotalAbsence(attendance);
                const continuousAbsences = calculateContinuousAbsence(attendance);
                const latestNote = allLatestNotes?.[s.id];

                return {
                    ...s,
                    totalAbsences,
                    continuousAbsences,
                    lastNote: latestNote?.text || "لا توجد ملحوظات مسجلة",
                    lastNoteDate: latestNote?.date || "",
                    groupName: groups?.find(g => g.id === s.groupId)?.name || 'غير محدد'
                };
            });
    }, [students, allAttendanceData, groups, user, assignedGroupIds]);

    // تصفية الطلاب بناءً على المدخلات
    const filteredStudents = processedStudents.filter(s => {
        const matchesGroup = selectedGroupId === 'all' || s.groupId === selectedGroupId;

        const contLimit = Number(continuousAbsenceLimit);
        const totLimit = Number(totalAbsenceLimit);

        // إذا كانت الخانات فارغة، لا نطبق الفلتر الخاص بها
        const matchesContinuous = contLimit > 0 ? s.continuousAbsences >= contLimit : false;
        const matchesTotal = totLimit > 0 ? s.totalAbsences >= totLimit : false;

        // إذا لم يتم إدخال أي أرقام، نظهر كل طلاب المجموعة المختارة
        if (!contLimit && !totLimit) return matchesGroup;

        // إذا تم إدخال رقم في خانة واحدة، نظهر ما يطابق هذا الشرط فقط
        if (contLimit && !totLimit) return matchesGroup && matchesContinuous;
        if (!contLimit && totLimit) return matchesGroup && matchesTotal;

        // إذا تم إدخال أرقام في الخانتين، نظهر من ينطبق عليه أي من الشرطين
        return matchesGroup && (matchesContinuous || matchesTotal);
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

            setRecordedAttendance(prev => ({ ...prev, [studentId]: status }));

            // إعادة تحميل بيانات الحضور
            queryClient.invalidateQueries({ queryKey: ['all-attendance'] });

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
                    {/* السطر الأول: التواريخ والإحصائيات */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex bg-gray-200/50 p-1 rounded-[14px] shrink-0">
                            {['before', 'yesterday', 'today'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setSelectedDateMode(mode as any)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-[10px] text-[10px] font-black transition-all",
                                        selectedDateMode === mode ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    {mode === 'today' ? 'اليوم' : mode === 'yesterday' ? 'أمس' : 'أول أمس'}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="bg-green-50/50 border border-green-100 rounded-[14px] py-1.5 px-3 flex items-center gap-2">
                                <span className="text-[10px] font-black text-green-700">حاضر</span>
                                <span className="text-xl font-black text-green-600 font-sans">{dailyStats.present}</span>
                            </div>
                            <button
                                onClick={() => setShowChart(!showChart)}
                                className={cn(
                                    "border rounded-[14px] py-1.5 px-3 flex items-center gap-2 transition-all active:scale-95 shadow-sm",
                                    showChart ? "bg-red-500 border-red-600 text-white" : "bg-red-50/50 border-red-100 text-red-700"
                                )}
                            >
                                <div className="flex flex-col items-end">
                                    <span className={cn("text-[9px] font-black leading-tight", showChart ? "text-red-100" : "text-red-700")}>غائب</span>
                                    <span className={cn("text-xl font-black font-sans leading-none", showChart ? "text-white" : "text-red-500")}>{dailyStats.absent}</span>
                                </div>
                                <BarChart2 size={20} className={showChart ? "text-white" : "text-red-400"} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
                {/* السطر الثاني: الفلاتر والعدد الإجمالي (أصبح الآن جزءاً من محتوى الصفحة) */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {/* اختيار المجموعة */}
                    <div className="relative shrink-0">
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="appearance-none bg-white border border-gray-100 px-8 py-2.5 pr-3 rounded-[16px] text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 min-w-[130px] shadow-sm cursor-pointer"
                        >
                            <option value="all">كل المجموعات</option>
                            {filteredGroupsList?.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* غياب متصل */}
                    <div className="relative flex items-center bg-white border border-gray-100 px-2 py-1 rounded-[16px] gap-1.5 shadow-sm shrink-0">
                        <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={continuousAbsenceLimit}
                            onChange={(e) => setContinuousAbsenceLimit(e.target.value.replace(/\D/g, ''))}
                            className="w-9 h-8 bg-gray-50 rounded-[10px] text-center font-black text-blue-600 focus:outline-none border-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] font-black text-gray-400 whitespace-nowrap ml-1">متصل</span>
                    </div>

                    {/* غياب كلي */}
                    <div className="relative flex items-center bg-white border border-gray-100 px-2 py-1 rounded-[16px] gap-1.5 shadow-sm shrink-0">
                        <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={totalAbsenceLimit}
                            onChange={(e) => setTotalAbsenceLimit(e.target.value.replace(/\D/g, ''))}
                            className="w-9 h-8 bg-gray-50 rounded-[10px] text-center font-black text-amber-600 focus:outline-none border-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] font-black text-gray-400 whitespace-nowrap ml-1">فأكثر</span>
                    </div>

                    {/* المساحة الفاصلة والعدد */}
                    <div className="flex-1" />
                    <div className="w-11 h-11 bg-white border border-blue-100 rounded-[16px] flex items-center justify-center shadow-sm shrink-0">
                        <span className="text-lg font-black text-blue-600 font-sans">{filteredStudents.length}</span>
                    </div>
                </div>

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
                                <div className="p-6 space-y-6">
                                    <div className="h-[250px] w-full" dir="ltr">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={absentsByGroup} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    dataKey="name"
                                                    type="category"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={90}
                                                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
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
                                                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                                                    {absentsByGroup.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#f87171'} />
                                                    ))}
                                                    <LabelList dataKey="count" position="right" style={{ fontSize: 12, fontWeight: '900', fill: '#ef4444' }} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {absentsByGroup.slice(0, 4).map((item, idx) => (
                                            <div key={idx} className="bg-red-50/30 rounded-2xl p-3 border border-red-100/30 flex items-center justify-between">
                                                <span className="text-[10px] font-black text-gray-500 truncate ml-2">{item.name}</span>
                                                <span className="w-7 h-7 bg-red-500 text-white rounded-lg flex items-center justify-center text-[11px] font-black">{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-center">
                                    <Button
                                        onClick={() => setShowChart(false)}
                                        className="bg-gray-900 text-white hover:bg-black px-12 rounded-2xl font-black h-12 shadow-lg shadow-gray-200"
                                    >
                                        فهمت
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>



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
                                                        window.open(`https://wa.me/2${student.parentPhone}`, '_blank');
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

                                {/* السطر الثالث: نص الملحوظة مباشرة */}
                                <div className="bg-gray-50/60 rounded-xl p-2.5 border border-gray-100 text-right group-hover:bg-blue-50/20 transition-colors relative">
                                    {student.lastNoteDate && (
                                        <span className="absolute left-2.5 top-2 text-[9px] text-gray-300 font-bold bg-white/50 px-1.5 py-0.5 rounded-md border border-gray-100">
                                            {student.lastNoteDate}
                                        </span>
                                    )}
                                    <p className="text-[11px] font-bold text-gray-600 leading-normal line-clamp-2 pl-12 pr-1">
                                        {student.lastNote}
                                    </p>
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
                            <div className="p-6 space-y-6">
                                <div className="h-[250px] w-full" dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={absentsByGroup} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                axisLine={false}
                                                tickLine={false}
                                                width={90}
                                                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
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
                                            <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                                                {absentsByGroup.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#f87171'} />
                                                ))}
                                                <LabelList dataKey="count" position="right" style={{ fontSize: 12, fontWeight: '900', fill: '#ef4444' }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {absentsByGroup.slice(0, 4).map((item, idx) => (
                                        <div key={idx} className="bg-red-50/30 rounded-2xl p-3 border border-red-100/30 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-gray-500 truncate ml-2">{item.name}</span>
                                            <span className="w-7 h-7 bg-red-500 text-white rounded-lg flex items-center justify-center text-[11px] font-black">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-center">
                                <Button
                                    onClick={() => setShowChart(false)}
                                    className="bg-gray-900 text-white hover:bg-black px-12 rounded-2xl font-black h-12 shadow-lg shadow-gray-200"
                                >
                                    فهمت
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
                initialTab="notes"
            />
        </div>
    );
}

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
    X
} from 'lucide-react';
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
            {/* Title */}
            <div className="max-w-5xl mx-auto p-4 md:p-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">تقرير الحضور</h1>
            </div>

            <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-8">

                {/* التقرير اليومي */}
                <section className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex bg-gray-100 p-1 rounded-2xl">
                                {['before', 'yesterday', 'today'].map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setSelectedDateMode(mode as any)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                            selectedDateMode === mode ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                        )}
                                    >
                                        {mode === 'today' ? 'اليوم' : mode === 'yesterday' ? 'أمس' : 'أول أمس'}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 px-4 h-11 rounded-2xl border border-gray-100 min-w-[140px]">
                                <span className="text-sm font-bold text-gray-600 font-sans">{getDateStr(selectedDateMode)}</span>
                                <Calendar size={16} className="text-gray-400" />
                            </div>
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">التقرير اليومي</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-50/50 border border-green-100 rounded-[28px] p-6 flex flex-col items-center justify-center text-center">
                            <span className="text-4xl font-black text-green-600 mb-1 font-sans">{dailyStats.present}</span>
                            <span className="text-sm font-bold text-green-700">حاضر</span>
                        </div>
                        <div className="bg-red-50/50 border border-red-100 rounded-[28px] p-6 flex flex-col items-center justify-center text-center">
                            <span className="text-4xl font-black text-red-500 mb-1 font-sans">{dailyStats.absent}</span>
                            <span className="text-sm font-bold text-red-700">غائب</span>
                            <span className="text-[10px] text-red-400 font-medium mt-1">(انقر لعرض التفاصيل)</span>
                        </div>
                    </div>
                </section>

                {/* تصفية الطلاب الأكثر غياباً */}
                <section className="space-y-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
                            {/* اختيار المجموعة */}
                            <div className="relative inline-block text-right">
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    className="appearance-none bg-white border border-gray-100 px-10 py-2.5 pr-4 rounded-2xl text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 min-w-[150px]"
                                >
                                    <option value="all">كل المجموعات</option>
                                    {filteredGroupsList?.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>

                            {/* غياب متصل */}
                            <div className="relative flex items-center bg-white border border-gray-100 px-3 py-1 rounded-2xl gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    value={continuousAbsenceLimit}
                                    onChange={(e) => setContinuousAbsenceLimit(e.target.value.replace(/\D/g, ''))}
                                    className="w-10 h-9 bg-gray-50 rounded-xl text-center font-black text-blue-600 focus:outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-xs font-bold text-gray-400 whitespace-nowrap">متصل</span>
                            </div>

                            {/* غياب كلي (الرقم بجانبه) */}
                            <div className="relative flex items-center bg-white border border-gray-100 px-3 py-1 rounded-2xl gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    value={totalAbsenceLimit}
                                    onChange={(e) => setTotalAbsenceLimit(e.target.value.replace(/\D/g, ''))}
                                    className="w-10 h-9 bg-gray-50 rounded-xl text-center font-black text-amber-600 focus:outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-xs font-bold text-gray-400 whitespace-nowrap">فأكثر</span>
                            </div>
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">
                            العدد: {filteredStudents.length}
                        </h2>
                    </div>

                    {/* شبكة الطلاب */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    className="bg-white rounded-[40px] p-6 shadow-sm border border-gray-100 flex flex-col gap-6 relative group"
                                >
                                    {/* السطر الأول: البيانات الأساسية وشارات الغياب */}
                                    {/* السطر الأول: الاسم والمجموعة */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-blue-50 rounded-[22px] flex items-center justify-center text-blue-600 relative shrink-0">
                                            <User size={28} />
                                            <span className="absolute -top-1 -right-1 w-6 h-6 bg-white border-2 border-blue-50 text-[10px] font-black rounded-full flex items-center justify-center shadow-md">
                                                {idx + 1}
                                            </span>
                                        </div>
                                        <div className="text-right flex-1">
                                            <h3 className="font-bold text-gray-900 text-lg">{student.fullName}</h3>
                                            <span className="text-[11px] text-gray-400 font-bold bg-gray-50 px-2.5 py-1 rounded-xl inline-block mt-1">
                                                {student.groupName}
                                            </span>
                                        </div>
                                    </div>

                                    {/* السطر الثاني: إحصائيات الغياب */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 bg-red-50 px-4 py-3 rounded-2xl border border-red-100/50 text-center">
                                            <span className="text-red-500 font-black text-lg font-sans block">{student.totalAbsences}</span>
                                            <span className="text-[10px] text-red-600 font-bold">إجمالي غياب</span>
                                        </div>
                                        <div className="flex-1 bg-amber-50 px-4 py-3 rounded-2xl border border-amber-100/50 text-center">
                                            <span className="text-amber-600 font-black text-lg font-sans block">{student.continuousAbsences}</span>
                                            <span className="text-[10px] text-amber-700 font-bold">غياب متصل</span>
                                        </div>
                                    </div>

                                    {/* السطر الثاني: آخر ملحوظة (تصميم الصندوق مع الأيقونة) */}
                                    <div className="bg-gray-50/70 rounded-[28px] p-4 flex flex-row-reverse items-center gap-4 border border-gray-100/50 relative">
                                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex-1 text-right">
                                            <p className="text-sm text-gray-600 font-bold leading-relaxed">
                                                {student.lastNote}
                                            </p>
                                            {student.lastNoteDate && (
                                                <p className="text-[10px] text-gray-400 font-bold mt-1">{student.lastNoteDate}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* السطر الثالث: أيقونات الإجراءات (الواتساب، الاتصال، الملحوظات، الأرشفة) */}
                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            onClick={() => setSelectedStudentForModal(student)}
                                            className="w-11 h-11 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-white hover:shadow-md transition-all group/btn"
                                        >
                                            <ChevronRight size={20} className="text-gray-300 group-hover/btn:text-blue-500 transition-colors" />
                                        </button>

                                        <div className="flex items-center gap-4">
                                            {/* أزرار الحضور والغياب - فقط للمدرسين */}
                                            {(() => {
                                                const today = new Date();
                                                const day = today.getDate();
                                                const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

                                                const studentAttendance = allAttendanceData?.[student.id] || [];
                                                const todayRecord = studentAttendance.find(a => a.day === day && a.month === month);
                                                const currentStatus = recordedAttendance[student.id] || todayRecord?.status;

                                                const isTeacher = user?.role === 'teacher';
                                                const disableForTeacher = isTeacher && selectedDateMode !== 'today';

                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => recordAttendance(student.id, 'present')}
                                                            disabled={attendanceLoading[student.id] || disableForTeacher}
                                                            className={cn(
                                                                "w-10 h-10 flex items-center justify-center rounded-2xl transition-all",
                                                                currentStatus === 'present'
                                                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                                                                    : 'text-gray-400 hover:text-green-500 hover:bg-green-50',
                                                                (attendanceLoading[student.id] || disableForTeacher) && 'opacity-50 cursor-not-allowed'
                                                            )}
                                                            title={disableForTeacher ? "لا يمكن التسجيل لغير اليوم" : "حاضر"}
                                                        >
                                                            <Check size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => recordAttendance(student.id, 'absent')}
                                                            disabled={attendanceLoading[student.id] || disableForTeacher}
                                                            className={cn(
                                                                "w-10 h-10 flex items-center justify-center rounded-2xl transition-all",
                                                                currentStatus === 'absent'
                                                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                                                                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50',
                                                                (attendanceLoading[student.id] || disableForTeacher) && 'opacity-50 cursor-not-allowed'
                                                            )}
                                                            title={disableForTeacher ? "لا يمكن التسجيل لغير اليوم" : "غائب"}
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </div>
                                                );
                                            })()}

                                            {user?.role !== 'teacher' && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`هل أنت متأكد من أرشفة الطالب ${student.fullName}؟`)) {
                                                            archiveStudent(student.id);
                                                        }
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-2xl transition-all"
                                                    title="أرشفة"
                                                >
                                                    <Archive size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedStudentForModal(student);
                                                    // فتح تبويب الملحوظات مباشرة
                                                }}
                                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-2xl transition-all"
                                                title="سجل الملحوظات"
                                            >
                                                <FileText size={20} />
                                            </button>
                                            {user?.role !== 'teacher' && (
                                                <>
                                                    <button
                                                        onClick={() => window.open(`https://wa.me/2${student.parentPhone}`, '_blank')}
                                                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-2xl transition-all"
                                                        title="واتساب"
                                                    >
                                                        <MessageCircle size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => window.location.href = `tel:${student.parentPhone}`}
                                                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                                                        title="اتصال"
                                                    >
                                                        <Phone size={20} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>
            </main>

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

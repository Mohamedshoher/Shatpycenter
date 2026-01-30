"use client";

import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Calendar,
    CreditCard,
    BookOpen,
    FileText,
    Phone,
    User,
    CheckCircle2,
    XCircle,
    Archive,
    MessageCircle,
    Trash2,
    RotateCcw,
    Clock,
    Edit3
} from 'lucide-react';
import { useStudents } from '../hooks/useStudents';
import { Student } from '@/types';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { useStudentRecords } from '../hooks/useStudentRecords';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { updateStudent } from '../services/studentService';

interface StudentDetailModalProps {
    student: Student | null;
    isOpen: boolean;
    onClose: () => void;
    initialTab?: string;
    currentAttendance?: 'present' | 'absent' | null;
    onEdit?: (student: Student) => void;
}

export default function StudentDetailModal({ student: initialStudent, isOpen, onClose, initialTab = 'attendance', currentAttendance, onEdit }: StudentDetailModalProps) {
    const { user } = useAuthStore();
    const { data: groups = [] } = useGroups();
    const isDirector = user?.role === 'director';
    const isSupervisor = user?.role === 'supervisor';
    const canEditAttendance = isDirector || isSupervisor;

    const [activeTab, setActiveTab] = useState(initialTab);

    // --- Hooks ---
    const { data: students } = useStudents();
    const student = students?.find(s => s.id === initialStudent?.id) || initialStudent;

    const {
        attendance,
        exams,
        fees,
        notes,
        addAttendance,
        addExam,
        addFee,
        addNote,
        deleteExam,
        deleteFee,
        deleteNote,
    } = useStudentRecords(student?.id || '');

    const { archiveStudent, restoreStudent } = useStudents();
    const queryClient = useQueryClient();

    // --- State: Calendar Month Navigation ---
    const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());

    const goToPreviousMonth = () => {
        setCurrentDisplayDate(new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDisplayDate(new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth() + 1, 1));
    };

    const currentYear = currentDisplayDate.getFullYear();
    const currentMonth = currentDisplayDate.getMonth();
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);

    // --- State: Forms ---
    const [feeAmount, setFeeAmount] = useState('150');
    const [receiptNum, setReceiptNum] = useState('');
    const [surahName, setSurahName] = useState('');
    const [examType, setExamType] = useState('جديد');
    const [examGrade, setExamGrade] = useState('ممتاز');
    const [noteText, setNoteText] = useState('');
    const [activeExamSubTab, setActiveExamSubTab] = useState<'جديد' | 'ماضي قريب' | 'ماضي بعيد'>('جديد');

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMonth, setPaymentMonth] = useState('');
    const [paymentMonthKey, setPaymentMonthKey] = useState('');
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);

    const weekDaysNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const [selectedSchedules, setSelectedSchedules] = useState<Record<string, string>>({});

    // مصفوفة المواعيد المهيكلة (يتم استنتاجها من student.appointment)
    useEffect(() => {
        if (student?.appointment && isOpen) {
            if (student.appointment.includes(':')) {
                const parts = student.appointment.split(',').map(p => p.trim());
                const newSchedules: Record<string, string> = {};

                parts.forEach(p => {
                    const colonIdx = p.indexOf(':');
                    if (colonIdx !== -1) {
                        const day = p.slice(0, colonIdx).trim();
                        const timeText = p.slice(colonIdx + 1).trim();

                        if (weekDaysNames.includes(day)) {
                            // محاولة استخراج الوقت الرقمي (مثل 4:30)
                            const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
                            if (timeMatch) {
                                let h = parseInt(timeMatch[1]);
                                const m = timeMatch[2];
                                const isPM = timeText.includes('عصر') || timeText.includes('م') || timeText.includes('مساء');
                                if (isPM && h < 12) h += 12;
                                if (!isPM && h === 12) h = 0;
                                newSchedules[day] = `${h.toString().padStart(2, '0')}:${m}`;
                            } else {
                                newSchedules[day] = '16:00'; // افتراضي
                            }
                        }
                    }
                });

                if (Object.keys(newSchedules).length > 0) {
                    setSelectedSchedules(newSchedules);
                }
            }
        } else {
            setSelectedSchedules({});
        }
    }, [student?.appointment, isOpen]);

    const formatTimeToArabic = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':').map(Number);
        const period = hours >= 12 ? 'عصراً' : 'صباحاً';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `الساعة ${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    const updateScheduleMutation = useMutation({
        mutationFn: (appointment: string) => {
            if (!student?.id) throw new Error('Student ID is missing');
            return updateStudent(student.id, { appointment });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 2000);
        },
        onError: (error: any) => {
            console.error("Mutation error details:", error);
            const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            if (errorMsg.includes('column "appointment" of relation "students" does not exist')) {
                alert('خطأ: عمود المواعيد غير موجود. يرجى مراجعة التعليمات السابقة.');
            } else {
                alert('حدث خطأ أثناء الحفظ: ' + errorMsg);
            }
        }
    });

    const handleDeleteAppointment = (dayToDelete: string) => {
        if (!student?.appointment) return;
        const parts = student.appointment.split(',').map(p => p.trim());
        const filteredParts = parts.filter(p => {
            const colonIdx = p.indexOf(':');
            const day = colonIdx !== -1 ? p.slice(0, colonIdx).trim() : p.trim();
            return day !== dayToDelete;
        });
        updateScheduleMutation.mutate(filteredParts.join(', '));
    };

    const handleEditAppointment = (day: string, timeStr: string) => {
        // محاولة استخراج الوقت الرقمي من التنسيق العربي (مثال: الساعة ٤:٣٠ عصراً)
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
        let timeValue = '16:00';
        if (timeMatch) {
            let h = parseInt(timeMatch[1]);
            const m = timeMatch[2];
            const isPM = timeStr.includes('عصر') || timeStr.includes('م') || timeStr.includes('مساء');
            if (isPM && h < 12) h += 12;
            if (!isPM && h === 12) h = 0;
            timeValue = `${h.toString().padStart(2, '0')}:${m}`;
        }

        setSelectedSchedules(prev => ({
            ...prev,
            [day]: timeValue
        }));

        // التمرير للأعلى لمنطقة التعديل
        const element = document.getElementById('schedule-controls');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSaveSchedule = () => {
        const inputDays = Object.keys(selectedSchedules);
        if (inputDays.length === 0) return alert('برجاء اختيار يوم واحد على الأقل');

        // جلب المواعيد القديمة ودمجها مع الجديدة (تحديث الموجود وإضافة الجديد)
        const currentParts = student?.appointment ? student.appointment.split(',').map(p => p.trim()) : [];
        const finalSchedules: Record<string, string> = {};

        // 1. وضع المواعيد الحالية
        currentParts.forEach(p => {
            const colonIdx = p.indexOf(':');
            if (colonIdx !== -1) {
                const d = p.slice(0, colonIdx).trim();
                const t = p.slice(colonIdx + 1).trim();
                finalSchedules[d] = t;
            }
        });

        // 2. دمج التعديلات الجديدة
        inputDays.forEach(day => {
            finalSchedules[day] = formatTimeToArabic(selectedSchedules[day]);
        });

        const appointmentString = Object.keys(finalSchedules)
            .sort((a, b) => weekDaysNames.indexOf(a) - weekDaysNames.indexOf(b))
            .map(day => `${day}: ${finalSchedules[day]}`)
            .join(', ');

        updateScheduleMutation.mutate(appointmentString);
        setSelectedSchedules({}); // تفريغ منطقة التحكم بعد الإضافة
    };

    // --- Effects ---
    useEffect(() => {
        if (isOpen) {
            if (initialTab) setActiveTab(initialTab);
            if (student?.monthlyAmount) setFeeAmount(student.monthlyAmount.toString());
        }
    }, [isOpen, initialTab, student]);

    useEffect(() => {
        const handleAttendanceUpdate = (e: any) => {
            if (student && e.detail.studentId === student.id) {
                // 1. تحديث الكاش فوراً بالبيانات الصحيحة
                queryClient.setQueryData(['attendance', student.id], (old: any) => {
                    const records = Array.isArray(old) ? old : [];
                    // إزالة أي سجل قديم لنفس اليوم لتجنب التكرار
                    const filtered = records.filter((r: any) => !(r.day === e.detail.day && r.month === e.detail.month));
                    // إضافة السجل الجديد بالحالة المرسلة (حاضر أو غائب)
                    return [...filtered, {
                        studentId: student.id,
                        day: e.detail.day,
                        month: e.detail.month,
                        status: e.detail.status
                    }];
                });

                // 2. إجبار المكون على إعادة القراءة من الكاش المحدث
                queryClient.invalidateQueries({ queryKey: ['attendance', student.id] });
            }
        };
        window.addEventListener('updateAttendance', handleAttendanceUpdate);
        return () => window.removeEventListener('updateAttendance', handleAttendanceUpdate);
    }, [student, queryClient]);


    // --- Memoized Data ---
    const attendanceRecords = useMemo(() => {
        const records: Record<number, 'present' | 'absent'> = {};
        attendance.forEach(rec => {
            if (rec.month === monthKey) {
                records[rec.day] = rec.status;
            }
        });
        return records;
    }, [attendance, monthKey]);

    const isArchived = student?.status === 'archived';

    // --- Handlers ---
    const handleWhatsApp = () => {
        if (student?.parentPhone) {
            const phone = student.parentPhone.startsWith('01') ? `2${student.parentPhone}` : student.parentPhone;
            window.open(`https://wa.me/${phone}`, '_blank');
        }
    };

    const handleCall = () => {
        if (student?.parentPhone) {
            window.location.href = `tel:${student.parentPhone}`;
        }
    };

    const handleArchiveToggle = () => {
        if (!student || user?.role === 'teacher') return;
        if (isArchived) {
            if (confirm(`هل أنت متأكد من استعادة الطالب ${student.fullName}؟`)) {
                restoreStudent(student.id, student.groupId || null);
                onClose();
            }
        } else {
            if (confirm(`هل أنت متأكد من أرشفة الطالب ${student.fullName}؟`)) {
                archiveStudent(student.id);
                onClose();
            }
        }
    };

    const handleAddFee = async () => {
        if (!student) return;
        if (!receiptNum) return alert('برجاء إدخال رقم الوصل');

        const now = new Date();
        const monthToUse = paymentMonthKey || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const labelToUse = paymentMonth || now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
        const dateString = now.toISOString().split('T')[0];

        // 1. تسجل في سجل رسوم الطالب
        addFee.mutate({
            studentId: student.id,
            month: monthToUse,
            amount: `${feeAmount} ج.م`,
            receipt: receiptNum,
            date: dateString,
            createdBy: user?.displayName || 'غير معروف',
        });

        // 2. تسجل كعملية مالية عامة (إيراد)
        try {
            const { addTransaction } = await import('@/features/finance/services/financeService');
            await addTransaction({
                amount: Number(feeAmount.replace(/[^0-9.]/g, '')),
                type: 'income',
                category: 'fees',
                date: dateString,
                description: `رسوم شهر ${labelToUse} - الطالب: ${student.fullName} (وصل: ${receiptNum})`,
                relatedUserId: student.id,
                performedBy: user?.uid || 'غير معروف'
            });
        } catch (error) {
            console.error("Error adding financial transaction:", error);
        }

        setReceiptNum('');
        setIsPaymentModalOpen(false);
    };

    const handleDeleteFee = async (id: string, receipt?: string) => {
        if (confirm('هل أنت متأكد من حذف هذا السجل المالي؟')) {
            if (receipt && student) {
                try {
                    const { deleteTransactionByCriteria } = await import('@/features/finance/services/financeService');
                    await deleteTransactionByCriteria({
                        description_like: receipt,
                        related_user_id: student.id
                    });
                } catch (error) {
                    console.error("Error syncing deletion:", error);
                }
            }
            deleteFee.mutate(id);
        }
    };

    const handleAddExam = () => {
        if (!student) return;
        if (!surahName) return alert('برجاء إدخال اسم السورة');

        addExam.mutate({
            studentId: student.id,
            surah: surahName,
            type: examType,
            grade: examGrade,
            date: new Date().toISOString().split('T')[0],
        });
        setSurahName('');
    };

    const handleDeleteExam = (id: string) => {
        if (confirm('هل أنت متأكد من حذف نتيجة هذا الاختبار؟')) {
            deleteExam.mutate(id);
        }
    };

    const handleAddNote = () => {
        if (!noteText) return alert('برجاء كتابة الملحوظة');
        addNote.mutate({
            content: noteText,
            type: 'positive',
            createdBy: user?.displayName || 'المدير',
        });
        setNoteText('');
    };

    const handleDeleteNote = (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذه الملحوظة؟')) {
            deleteNote.mutate(id);
        }
    };

    if (!student) return null;

    const tabs = [
        { id: 'attendance', label: 'سجل الحضور', icon: Calendar },
        { id: 'schedule', label: 'مواعيد الحضور', icon: Clock },
        { id: 'fees', label: 'سجل المصروفات', icon: CreditCard },
        { id: 'exams', label: 'سجل الاختبارات', icon: BookOpen },
        { id: 'notes', label: 'سجل الملحوظات', icon: FileText },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'attendance':
                const weekDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
                const startDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 1) % 7;
                const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-2xl">
                            <button onClick={goToNextMonth} className="text-gray-400 hover:text-blue-600 p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                            <h3 className="font-bold text-gray-900 text-lg">
                                سجل {monthNames[currentMonth]} {currentYear}
                            </h3>
                            <button onClick={goToPreviousMonth} className="text-gray-400 hover:text-blue-600 p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                            {weekDays.map(day => (
                                <span key={day} className="text-[10px] text-gray-400 font-bold">{day}</span>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {Array.from({ length: startDayIndex }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}

                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const status = attendanceRecords[day];
                                const isFuture = new Date(currentYear, currentMonth, day) > new Date();

                                return (
                                    <div
                                        key={day}
                                        className={cn(
                                            "aspect-square rounded-xl flex flex-col items-center justify-center border transition-all duration-200 text-sm font-bold shadow-sm",
                                            isFuture ? "bg-gray-50/50 border-gray-50 text-gray-200 pointer-events-none" :
                                                status === 'absent' ? "bg-red-50 border-red-100 text-red-600" :
                                                    status === 'present' ? "bg-green-50 border-green-100 text-green-600" :
                                                        "bg-white border-gray-100 text-gray-400",
                                            (canEditAttendance) && !isFuture ? "cursor-pointer hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 active:scale-90" : "cursor-default"
                                        )}
                                        onClick={() => {
                                            if (!isFuture && canEditAttendance && student) {
                                                const newStatus = status === 'present' ? 'absent' : 'present';
                                                addAttendance.mutate({
                                                    studentId: student.id,
                                                    day: day,
                                                    month: monthKey,
                                                    status: newStatus
                                                });
                                            }
                                        }}
                                    >
                                        <span className="mb-1">{day}</span>
                                        {!isFuture && (status === 'absent' ? <XCircle size={14} /> : status === 'present' ? <CheckCircle2 size={14} /> : null)}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="bg-blue-50/50 p-4 rounded-2xl flex justify-around mt-6 border border-blue-100">
                            <div className="text-center">
                                <p className="text-xs text-blue-400 font-black mb-1">حضور</p>
                                <p className="text-2xl font-black text-blue-600">
                                    {Object.values(attendanceRecords).filter(s => s === 'present').length}
                                </p>
                            </div>
                            <div className="text-center border-x-2 border-dashed border-blue-200 px-8">
                                <p className="text-xs text-blue-400 font-black mb-1">غياب</p>
                                <p className="text-2xl font-black text-red-500">
                                    {Object.values(attendanceRecords).filter(s => s === 'absent').length}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-blue-400 font-black mb-1">نسبة</p>
                                <p className="text-2xl font-black text-blue-600">
                                    {Math.round((Object.values(attendanceRecords).filter(s => s === 'present').length / (Object.keys(attendanceRecords).length || 1)) * 100)}%
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 'schedule':
                return (
                    <div className="space-y-6">
                        <div id="schedule-controls" className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] text-white space-y-4 shadow-xl shadow-blue-500/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-md">
                                    <Clock size={20} className="sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-base sm:text-lg">تحديد مواعيد الحضور</h4>
                                    <p className="text-blue-100 text-[10px] sm:text-xs">اختر الأيام والساعات المناسبة للطالب</p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-blue-100 mr-1 italic">أيام الحضور في الإسبوع</label>
                                    <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
                                        {weekDaysNames.map(day => {
                                            const isSelected = !!selectedSchedules[day];
                                            return (
                                                <button
                                                    key={day}
                                                    onClick={() => {
                                                        setSelectedSchedules(prev => {
                                                            const next = { ...prev };
                                                            if (isSelected) {
                                                                delete next[day];
                                                            } else {
                                                                next[day] = '16:00';
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    className={cn(
                                                        "px-1 sm:px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-black transition-all border-2",
                                                        isSelected
                                                            ? "bg-white text-blue-600 border-white shadow-lg"
                                                            : "bg-blue-700/30 text-blue-100 border-blue-500/30 hover:bg-blue-700/50"
                                                    )}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {Object.keys(selectedSchedules).length > 0 && (
                                    <div className="space-y-3 bg-white/10 p-4 rounded-2xl border border-white/10">
                                        <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block mb-1">تحديد الوقت لك يوم</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {Object.keys(selectedSchedules).sort((a, b) => weekDaysNames.indexOf(a) - weekDaysNames.indexOf(b)).map(day => (
                                                <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 bg-white/10 p-3 rounded-xl border border-white/5">
                                                    <span className="text-sm font-black text-white">{day}</span>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="time"
                                                            value={selectedSchedules[day]}
                                                            onChange={(e) => {
                                                                const newTime = e.target.value;
                                                                setSelectedSchedules(prev => ({ ...prev, [day]: newTime }));
                                                            }}
                                                            className="flex-1 sm:w-32 h-10 bg-white/20 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-white/30 transition-all font-bold [color-scheme:dark]"
                                                        />
                                                        <span className="text-[10px] font-bold text-blue-100/70 whitespace-nowrap">
                                                            {formatTimeToArabic(selectedSchedules[day])}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleSaveSchedule}
                                    disabled={updateScheduleMutation.isPending || showSaveSuccess}
                                    className={cn(
                                        "w-full h-12 sm:h-14 rounded-2xl font-black text-base sm:text-lg shadow-xl active:scale-[0.98] transition-all",
                                        showSaveSuccess
                                            ? "bg-green-500 text-white"
                                            : "bg-white text-blue-600 hover:bg-blue-50"
                                    )}
                                >
                                    {updateScheduleMutation.isPending
                                        ? 'جاري الحفظ...'
                                        : showSaveSuccess
                                            ? 'تم الحفظ بنجاح ✓'
                                            : 'حفظ الجدول الجديد'}
                                </Button>
                            </div>
                        </div>

                        {/* عرض المواعيد الحالية */}
                        <div className="bg-gray-50/50 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-gray-100 space-y-4">
                            <h5 className="font-black text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                                <div className="w-1.5 h-5 sm:w-2 sm:h-6 bg-blue-500 rounded-full" />
                                المواعيد المسجلة حالياً
                            </h5>

                            {student?.appointment ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    {student.appointment.split(',').map((part, idx) => {
                                        const colonIdx = part.indexOf(':');
                                        const day = colonIdx !== -1 ? part.slice(0, colonIdx).trim() : part.trim();
                                        const time = colonIdx !== -1 ? part.slice(colonIdx + 1).trim() : '';
                                        return (
                                            <div key={idx} className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3 hover:shadow-md transition-shadow group/item">
                                                <div className="flex items-center gap-3 sm:gap-4 truncate">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                                                        <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" />
                                                    </div>
                                                    <div className="space-y-0.5 min-w-0">
                                                        <p className="text-[10px] sm:text-xs font-black text-gray-400 truncate">{day}</p>
                                                        <p className="text-xs sm:text-sm font-bold text-blue-600 truncate">{time}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEditAppointment(day, time)}
                                                        className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                                                        title="تعديل"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`هل تريد حذف موعد يوم ${day}؟`)) {
                                                                handleDeleteAppointment(day);
                                                            }
                                                        }}
                                                        className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
                                                        title="حذف"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 sm:py-12 space-y-3">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-300">
                                        <Clock size={24} className="sm:w-8 sm:h-8" />
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-400 font-bold italic">لم يتم تحديد مواعيد حضور لهذا الطالب بعد</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'fees':
                const monthsList = (() => {
                    if (!student?.enrollmentDate) return [];
                    // تحليل التاريخ يدوياً لتجنب مشاكل المناطق الزمنية
                    const dateParts = student.enrollmentDate.split('-').map(Number);
                    if (dateParts.length < 3) return [];

                    const start = new Date(dateParts[0], dateParts[1] - 1, 1);
                    const now = new Date();
                    const end = new Date(now.getFullYear(), now.getMonth(), 1);

                    const list = [];
                    let curr = new Date(end);

                    while (curr >= start) {
                        const mLabel = curr.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
                        // تحويل الأرقام العربية إلى إنجليزية للمفتاح لضمان المطابقة
                        const mKey = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;

                        list.push({
                            label: mLabel,
                            date: new Date(curr),
                        });
                        curr.setMonth(curr.getMonth() - 1);

                        // أمان لمنع الحلقات اللانهائية
                        if (list.length > 120) break;
                    }
                    return list;
                })();

                const handleQuickPay = (monthLabel: string, monthKey: string) => {
                    setPaymentMonth(monthLabel);
                    setPaymentMonthKey(monthKey);
                    setIsPaymentModalOpen(true);
                };

                return (
                    <div className="space-y-6 text-right">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="font-bold text-gray-900 text-sm">حالة الدفع للأشهر (منذ التحاقه)</h4>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-bold">
                                تاريخ الالتحاق: {student.enrollmentDate}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {monthsList.map((m) => {
                                const mKey = `${m.date.getFullYear()}-${String(m.date.getMonth() + 1).padStart(2, '0')}`;
                                // البحث عن السجل المالي لهذا الشهر سواء بالاسم العربي أو المفتاح الرقمي
                                const studentFee = fees.find(f => f.month === m.label || f.month === mKey);
                                const isMonthPaid = !!studentFee;

                                return (
                                    <div key={m.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between gap-4 group hover:shadow-md transition-all">
                                        <div className="text-right">
                                            <h5 className="font-bold text-gray-800 text-sm">{m.label}</h5>
                                            <p className={cn("text-[10px] mt-0.5 font-bold", isMonthPaid ? "text-green-500" : "text-amber-500")}>
                                                {isMonthPaid ? "✓ تم السداد" : "⚠ مطلوب السداد"}
                                            </p>
                                        </div>

                                        <div className="shrink-0">
                                            {isMonthPaid ? (
                                                <button
                                                    onClick={() => handleDeleteFee(studentFee!.id, studentFee!.receipt)}
                                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                >
                                                    إلغاء الدفع
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleQuickPay(m.label, mKey)}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                                                >
                                                    تسجيل الدفع
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Payment Modal */}
                        <AnimatePresence>
                            {isPaymentModalOpen && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setIsPaymentModalOpen(false)}
                                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                        className="relative w-full max-w-sm bg-white rounded-[32px] p-6 shadow-2xl border border-gray-100"
                                    >
                                        <h3 className="text-xl font-black text-gray-900 mb-2 text-right">تسجيل دفع الرسوم</h3>
                                        <p className="text-sm text-gray-400 font-bold mb-6 text-right">لشهر {paymentMonth}</p>

                                        <div className="space-y-4 text-right">
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-black text-gray-400 mr-1 uppercase">المبلغ المستحق</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={feeAmount}
                                                        onChange={(e) => setFeeAmount(e.target.value)}
                                                        className="w-full h-14 bg-gray-50 border-none rounded-2xl px-4 text-lg font-black text-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                    />
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">ج.م</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[11px] font-black text-gray-400 mr-1 uppercase">رقم الوصل</label>
                                                <input
                                                    type="text"
                                                    placeholder="سند قبض رقم..."
                                                    value={receiptNum}
                                                    onChange={(e) => setReceiptNum(e.target.value)}
                                                    className="w-full h-14 bg-gray-50 border-none rounded-2xl px-4 text-sm font-bold text-right focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                />
                                            </div>

                                            <div className="pt-4 flex gap-3">
                                                <Button
                                                    onClick={() => setIsPaymentModalOpen(false)}
                                                    variant="ghost"
                                                    className="flex-1 h-14 rounded-2xl font-bold text-gray-400 hover:bg-gray-50"
                                                >
                                                    إلغاء
                                                </Button>
                                                <Button
                                                    onClick={handleAddFee}
                                                    className="flex-[2] h-14 bg-gray-900 text-white rounded-2xl font-black shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                >
                                                    تأكيد تسجيل الدفع
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* جدول السجل التاريخي */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-gray-900 mr-1">سجل المدفوعات التاريخي</h3>
                            <div className="space-y-3 pt-2">
                                {fees.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((fee) => (
                                    <div key={fee.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h5 className="font-bold text-gray-900 text-sm mb-1">{fee.month}</h5>
                                                <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {fee.date}
                                                </p>
                                            </div>
                                            <div className="text-left">
                                                <span className="block text-lg font-black text-green-600 font-sans tracking-tight">
                                                    {fee.amount.replace(/[^0-9.]/g, '')} <span className="text-xs">ج.م</span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 bg-gray-50/50 p-2 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center gap-1">
                                                    <FileText size={12} />
                                                    وصل: {fee.receipt}
                                                </span>
                                                <span className="w-px h-3 bg-gray-300 mx-1" />
                                                <span className="flex items-center gap-1">
                                                    <User size={12} />
                                                    {fee.createdBy}
                                                </span>
                                            </div>

                                            {isDirector && (
                                                <button
                                                    onClick={() => handleDeleteFee(fee.id, fee.receipt)}
                                                    className="w-7 h-7 bg-white text-red-500 rounded-lg border border-red-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                                                    title="حذف السجل"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {fees.length === 0 && (
                                    <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-gray-300 mb-3 shadow-sm">
                                            <CreditCard size={24} />
                                        </div>
                                        <p className="text-sm text-gray-400 font-bold">لا توجد مدفوعات مسجلة في السجل التاريخي</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'exams':
                return (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 space-y-4 text-right">
                            <h4 className="font-bold text-gray-900 text-sm">تسجيل اختبار</h4>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 mr-1">اسم السورة</label>
                                <input
                                    type="text"
                                    value={surahName}
                                    onChange={(e) => setSurahName(e.target.value)}
                                    placeholder="مثال: سورة البقرة"
                                    className="w-full h-11 bg-white border border-gray-100 rounded-xl px-4 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 mr-1">النوع</label>
                                    <select
                                        value={examType}
                                        onChange={(e) => setExamType(e.target.value)}
                                        className="w-full h-11 bg-white border border-gray-100 rounded-xl px-3 text-xs font-bold focus:outline-none"
                                    >
                                        <option>جديد</option>
                                        <option>ماضي قريب</option>
                                        <option>ماضي بعيد</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 mr-1">التقدير</label>
                                    <select
                                        value={examGrade}
                                        onChange={(e) => setExamGrade(e.target.value)}
                                        className="w-full h-11 bg-white border border-gray-100 rounded-xl px-3 text-xs font-bold focus:outline-none"
                                    >
                                        <option>ممتاز</option>
                                        <option>جيد جداً</option>
                                        <option>جيد</option>
                                        <option>يعاد</option>
                                    </select>
                                </div>
                            </div>
                            <Button
                                onClick={handleAddExam}
                                className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
                            >
                                حفظ نتيجة الاختبار
                            </Button>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                {['جديد', 'ماضي قريب', 'ماضي بعيد'].map((subTab) => (
                                    <button
                                        key={subTab}
                                        onClick={() => setActiveExamSubTab(subTab as 'جديد' | 'ماضي قريب' | 'ماضي بعيد')}
                                        className={cn(
                                            "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                            activeExamSubTab === subTab ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:bg-gray-200"
                                        )}
                                    >
                                        {subTab}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3">
                                {exams.filter(e => e.type === activeExamSubTab).length > 0 ? (
                                    exams.filter(e => e.type === activeExamSubTab).map((exam) => (
                                        <div key={exam.id} className="p-4 bg-white rounded-2xl border border-gray-50 shadow-sm space-y-2 group relative">
                                            <div className="flex justify-between items-center">
                                                <div className="flex gap-2">
                                                    <span className={cn(
                                                        "text-[10px] font-bold px-2 py-1 rounded-lg",
                                                        exam.grade === 'ممتاز' ? "bg-green-50 text-green-600" :
                                                            exam.grade === 'يعاد' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                                                    )}>{exam.grade}</span>
                                                </div>
                                                <h4 className="font-bold text-gray-900">{exam.surah}</h4>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="flex items-center gap-2">
                                                    {isDirector && (
                                                        <button
                                                            onClick={() => handleDeleteExam(exam.id)}
                                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                    <p className="text-[10px] text-gray-400 font-bold">{exam.date}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-gray-400 text-xs font-bold">لا توجد سجلات في هذا القسم</div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'notes':
                return (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 space-y-3">
                            <h4 className="font-bold text-gray-900 text-sm text-right">إضافة ملحوظة</h4>
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                className="w-full h-24 bg-white border border-gray-100 rounded-2xl p-4 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                placeholder="اكتب الملحوظة هنا..."
                            />
                            <Button
                                onClick={handleAddNote}
                                className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
                            >
                                تسجيل الملحوظة
                            </Button>
                        </div>

                        <div className="space-y-3 pt-2">
                            {notes.map((note: any) => (
                                <div key={note.id} className={cn(
                                    "p-4 rounded-2xl border text-right space-y-1 shadow-sm relative group",
                                    note.type === 'positive' ? "bg-white border-green-50" : "bg-orange-50 border-orange-100"
                                )}>
                                    <p className="text-sm font-bold text-gray-700 leading-relaxed">{note.text}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="flex items-center gap-2">
                                            {isDirector && (
                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                            <div className="flex flex-col items-end">
                                                <p className="text-[10px] text-gray-600 font-bold">بواسطة: {note.createdBy} </p>
                                                <p className="text-[10px] text-gray-400 font-bold">{note.date}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[800px] h-fit max-h-[95vh] bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col"
                    >
                        <div className="p-5 relative border-b border-gray-50">
                            <button
                                onClick={onClose}
                                className="absolute left-5 top-5 w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="text-right mt-2 md:mt-0">
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{student.fullName}</h2>

                                <div className="flex items-center justify-end gap-3 flex-wrap-reverse">
                                    <div className="flex items-center gap-2">
                                        {user?.role !== 'teacher' && (
                                            <>
                                                <button
                                                    onClick={handleArchiveToggle}
                                                    className={cn(
                                                        "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                                        isArchived ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-amber-50 text-amber-500 hover:bg-amber-100"
                                                    )}
                                                    title={isArchived ? "استعادة" : "أرشفة"}
                                                >
                                                    {isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => onEdit?.(student)}
                                                    className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                                                    title="تعديل البيانات"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={handleWhatsApp}
                                                    className="w-9 h-9 rounded-xl bg-green-50 text-green-500 flex items-center justify-center hover:bg-green-100 transition-colors"
                                                    title="واتساب"
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                                <button
                                                    onClick={handleCall}
                                                    className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-colors"
                                                    title="اتصال"
                                                >
                                                    <Phone size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    <span className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg">
                                        {groups.find(g => g.id === student.groupId)?.name || 'بدون مجموعة'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex border-b border-gray-50 px-4">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex-1 flex flex-col items-center gap-1 py-4 text-[10px] font-bold transition-all relative",
                                            isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                                        )}
                                    >
                                        <Icon size={20} className={cn("mb-1", isActive && "stroke-[2.5px]")} />
                                        <span className="hidden md:inline">{tab.label}</span>
                                        {isActive && (
                                            <motion.div layoutId="modalTab" className="absolute bottom-0 left-2 right-2 h-1 bg-blue-600 rounded-t-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 md:p-6 text-right">
                            {renderTabContent()}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
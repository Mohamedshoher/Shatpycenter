'use client';

import { useState } from 'react';
import X from 'lucide-react/dist/esm/icons/x'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card'
import BookOpen from 'lucide-react/dist/esm/icons/book-open'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2'
import XCircle from 'lucide-react/dist/esm/icons/x-circle'
import Info from 'lucide-react/dist/esm/icons/info'
import User from 'lucide-react/dist/esm/icons/user'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import MapPin from 'lucide-react/dist/esm/icons/map-pin'
import Clock from 'lucide-react/dist/esm/icons/clock'
import Book from 'lucide-react/dist/esm/icons/book'
import Award from 'lucide-react/dist/esm/icons/award'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2'
import Users from 'lucide-react/dist/esm/icons/users'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import { cn } from '@/lib/utils';
import { useStudentRecords } from '../hooks/useStudentRecords';
import { Group, Teacher } from '@/types';
import { FadeIn, SlideIn } from '@/components/ui/transition';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, updateStudent } from '../services/studentService';

interface ParentStudentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    group?: Group;
    teacher?: Teacher;
}

type TabType = 'attendance' | 'exams' | 'fees' | 'plan' | 'schedule';

export const ParentStudentDetailModal: React.FC<ParentStudentDetailModalProps> = ({
    isOpen,
    onClose,
    student,
    group,
    teacher
}) => {
    const [activeTab, setActiveTab] = useState<TabType>(
        'attendance'
    );
    const [activeExamSubTab, setActiveExamSubTab] = useState("جديد");
    const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());
    const [selectedSchedules, setSelectedSchedules] = useState<Record<string, string>>({});
    const [showScheduleSuccess, setShowScheduleSuccess] = useState(false);
    const [localAppointment, setLocalAppointment] = useState<string>(student?.appointment || '');

    const queryClient = useQueryClient();
    const { data: allStudents } = useQuery({ queryKey: ['students'], queryFn: () => getStudents() });
    const {
        attendance,
        exams,
        fees,
        plans,
        exemptions,
        isLoadingAttendance,
        isLoadingExams,
        isLoadingFees,
        isLoadingPlans,
    } = useStudentRecords(student?.id || '');

    const saveScheduleMutation = useMutation({
        mutationFn: (appointment: string) => updateStudent(student.id, { appointment }),
        onMutate: (appointment) => {
            setLocalAppointment(appointment);
            setSelectedSchedules({});
            return null;
        },
        onSuccess: (_data, appointment) => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setLocalAppointment(appointment);
            setShowScheduleSuccess(true);
            setTimeout(() => setShowScheduleSuccess(false), 2000);
        },
        onError: () => {
            alert('حدث خطأ أثناء حفظ المواعيد. حاول مرة أخرى.');
        }
    });

    if (!student) return null;

    const tabs: { id: TabType; label: string; icon: any; color: string }[] = [
        { id: 'schedule', label: 'المواعيد', icon: Clock, color: 'text-indigo-600' },
        { id: 'attendance', label: 'الحضور', icon: Calendar, color: 'text-blue-600' },
        { id: 'exams', label: 'الاختبارات', icon: BookOpen, color: 'text-teal-600' },
        { id: 'fees', label: 'المصروفات', icon: CreditCard, color: 'text-purple-600' }
    ];

    const renderAttendance = () => {
        const currentYear = currentDisplayDate.getFullYear();
        const currentMonth = currentDisplayDate.getMonth();
        const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const startDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 1) % 7;
        const weekDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
        const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

        const attendanceRecordsMap: Record<number, string> = {};
        attendance.forEach((rec) => {
            if (rec.month === monthKey) attendanceRecordsMap[rec.day] = rec.status;
        });

        const presentCount = Object.values(attendanceRecordsMap).filter(s => s === 'present').length;
        const absentCount = Object.values(attendanceRecordsMap).filter(s => s === 'absent').length;

        return (
            <div className="space-y-6">
                {/* التحكم في الشهور */}
                <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100">
                    <button
                        onClick={() => setCurrentDisplayDate(new Date(currentYear, currentMonth + 1, 1))}
                        className="text-gray-400 p-2 hover:text-blue-600 transition-colors"
                        aria-label="الشهر التالي"
                    >
                        <ChevronRight size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-blue-600" />
                        <h4 className="font-black text-gray-900">{monthNames[currentMonth]} {currentYear}</h4>
                    </div>
                    <button
                        onClick={() => setCurrentDisplayDate(new Date(currentYear, currentMonth - 1, 1))}
                        className="text-gray-400 p-2 hover:text-blue-600 transition-colors"
                        aria-label="الشهر السابق"
                    >
                        <ChevronRight size={20} className="rotate-180" />
                    </button>
                </div>

                {/* عرض أيام الأسبوع */}
                <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                    {weekDays.map(day => <span key={day} className="text-[10px] text-gray-400 font-bold">{day}</span>)}
                </div>

                {/* عرض أيام الشهر */}
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: startDayIndex }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateObj = new Date(currentYear, currentMonth, day);
                        const dayOfWeek = dateObj.getDay();
                        const isWeekend = dayOfWeek === 4 || dayOfWeek === 5;
                        const status = attendanceRecordsMap[day];
                        const isFuture = dateObj > new Date();

                        return (
                            <div
                                key={day}
                                className={cn(
                                    "aspect-square rounded-xl flex flex-col items-center justify-center border transition-all text-sm font-bold shadow-sm",
                                    isFuture ? "bg-gray-50/50 text-gray-200" :
                                    isWeekend ? "bg-amber-50/50 border-amber-100 text-amber-500/60" :
                                    status === 'absent' ? "bg-red-50 border-red-100 text-red-600" :
                                    status === 'present' ? "bg-green-50 border-green-100 text-green-600" : "bg-white text-gray-400"
                                )}
                            >
                                <span>{day}</span>
                                {isWeekend ? (
                                    <span className="text-[8px] font-black mt-0.5">أجازة</span>
                                ) : (
                                    !isFuture && (status === 'absent' ? <XCircle size={14} /> : status === 'present' ? <CheckCircle2 size={14} /> : null)
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* إحصائيات الشهر */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100 flex flex-col items-center text-center">
                        <CheckCircle2 size={24} className="text-blue-500 mb-2" />
                        <span className="text-[10px] font-black text-gray-400">مرات الحضور</span>
                        <span className="text-3xl font-black text-blue-700">{presentCount}</span>
                    </div>
                    <div className="bg-red-50/50 p-6 rounded-[32px] border border-red-100 flex flex-col items-center text-center">
                        <XCircle size={24} className="text-red-500 mb-2" />
                        <span className="text-[10px] font-black text-gray-400">مرات الغياب</span>
                        <span className="text-3xl font-black text-red-700">{absentCount}</span>
                    </div>
                </div>

                {presentCount + absentCount === 0 && (
                    <div className="text-center py-10 text-gray-400 text-xs font-bold bg-white rounded-[32px] border border-dashed border-gray-200">
                        لا يوجد سجل حضور مسجل في هذا الشهر
                    </div>
                )}
            </div>
        );
    };

    const renderExams = () => {
        const filteredExams = exams.filter(e => e.type === activeExamSubTab);

        return (
            <div className="space-y-6">
                <div className="bg-teal-50/50 p-6 rounded-[32px] border border-teal-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                            <BookOpen size={28} />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-teal-900">سجل الاختبارات</h4>
                            <p className="text-xs text-teal-600 font-bold">إجمالي {exams.length} اختبار</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-teal-100 p-2 flex gap-2 relative">
                    {["جديد", "ماضي قريب", "ماضي بعيد"].map((t) => (
                        <button
                            key={t}
                            onClick={() => setActiveExamSubTab(t)}
                            className={cn(
                                "flex-1 py-3 px-2 rounded-xl text-[10px] font-black transition-all relative z-10",
                                activeExamSubTab === t ? "text-white" : "text-gray-400 hover:bg-gray-50"
                            )}
                        >
                            <span className="relative z-20">{t}</span>
                            {activeExamSubTab === t && (
                                <div className="absolute inset-0 bg-teal-600 rounded-xl z-10" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="space-y-3">
                    {filteredExams.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-xs font-bold">لا توجد اختبارات مسجلة في هذا القسم</div>
                    )}
                    {filteredExams.map((exam, i) => (
                        <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-teal-300 transition-all">
                            <div className="space-y-1">
                                <h5 className="text-sm font-black text-gray-900 group-hover:text-teal-600">{exam.surah}</h5>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold">
                                    <Calendar size={12} />
                                    <span>{exam.date}</span>
                                </div>
                            </div>
                            <div className={cn(
                                "px-4 py-2 rounded-2xl text-xs font-black shadow-sm",
                                exam.grade === 'ممتاز' ? "bg-green-500 text-white" : "bg-teal-50 text-teal-600"
                            )}>
                                {exam.grade}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderFees = () => {
        const monthsList = (() => {
            if (!student?.enrollmentDate) return [];
            const dateParts = student.enrollmentDate.split('-').map(Number);
            const start = new Date(dateParts[0], dateParts[1] - 1, 1);
            const now = new Date();
            const list = [];
            let curr = new Date(now.getFullYear(), now.getMonth(), 1);
            while (curr >= start) {
                list.push({
                    label: curr.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }),
                    key: `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`,
                    date: new Date(curr)
                });
                curr.setMonth(curr.getMonth() - 1);
            }
            return list;
        })();

        const paidCount = monthsList.filter((m: any) => fees.find((f: any) => f.month === m.label || f.month === m.key)).length;
        const unpaidMonths = monthsList.filter((m: any) => {
            const paid = fees.find((f: any) => f.month === m.label || f.month === m.key);
            const exempted = exemptions.find((e: any) => e.month === m.label || e.month === m.key);
            return !paid && !exempted;
        });

        return (
            <div className="space-y-6">
                <div className="bg-purple-50/50 p-8 rounded-[40px] border border-purple-100 text-center space-y-3">
                    <div className="w-16 h-16 bg-purple-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-purple-500/20 mx-auto">
                        <CreditCard size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-gray-900">المصروفات الشهرية</h4>
                        <p className="text-sm text-gray-400 font-bold">قيمة الاشتراك: {student.monthlyAmount || 0} ج.م</p>
                    </div>
                    <div className="flex justify-center gap-4 pt-2">
                        <div className="bg-white px-4 py-2 rounded-2xl border border-green-100 text-center">
                            <p className="text-[9px] font-black text-green-500">مدفوع</p>
                            <p className="text-lg font-black text-green-600">{paidCount}</p>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-2xl border border-red-100 text-center">
                            <p className="text-[9px] font-black text-red-500">متبقي</p>
                            <p className="text-lg font-black text-red-600">{unpaidMonths.length}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2.5">
                    <h4 className="text-sm font-black text-red-600 flex items-center gap-2 pr-1">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        شهور غير مسددة ({unpaidMonths.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {unpaidMonths.map((m: any) => (
                            <div key={m.key} className="bg-red-50/60 border-2 border-red-100 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <h5 className="text-sm font-black text-red-700">{m.label}</h5>
                                    <p className="text-[10px] font-bold text-red-400">مطلوب السداد</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-[9px] font-bold text-red-400 mb-0.5">المبلغ</p>
                                    <p className="text-base font-black text-red-600">{student.monthlyAmount || 0} ج.م</p>
                                </div>
                            </div>
                        ))}
                        {unpaidMonths.length === 0 && (
                            <div className="col-span-full text-center py-6 text-gray-400 text-xs font-bold bg-white rounded-2xl border border-dashed border-gray-200">
                                لا توجد شهور متأخرة 🎉
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2.5">
                    <h4 className="text-sm font-black text-gray-900 flex items-center gap-2 pr-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        الشهور المسددة ({paidCount})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                        {monthsList.map((m: any) => {
                            const fee = fees.find((f: any) => f.month === m.label || f.month === m.key);
                            if (!fee) return null;
                            return (
                                <div key={m.key} className="bg-white p-4 rounded-2xl border border-green-100 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                                            <CheckCircle2 size={18} />
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-black text-gray-900">{m.label}</h5>
                                            <p className="text-[9px] font-bold text-gray-400">وصل رقم: {fee.receipt}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[9px] font-bold text-gray-400 mb-0.5">المبلغ</p>
                                        <p className="text-base font-black text-green-600">{fee.amount}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderPlan = () => (
        <div className="space-y-6">
            <div className="bg-orange-50/50 p-6 rounded-[32px] border border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-orange-900">الخطة اليومية</h4>
                        <p className="text-xs text-orange-600 font-bold">متابعة الحفظ والمراجعة</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {plans.slice(0, 5).map((p, i) => (
                    <div key={i} className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                            <span className="text-xs font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl">{p.date}</span>
                            <span className={cn(
                                "text-[10px] font-black px-3 py-1.5 rounded-xl",
                                p.status === 'completed' ? "bg-green-50 text-green-600" :
                                    p.status === 'partial' ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                            )}>
                                {p.status === 'completed' ? "تم الإنجاز ✓" : "إنجاز جزئي !"}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-blue-50/30 p-3 rounded-2xl border border-blue-50/50">
                                <p className="text-[10px] text-blue-400 font-black mb-1">الحفظ الجديد</p>
                                <p className="text-xs font-bold text-gray-800">{p.newHifz || '—'}</p>
                            </div>
                            <div className="bg-teal-50/30 p-3 rounded-2xl border border-teal-50/50">
                                <p className="text-[10px] text-teal-400 font-black mb-1">مراجعة قريبة</p>
                                <p className="text-xs font-bold text-gray-800">{p.prevReview || '—'}</p>
                            </div>
                            <div className="bg-orange-50/30 p-3 rounded-2xl border border-orange-50/50">
                                <p className="text-[10px] text-orange-400 font-black mb-1">مراجعة بعيدة</p>
                                <p className="text-xs font-bold text-gray-800">{p.distantReview || '—'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderSchedule = () => {
        const scheduleDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء'];
        const availableHours = [16, 17, 18, 19];
        const maxPerHour = group?.maxStudentsPerHour || 5;

        const formatHourArabic = (hour: number) => {
            const period = hour >= 12 ? 'عصراً' : 'صباحاً';
            const displayHours = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            return `الساعة ${displayHours}:00 ${period}`;
        };

        const formatToStandardArabic = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const period = hours >= 12 ? 'عصراً' : 'صباحاً';
            const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
            return `الساعة ${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        };

        const countOccupied = (day: string, timeArabic: string) => {
            return (allStudents || []).filter(s =>
                s.id !== student.id &&
                s.groupId === student.groupId &&
                s.status === 'active' &&
                s.appointment?.split(',').some((p: string) => {
                    const parts = p.split(':');
                    if (parts.length < 2) return false;
                    const d = parts[0].trim();
                    const t = parts.slice(1).join(':').trim();
                    return d === day && t === timeArabic;
                })
            ).length;
        };

        const handleToggle = (day: string, hour: number) => {
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
            setSelectedSchedules(prev => {
                const next = { ...prev };
                if (next[day] === timeStr) delete next[day];
                else next[day] = timeStr;
                return next;
            });
        };

        const handleSave = () => {
            const inputDays = Object.keys(selectedSchedules);
            if (inputDays.length === 0) return alert('اختر يوم وساعة واحداً على الأقل');

            for (const day of inputDays) {
                const newTime = formatToStandardArabic(selectedSchedules[day]);
                const used = countOccupied(day, newTime);
                if (used >= maxPerHour) {
                    return alert(`عدد الطلاب في موعد ${day} - ${newTime} وصل إلى الحد الأقصى (${maxPerHour} طلاب). اختر ساعة أخرى.`);
                }
            }

            const finalSchedules: Record<string, string> = {};
            if (localAppointment) {
                localAppointment.split(',').forEach((p: string) => {
                    const parts = p.split(':');
                    if (parts.length < 2) return;
                    const d = parts[0].trim();
                    const t = parts.slice(1).join(':').trim();
                    if (d) finalSchedules[d] = t;
                });
            }
            inputDays.forEach(day => { finalSchedules[day] = formatToStandardArabic(selectedSchedules[day]); });

            const weekOrder = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
            const appointmentString = Object.keys(finalSchedules)
                .sort((a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b))
                .map(day => `${day}: ${finalSchedules[day]}`).join(', ');

            saveScheduleMutation.mutate(appointmentString);
        };

        const handleDeleteDay = (day: string) => {
            if (!confirm(`هل أنت متأكد من حذف موعد يوم ${day}؟`)) return;

            const finalSchedules: Record<string, string> = {};
            if (localAppointment) {
                localAppointment.split(',').forEach((p: string) => {
                    const parts = p.split(':');
                    if (parts.length < 2) return;
                    const d = parts[0].trim();
                    const t = parts.slice(1).join(':').trim();
                    if (d && d !== day) finalSchedules[d] = t;
                });
            }

            const weekOrder = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
            const appointmentString = Object.keys(finalSchedules)
                .sort((a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b))
                .map(d => `${d}: ${finalSchedules[d]}`).join(', ');

            saveScheduleMutation.mutate(appointmentString);
        };

        return (
            <div className="space-y-6">
                <div className="bg-indigo-50/50 p-6 rounded-[32px] border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Clock size={28} />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-indigo-900">تحديد مواعيد الحضور</h4>
                            <p className="text-xs text-indigo-600 font-bold">اختر الأيام والساعات المتاحة لابنك</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full text-[10px] font-black text-indigo-600 border border-indigo-100 shadow-sm">
                        <Users size={12} />
                        الحد الأقصى: {maxPerHour} طلاب / ساعة
                    </div>
                </div>

                <div className="space-y-4">
                    {scheduleDays.map(day => {
                        const savedAppointment = localAppointment?.split(',').find((p: string) => p.trim().startsWith(day)) || '';
                        const savedTime = savedAppointment ? savedAppointment.slice(savedAppointment.indexOf(':') + 1).trim() : '';

                        return (
                            <div key={day} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">{day[0]}</div>
                                        <div>
                                            <h5 className="text-sm font-black text-gray-900">{day}</h5>
                                            {savedTime ? (
                                                <p className="text-[10px] font-bold text-indigo-600">الموعد الحالي: {savedTime}</p>
                                            ) : (
                                                <p className="text-[10px] font-bold text-gray-400">لم يتم تحديد موعد</p>
                                            )}
                                        </div>
                                    </div>
                                    {savedTime && (
                                        <button
                                            onClick={() => handleDeleteDay(day)}
                                            className="w-9 h-9 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                                            title="حذف موعد اليوم"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    {availableHours.map(hour => {
                                        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                                        const timeArabic = formatHourArabic(hour);
                                        const isSelected = selectedSchedules[day] === timeStr;
                                        const isCurrent = !isSelected && savedTime === timeArabic;
                                        const occupied = countOccupied(day, timeArabic);
                                        const remaining = maxPerHour - occupied;
                                        const isFull = remaining <= 0;

                                        return (
                                            <button
                                                key={hour}
                                                onClick={() => !isFull && handleToggle(day, hour)}
                                                disabled={isFull}
                                                className={cn(
                                                    "relative rounded-2xl border-2 p-3 text-center transition-all duration-300",
                                                    isSelected
                                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.03]"
                                                        : isCurrent
                                                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                                                            : isFull
                                                                ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-60"
                                                                : "bg-white border-gray-100 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/30"
                                                )}
                                            >
                                                <p className="text-xs font-black">{hour > 12 ? hour - 12 : hour}:00</p>
                                                <p className={cn("text-[9px] font-bold mt-0.5", isSelected ? "text-indigo-100" : isFull ? "text-gray-300" : isCurrent ? "text-indigo-500" : "text-gray-400")}>
                                                    {isFull ? `ممتلئ ${maxPerHour}/${maxPerHour}` : `متاح ${remaining} أماكن`}
                                                </p>
                                                {isCurrent && (
                                                    <span className="absolute -top-2 -left-2 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[8px] font-black shadow">
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={handleSave}
                    disabled={saveScheduleMutation.isPending}
                    className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                    {saveScheduleMutation.isPending ? (
                        <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> جاري حفظ التعديلات...</span>
                    ) : showScheduleSuccess ? 'تم حفظ المواعيد بنجاح ✓' : 'تأكيد وحفظ المواعيد'}
                </button>
            </div>
        );
    };



    return (
        <>
            <FadeIn show={isOpen} className="fixed inset-0 z-[100]">
                <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            </FadeIn>
            <SlideIn show={isOpen} className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                <div className="bg-gray-50 w-full max-w-5xl h-[90vh] rounded-[48px] overflow-hidden flex flex-col shadow-2xl border border-white/20"
                    onClick={(e) => e.stopPropagation()} dir="rtl">
                    <div className="bg-white p-6 pb-4 shrink-0 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

                        <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-[22px] sm:rounded-[28px] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 shrink-0">
                                    <User size={32} />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                    <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight truncate" title={student.fullName}>
                                        {student.fullName}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border border-blue-100 flex items-center gap-1 whitespace-nowrap">
                                            <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                                            {group?.name || 'بدون مجموعة'}
                                        </span>
                                        <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border border-teal-100 flex items-center gap-1 whitespace-nowrap">
                                            أستاذ / {teacher?.fullName || 'غير محدد'}
                                        </span>
                                        {student.status === 'archived' && (
                                            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] sm:text-xs font-black shadow-lg whitespace-nowrap">
                                                مفصول لحين مراجعة الإدارة
                                            </span>
                                        )}
                                        {fees.length === 0 && (
                                            <span className="bg-orange-600 text-white px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shadow-lg whitespace-nowrap">
                                                لحين سداد الرسوم
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 mt-6 bg-gray-50 p-1 rounded-[20px] overflow-x-auto no-scrollbar">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex-1 md:min-w-[120px] py-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-black transition-all",
                                        activeTab === tab.id
                                            ? "bg-white text-blue-600 shadow-md scale-[1.02]"
                                            : "text-gray-400 hover:bg-white/50 hover:text-gray-600"
                                    )}
                                >
                                    <tab.icon size={20} className={cn(activeTab === tab.id ? tab.color : "text-gray-300")} />
                                    <span className="hidden md:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                        {activeTab === 'attendance' && renderAttendance()}
                        {activeTab === 'schedule' && renderSchedule()}
                        {activeTab === 'exams' && renderExams()}
                        {activeTab === 'fees' && renderFees()}
                        {activeTab === 'plan' && renderPlan()}
                    </div>

                    <div className="p-6 bg-white border-t border-gray-100 shrink-0 text-center">
                        <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">نظام إدارة مركز الشاطبي التعليمي • 2026</p>
                    </div>
                </div>
            </SlideIn>
        </>
    );
};

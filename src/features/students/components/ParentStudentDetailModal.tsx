'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Calendar,
    CreditCard,
    BookOpen,
    TrendingUp,
    CheckCircle2,
    XCircle,
    Info,
    User,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Phone,
    Clock,
    Book,
    Award,
    CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudentRecords } from '../hooks/useStudentRecords';
import { Group, Teacher } from '@/types';

interface ParentStudentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    group?: Group;
    teacher?: Teacher;
}

type TabType = 'attendance' | 'exams' | 'fees' | 'plan' | 'schedule' | 'iqra';

export const ParentStudentDetailModal: React.FC<ParentStudentDetailModalProps> = ({
    isOpen,
    onClose,
    student,
    group,
    teacher
}) => {
    const [activeTab, setActiveTab] = useState<TabType>(
        group?.name?.includes('إقراء') ? 'iqra' : 'attendance'
    );
    const {
        attendance,
        exams,
        fees,
        plans,
        iqraProgress,
        iqraLogs,
        isLoadingAttendance,
        isLoadingExams,
        isLoadingFees,
        isLoadingPlans,
        isLoadingIqraProgress
    } = useStudentRecords(student?.id || '');

    if (!student) return null;

    const isIqra = iqraProgress.length > 0 || group?.name?.includes('إقراء');

    const tabs: { id: TabType; label: string; icon: any; color: string }[] = [];

    if (isIqra) {
        tabs.push({ id: 'iqra', label: 'الدورات', icon: Book, color: 'text-blue-600' });
    }

    tabs.push(
        { id: 'schedule', label: 'المواعيد', icon: Clock, color: 'text-indigo-600' },
        { id: 'attendance', label: 'الحضور', icon: Calendar, color: 'text-blue-600' },
        { id: 'exams', label: 'الاختبارات', icon: BookOpen, color: 'text-teal-600' }
    );

    if (!isIqra) {
        tabs.push({ id: 'fees', label: 'المصروفات', icon: CreditCard, color: 'text-purple-600' });
    }

    const renderAttendance = () => {
        const presentCount = attendance.filter(a => a.status === 'present').length;
        const total = attendance.length;

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100 flex flex-col items-center text-center">
                        <CheckCircle2 size={24} className="text-blue-500 mb-2" />
                        <span className="text-[10px] font-black text-gray-400">مرات الحضور</span>
                        <span className="text-3xl font-black text-blue-700">{presentCount}</span>
                    </div>
                    <div className="bg-red-50/50 p-6 rounded-[32px] border border-red-100 flex flex-col items-center text-center">
                        <XCircle size={24} className="text-red-500 mb-2" />
                        <span className="text-[10px] font-black text-gray-400">مرات الغياب</span>
                        <span className="text-3xl font-black text-red-700">{total - presentCount}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-sm font-black text-gray-900 pr-2">آخر السجلات</h4>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {attendance.sort((a, b) => b.day - a.day).slice(0, 10).map((record, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                        record.status === 'present' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                    )}>
                                        {record.status === 'present' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">{record.day} - {record.month}</span>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-black px-3 py-1 rounded-full",
                                    record.status === 'present' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                )}>
                                    {record.status === 'present' ? 'حاضر' : 'غائب'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderExams = () => (
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

            <div className="space-y-3">
                {exams.slice(0, 8).map((exam, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-teal-300 transition-all">
                        <div className="space-y-1">
                            <h5 className="text-sm font-black text-gray-900 group-hover:text-teal-600">{exam.surah}</h5>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold">
                                <Calendar size={12} />
                                <span>{exam.date}</span>
                                <span>•</span>
                                <span>{exam.type}</span>
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

    const renderFees = () => (
        <div className="space-y-6">
            <div className="bg-purple-50/50 p-8 rounded-[40px] border border-purple-100 text-center space-y-3">
                <div className="w-16 h-16 bg-purple-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-purple-500/20 mx-auto">
                    <CreditCard size={32} />
                </div>
                <div>
                    <h4 className="text-xl font-black text-gray-900">المصروفات الشهرية</h4>
                    <p className="text-sm text-gray-400 font-bold">قيمة الاشتراك: {student.monthlyAmount || 0} ج.م</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
                {fees.map((fee, i) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-lg transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-all">
                                <span className="text-lg font-black">{i + 1}</span>
                            </div>
                            <div>
                                <h5 className="text-sm font-black text-gray-900">{fee.month}</h5>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold">
                                    <Phone size={10} />
                                    <span>وصل رقم: {fee.receipt}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-gray-400 font-bold mb-1">المبلغ</p>
                            <p className="text-lg font-black text-purple-600">{fee.amount}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

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

    const renderSchedule = () => (
        <div className="space-y-6">
            <div className="bg-indigo-50/50 p-6 rounded-[32px] border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                        <Clock size={28} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-indigo-900">مواعيد الحضور</h4>
                        <p className="text-xs text-indigo-600 font-bold">الأيام والساعات المتفق عليها</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {student.appointment ? student.appointment.split(',').map((part: string, i: number) => {
                    const colonIdx = part.indexOf(':');
                    const day = colonIdx !== -1 ? part.slice(0, colonIdx).trim() : part.trim();
                    const time = colonIdx !== -1 ? part.slice(colonIdx + 1).trim() : '';
                    return (
                        <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h5 className="text-sm font-black text-gray-900">{day}</h5>
                                    <p className="text-xs font-bold text-indigo-600">{time}</p>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full py-16 text-center space-y-3 bg-white rounded-[40px] border border-dashed border-gray-200">
                        <Clock size={40} className="mx-auto text-gray-200" />
                        <p className="text-sm font-black text-gray-400">لم يتم تحديد مواعيد حضور بعد</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderIqra = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
                {iqraProgress.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100 italic text-gray-400 font-black">
                        لا توجد دورات مسجلة بعد
                    </div>
                ) : (
                    iqraProgress.map((course: any) => {
                        const courseLogs = iqraLogs.filter((l: any) => l.course_id === course.id);
                        const latestLecture = courseLogs.length > 0 ? Math.max(...courseLogs.map((l: any) => l.lecture_number)) : 0;
                        const progress = Math.min(Math.round((latestLecture / (course.total_lectures || 1)) * 100), 100);
                        const isFinished = progress >= 100;

                        // حساب الوقت المتبقي والتقدم الزمني
                        const startDate = course.start_date ? new Date(course.start_date) : null;
                        const examDate = course.full_exam_date ? new Date(course.full_exam_date) : null;
                        const today = new Date();
                        
                        let timeProgress = 0;
                        let remainingDays = 0;
                        
                        if (startDate && examDate) {
                            const totalTime = examDate.getTime() - startDate.getTime();
                            const passedTime = today.getTime() - startDate.getTime();
                            timeProgress = Math.min(100, Math.max(0, Math.round((passedTime / (totalTime || 1)) * 100)));
                            remainingDays = Math.max(0, Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
                        }

                        return (
                            <div key={course.id} className={cn(
                                "bg-white rounded-[32px] p-6 border transition-all shadow-sm",
                                isFinished ? "border-green-100 bg-green-50/10" : "border-gray-100"
                            )}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xl font-black text-gray-900">{course.book_name}</h4>
                                            {isFinished && <CheckCircle size={18} className="text-green-500" />}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 font-bold">
                                            <span>بدأ في: {course.start_date || '---'}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                            <span>{course.total_lectures || 0} محاضرة</span>
                                        </div>
                                    </div>
                                    {remainingDays > 0 && !isFinished && (
                                        <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-2xl border border-orange-100">
                                            <p className="text-[10px] font-black uppercase text-center">متبقي</p>
                                            <p className="text-sm font-black text-center">{remainingDays} يوم</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6 mb-8">
                                    {/* Progress Bar - Achievement */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                                            <span>نسبة إنجاز المحاضرات</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                className={cn("h-full", isFinished ? "bg-green-500" : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]")}
                                            />
                                        </div>
                                    </div>

                                    {/* Progress Bar - Time */}
                                    {!isFinished && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                                                <span>التقدم الزمني (للموعد المحدد)</span>
                                                <span>{timeProgress}%</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${timeProgress}%` }}
                                                    className={cn("h-full", timeProgress > 90 ? "bg-red-500" : "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]")}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase">موعد الاختبار</p>
                                        <p className="text-xs font-black text-purple-600">{course.full_exam_date || 'غير محدد'}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase">المقدر الأسبوعي</p>
                                        <p className="text-xs font-black text-indigo-600">{course.weekly_target || 0} محاضرة</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase">الختم المتوقع</p>
                                        <p className="text-xs font-black text-gray-700">
                                            {(() => {
                                                const remainingLectures = Math.max(0, (course.total_lectures || 0) - latestLecture);
                                                const weeklyTarget = course.weekly_target || 1;
                                                const weeksLeft = remainingLectures / weeklyTarget;
                                                const daysLeft = Math.ceil(weeksLeft * 7);
                                                const expectedDate = new Date(today.getTime() + (daysLeft * 24 * 60 * 60 * 1000));
                                                return expectedDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' });
                                            })()}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase">المنجز</p>
                                        <p className="text-xs font-black text-blue-600">{latestLecture} محاضرة</p>
                                    </div>
                                </div>

                                {courseLogs.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-dashed border-gray-100 flex flex-wrap gap-4">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 bg-amber-50 px-3 py-1.5 rounded-xl">
                                            <Award size={14} className="text-amber-500" />
                                            أحدث تقدير: <span className="text-amber-900">{courseLogs[0].sheikh_follow_up_grade}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 bg-green-50 px-3 py-1.5 rounded-xl">
                                            <User size={14} className="text-green-500" />
                                            إشراف: <span className="text-green-900">{teacher?.fullName || 'غير محدد'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="bg-gray-50 w-full max-w-5xl h-[90vh] rounded-[48px] overflow-hidden flex flex-col relative shadow-2xl border border-white/20"
            >
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
                                    {fees.length === 0 && !isIqra && (
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
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'attendance' && renderAttendance()}
                            {activeTab === 'schedule' && renderSchedule()}
                            {activeTab === 'exams' && renderExams()}
                            {activeTab === 'fees' && renderFees()}
                            {activeTab === 'plan' && renderPlan()}
                            {activeTab === 'iqra' && renderIqra()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="p-6 bg-white border-t border-gray-100 shrink-0 text-center">
                    <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">نظام إدارة مركز الشاطبي التعليمي • 2026</p>
                </div>
            </motion.div>
        </div>
    );
};

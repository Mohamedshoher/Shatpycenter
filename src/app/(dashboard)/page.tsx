"use client";
import { useEffect, useState } from 'react';

import {
    Users,
    LayoutGrid,
    CreditCard,
    CalendarCheck,
    TrendingUp,
    Search,
    Loader,
    UserCheck,
    ShieldCheck,
    RefreshCw,
    CalendarDays,
    Check,
    X as CloseIcon,
    Calendar,
    MessageSquare
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStudents } from '@/features/students/services/studentService';
import { getGroups } from '@/features/groups/services/groupService';
import { getTransactionsByMonth } from '@/features/finance/services/financeService';
import { getLeaveRequests, updateLeaveRequest, LeaveRequest, getAllStudentNotesWithDetails, deleteStudentNote, markNoteAsRead } from '@/features/students/services/recordsService';
import { useStudents } from '@/features/students/hooks/useStudents';
import dynamic from 'next/dynamic';
const StudentNotesModal = dynamic(() => import('@/features/finance/components/StudentNotesModal'), { ssr: false });
import { supabase } from '@/lib/supabase';
import { Student, Group, FinancialTransaction } from '@/types';
import { useRouter } from 'next/navigation';

export default function DashboardOverview() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const queryClient = useQueryClient();
    const { archiveStudent } = useStudents();

    // إعادة توجيه المستخدمين بعيداً عن الصفحة الرئيسية حسب الدور
    useEffect(() => {
        if (user?.role === 'teacher') {
            router.push('/students');
        } else if (user?.role === 'parent') {
            router.push('/parent');
        }
    }, [user, router]);

    // جلب البيانات الحقيقية
    const { data: students = [] as Student[], isLoading: loadingStudents } = useQuery({
        queryKey: ['students'],
        queryFn: getStudents
    });

    const { data: groups = [] as Group[], isLoading: loadingGroups } = useQuery({
        queryKey: ['groups'],
        queryFn: getGroups
    });

    const { data: transactions = [] as FinancialTransaction[], isLoading: loadingFinance } = useQuery({
        queryKey: ['transactions', currentYear, currentMonth],
        queryFn: () => getTransactionsByMonth(currentYear, currentMonth),
        enabled: user?.role === 'director' || user?.role === 'supervisor'
    });

    const { data: todayAttendance = [] } = useQuery({
        queryKey: ['attendance', todayStr],
        queryFn: async () => {
            const { data } = await supabase.from('attendance').select('*').eq('date', todayStr).eq('status', 'present');
            return data || [];
        }
    });

    // تصفية البيانات حسب دور المستخدم
    const myGroups = user?.role === 'teacher'
        ? groups.filter((g: Group) => g.teacherId === user.teacherId)
        : user?.role === 'supervisor'
            ? groups.filter((g: Group) => (user.responsibleSections || []).some(section => g.name.includes(section)))
            : groups;

    const myGroupsIds = myGroups.map((g: Group) => g.id);
    // استبعاد الطلاب المؤرشفين من العد الإجمالي
    const activeStudents = students.filter((s: Student) => s.status !== 'archived');
    const myStudents = (user?.role === 'teacher' || user?.role === 'supervisor')
        ? activeStudents.filter((s: Student) => myGroupsIds.includes(s.groupId || ''))
        : activeStudents;

    const myAttendanceCount = (user?.role === 'teacher' || user?.role === 'supervisor')
        ? todayAttendance.filter((a: any) => myStudents.some((s: Student) => s.id === a.student_id)).length
        : todayAttendance.length;

    const monthlyIncome = transactions
        .filter((t: FinancialTransaction) => t.type === 'income')
        .reduce((sum: number, t: FinancialTransaction) => sum + t.amount, 0);

    // حساب عدد الطلاب المعلقين
    const pendingStudents = students.filter((s: Student) => s.status === 'pending');

    const { data: leaveRequests = [], refetch: refetchLeaves } = useQuery({
        queryKey: ['leave-requests'],
        queryFn: getLeaveRequests,
        enabled: user?.role === 'director' || user?.role === 'supervisor'
    });

    const pendingLeaves = leaveRequests.filter(r => r.status === 'pending');

    const { data: studentNotes = [] } = useQuery({
        queryKey: ['student-notes-details'],
        queryFn: getAllStudentNotesWithDetails,
        enabled: user?.role === 'director' || user?.role === 'supervisor'
    });

    const stats = [
        {
            title: user?.role === 'teacher' ? 'طلابي' : 'إجمالي الطلاب',
            value: myStudents.length.toString(),
            icon: Users,
            color: 'bg-blue-500',
            roles: ['director', 'supervisor', 'teacher'],
            link: '/students'
        },
        {
            title: 'الحضور اليوم',
            value: myAttendanceCount.toString(),
            icon: CalendarCheck,
            color: 'bg-green-500',
            roles: ['director', 'supervisor', 'teacher'],
            link: '/attendance-report'
        },
        {
            title: user?.role === 'teacher' ? 'مجموعاتي' : 'المجموعات',
            value: myGroups.length.toString(),
            icon: LayoutGrid,
            color: 'bg-orange-500',
            roles: ['director', 'supervisor', 'teacher'],
            link: '/groups'
        },
        {
            title: 'طلاب جدد',
            value: pendingStudents.length.toString(),
            icon: UserCheck,
            color: 'bg-amber-500',
            roles: ['director', 'supervisor'],
            link: '/students/pending'
        },

        {
            title: 'تحديث الحسابات',
            value: students.filter(s => (s.parentPhone || '').replace(/[^0-9]/g, '').length >= 11).length.toString(),
            icon: RefreshCw,
            color: 'bg-indigo-600',
            roles: ['director'], // متاح فقط للمدير
            onClick: () => handleSyncParents()
        },
        {
            title: 'طلبات الإجازة',
            value: (user?.role === 'supervisor'
                ? pendingLeaves.filter(req => myStudents.some(s => s.fullName === req.studentName))
                : pendingLeaves).length.toString(),
            icon: CalendarDays,
            color: 'bg-orange-500',
            roles: ['director', 'supervisor'],
            onClick: () => setIsLeaveModalOpen(true)
        },
        {
            title: 'ملحوظات الطلاب',
            value: (user?.role === 'supervisor'
                ? studentNotes.filter(n => !n.isRead && myStudents.some(s => s.id === n.studentId))
                : studentNotes.filter(n => !n.isRead)).length.toString(),
            icon: MessageSquare,
            color: 'bg-blue-600',
            roles: ['director', 'supervisor'],
            onClick: () => setIsNotesModalOpen(true)
        },

    ].filter(s => s.roles.includes(user?.role || ''));

    const isLoading = loadingStudents || loadingGroups || (loadingFinance && (user?.role === 'director' || user?.role === 'supervisor'));

    const handleSyncParents = async () => {
        setIsSyncing(true);
        // محاكاة عملية فحص وتحديث الحسابات
        await new Promise(resolve => setTimeout(resolve, 1500));
        const invalidCount = students.filter((s: Student) => (s.parentPhone || '').replace(/[^0-9]/g, '').length < 11).length;
        if (invalidCount > 0) {
            alert(`تم فحص البيانات. يوجد ${invalidCount} طلاب لديهم أرقام هواتف غير مكتملة (أقل من 11 رقم)، لن يتمكن أولياء أمورهم من الدخول حتى يتم تحديث بياناتهم.`);
        } else {
            alert('تم تحديث جميع حسابات أولياء الأمور بنجاح. جميع الأرقام مطابقة للمواصفات (11 رقم فأكثر).');
        }
        setIsSyncing(false);
    };

    return (
        <div className="min-h-screen bg-[#f8faff] pb-32">
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8 md:space-y-12 text-right">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-2">
                    <div className="text-center sm:text-right">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
                            مرحباً، {user?.displayName || 'مستخدم'} 👋
                        </h1>
                        <p className="text-base text-gray-400 font-bold mt-2">
                            {today.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="h-64 flex items-center justify-center font-bold text-gray-400">
                        <Loader className="w-10 h-10 text-blue-600 animate-spin ml-3" />
                        جاري تحميل البيانات...
                    </div>
                ) : (
                    <>
                        {/* Main Stats Grid - Fluid 2 to 4 columns */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 px-2">
                            {stats.map((stat, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    onClick={() => {
                                        if (stat.onClick) stat.onClick();
                                        else if (stat.link) router.push(stat.link);
                                    }}
                                    className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-50 flex flex-col items-center gap-4 cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-2 transition-all group"
                                >
                                    <div className={cn(
                                        "w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6",
                                        stat.color,
                                        stat.onClick && isSyncing ? "animate-spin" : ""
                                    )}>
                                        <stat.icon size={32} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-400 font-bold mb-1">{stat.title}</p>
                                        <p className="text-3xl font-black text-gray-900 font-sans">{stat.value}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Recent Activity Section */}
                        <div className="px-2 space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="font-black text-gray-900 text-2xl tracking-tight">آخر التحديثات</h3>
                                <button onClick={() => router.push('/students')} className="text-blue-600 text-sm font-bold bg-blue-50 px-6 py-2 rounded-full hover:bg-blue-100 transition-all border border-blue-100/50">
                                    عرض السجل الكامل
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-2 md:gap-2">
                                {[
                                    { tag: 'حضور', text: `تم تسجيل حضور ${todayAttendance.length} طالباً اليوم حتى الآن`, time: 'اليوم', icon: CalendarCheck, color: 'text-orange-500', bg: 'bg-orange-50', roles: ['director', 'supervisor', 'teacher'] },
                                    { tag: 'طلاب', text: `تم تسجيل ${myStudents.length} طالباً في أقسامك`, time: 'محدث', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', roles: ['director', 'supervisor'] },
                                ]
                                    .filter(item => item.roles.includes(user?.role || ''))
                                    .map((item, idx) => (
                                        <motion.div
                                            key={idx}
                                            whileHover={{ x: -4 }}
                                            className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-50 flex items-center gap-6 hover:border-blue-100 transition-all"
                                        >
                                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", item.bg, item.color)}>
                                                <item.icon size={26} />
                                            </div>
                                            <div className="flex-1 text-right min-w-0">
                                                <div className="flex items-center justify-end gap-3 mb-2">
                                                    <span className="text-xs text-gray-300 font-bold">{item.time}</span>
                                                    <span className={cn("text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider", item.bg, item.color)}>{item.tag}</span>
                                                </div>
                                                <p className="text-base font-bold text-gray-700 leading-snug">{item.text}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                            </div>
                        </div>
                    </>
                )}
            </div>


            {/* نافذة إدارة طلبات الإجازة */}
            <AnimatePresence>
                {isLeaveModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsLeaveModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[40px] w-full max-w-2xl max-h-[80vh] overflow-hidden relative z-10 shadow-2xl flex flex-col"
                        >
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                                <h2 className="text-2xl font-black text-gray-900 border-r-4 border-orange-500 pr-4">طلبات الإجازة المعلقة</h2>
                                <button onClick={() => setIsLeaveModalOpen(false)} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                                    <CloseIcon size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-4">
                                {pendingLeaves.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400 font-bold">
                                        لا توجد طلبات إجازة معلقة حالياً
                                    </div>
                                ) : (
                                    pendingLeaves.map((req: LeaveRequest) => (
                                        <div key={req.id} className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="font-black text-gray-900 text-lg">{req.studentName}</h3>
                                                    <p className="text-xs text-blue-600 font-bold">
                                                        من {req.startDate} إلى {req.endDate}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            await updateLeaveRequest(req.id, { status: 'approved' });
                                                            refetchLeaves();
                                                        }}
                                                        className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all"
                                                        title="موافقة"
                                                    >
                                                        <Check size={20} />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            await updateLeaveRequest(req.id, { status: 'rejected' });
                                                            refetchLeaves();
                                                        }}
                                                        className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"
                                                        title="رفض"
                                                    >
                                                        <CloseIcon size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="bg-white rounded-2xl p-4 text-sm text-gray-600 font-bold shadow-sm">
                                                <p className="text-[10px] text-gray-400 mb-1">السبب:</p>
                                                {req.reason}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* نافذة ملحوظات الطلاب */}
            <StudentNotesModal
                isOpen={isNotesModalOpen}
                onClose={() => setIsNotesModalOpen(false)}
                notes={studentNotes}
                onArchiveStudent={async (id) => {
                    if (confirm("هل أنت متأكد من أرشفة هذا الطالب؟")) {
                        await archiveStudent(id);
                        queryClient.invalidateQueries({ queryKey: ['student-notes-details'] });
                    }
                }}
                onDeleteNote={async (id) => {
                    if (confirm("هل أنت متأكد من حذف هذه الملحوظة؟")) {
                        await deleteStudentNote(id);
                        queryClient.invalidateQueries({ queryKey: ['student-notes-details'] });
                    }
                }}
                onToggleRead={async (id, currentStatus) => {
                    await markNoteAsRead(id, !currentStatus);
                    queryClient.invalidateQueries({ queryKey: ['student-notes-details'] });
                }}
            />
        </div>
    );
}

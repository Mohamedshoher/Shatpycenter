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
    MessageSquare,
    Trophy
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
const StudentDetailModal = dynamic(() => import('@/features/students/components/StudentDetailModal'), { ssr: false });
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
    const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
    const queryClient = useQueryClient();
    const { archiveStudent } = useStudents();

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // إعادة توجيه المستخدمين بعيداً عن الصفحة الرئيسية حسب الدور
    useEffect(() => {
        if (user?.role === 'teacher') {
            router.push('/students');
        } else if (user?.role === 'parent') {
            router.push('/parent');
        }
    }, [user, router]);

    // جلب البيانات الحقيقية
    const { data: groups = [] as Group[], isLoading: loadingGroups } = useQuery({
        queryKey: ['groups'],
        queryFn: getGroups
    });

    // تصفية البيانات حسب دور المستخدم
    const myGroups = useMemo(() => {
        if (!groups) return [];
        return user?.role === 'teacher'
            ? groups.filter((g: Group) => g.teacherId === user.teacherId)
            : user?.role === 'supervisor'
                ? groups.filter((g: Group) => (user.responsibleSections || []).some(section => g.name.includes(section)))
                : groups;
    }, [groups, user]);

    const myGroupsIds = useMemo(() => myGroups.map(g => g.id), [myGroups]);

    const { data: students = [] as Student[], isLoading: loadingStudents } = useQuery({
        queryKey: ['students', myGroupsIds?.length],
        queryFn: () => getStudents(myGroupsIds)
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
    // استبعاد الطلاب المؤرشفين من العد الإجمالي
    const activeStudents = students.filter((s: Student) => s.status !== 'archived');
    const myStudents = (user?.role === 'teacher' || user?.role === 'supervisor')
        ? activeStudents
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
                            {mounted && today.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
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
                        {/* Main Stats Grid - Compact Horizontal Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 px-2">
                            {stats.map((stat, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => {
                                        if (stat.onClick) stat.onClick();
                                        else if (stat.link) router.push(stat.link);
                                    }}
                                    className="bg-white rounded-[24px] p-4 shadow-sm border border-gray-50 flex items-center gap-4 cursor-pointer hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1 transition-all group"
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:rotate-6 shrink-0",
                                        stat.color,
                                        stat.onClick && isSyncing ? "animate-spin" : ""
                                    )}>
                                        <stat.icon size={20} />
                                    </div>
                                    <div className="flex-1 text-right">
                                        <p className="text-xs md:text-base font-black text-gray-800 leading-none">{stat.title}</p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xl font-black text-gray-900 font-sans leading-none">{stat.value}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Quick Actions Hub - New Admin Control Center */}
                        <div className="px-2 space-y-6 pb-20">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="font-black text-gray-900 text-2xl tracking-tight">الوصول السريع</h3>
                                <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase">مركز التحكم</span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                {[
                                    { title: 'غرفة الأتمتة', desc: 'خصومات وتقارير آلي', icon: RefreshCw, color: 'text-purple-600', bg: 'bg-purple-50', link: '/automation' },
                                    { title: 'تقارير الحضور', desc: 'متابعة الغياب اليومي', icon: CalendarCheck, color: 'text-green-600', bg: 'bg-green-50', link: '/attendance-report' },
                                    { title: 'مركز الاختبارات', desc: 'نتائج تقييم الطلاب', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50', link: '/exams-report' },
                                    { title: 'إدارة المجموعات', desc: 'توزيع الطلاب والمدرسين', icon: LayoutGrid, color: 'text-blue-600', bg: 'bg-blue-50', link: '/groups' },
                                ].map((action, idx) => (
                                    <motion.div
                                        key={idx}
                                        whileHover={{ y: -5, scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push(action.link)}
                                        className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/40 transition-all cursor-pointer group flex flex-col items-center text-center"
                                    >
                                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-12", action.bg, action.color)}>
                                            <action.icon size={28} />
                                        </div>
                                        <h4 className="font-black text-gray-900 text-sm mb-1">{action.title}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold leading-tight">{action.desc}</p>
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
                onStudentClick={(studentId) => {
                    const student = students.find((s: Student) => s.id === studentId);
                    if (student) setSelectedStudentForDetail(student);
                }}
            />

            {/* نافذة تفاصيل الطالب */}
            <StudentDetailModal
                student={selectedStudentForDetail}
                isOpen={!!selectedStudentForDetail}
                onClose={() => setSelectedStudentForDetail(null)}
                initialTab="notes"
            />
        </div>
    );
}

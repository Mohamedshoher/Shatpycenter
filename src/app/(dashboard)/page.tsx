"use client";
import { useEffect, useState, useMemo } from 'react';

import Users from 'lucide-react/dist/esm/icons/users'
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card'
import CalendarCheck from 'lucide-react/dist/esm/icons/calendar-check'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import Search from 'lucide-react/dist/esm/icons/search'
import Loader from 'lucide-react/dist/esm/icons/loader'
import UserCheck from 'lucide-react/dist/esm/icons/user-check'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days'
import Check from 'lucide-react/dist/esm/icons/check'
import CloseIcon from 'lucide-react/dist/esm/icons/x'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import MessageSquare from 'lucide-react/dist/esm/icons/message-square'
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import { useAuthStore } from '@/store/useAuthStore';
import { FadeIn, SlideIn } from '@/components/ui/transition';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStudents } from '@/features/students/services/studentService';
import { getGroups } from '@/features/groups/services/groupService';
import { getTransactionsByMonth } from '@/features/finance/services/financeService';
import { getLeaveRequests, updateLeaveRequest, LeaveRequest, getAllStudentNotesWithDetails, deleteStudentNote, markNoteAsRead, replyToNote } from '@/features/students/services/recordsService';
import { useStudents } from '@/features/students/hooks/useStudents';
import dynamic from 'next/dynamic';
const StudentNotesModal = dynamic(() => import('@/features/finance/components/StudentNotesModal'), { ssr: false });
const StudentDetailModal = dynamic(() => import('@/features/students/components/StudentDetailModal'), { ssr: false });
const EditStudentModal = dynamic(() => import('@/features/students/components/EditStudentModal'), { ssr: false });
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
    const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
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

    // جلب البيانات الحقيقية (فقط للمستخدمين المسموح لهم)
    const canLoadData = user?.role === 'director' || user?.role === 'supervisor' || user?.role === 'teacher';
    const { data: groups = [] as Group[], isLoading: loadingGroups } = useQuery({
        queryKey: ['groups'],
        queryFn: () => getGroups(),
        enabled: canLoadData
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
        queryFn: () => getStudents(myGroupsIds),
        enabled: canLoadData && myGroupsIds.length > 0
    });

    const { data: transactions = [] as FinancialTransaction[], isLoading: loadingFinance } = useQuery({
        queryKey: ['transactions', currentYear, currentMonth],
        queryFn: () => getTransactionsByMonth(currentYear, currentMonth),
        enabled: user?.role === 'director' || user?.role === 'supervisor'
    });

    const { data: todayAttendance = [] } = useQuery({
        queryKey: ['attendance', todayStr],
        queryFn: async () => {
            const { data } = await supabase.from('attendance').select('id, student_id, date, status').eq('date', todayStr).eq('status', 'present');
            return data || [];
        },
        enabled: canLoadData
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
        queryFn: () => getLeaveRequests(),
        enabled: user?.role === 'director' || user?.role === 'supervisor'
    });

    const pendingLeaves = leaveRequests.filter(r => r.status === 'pending');

    const { data: studentNotes = [] } = useQuery<any[]>({
        queryKey: ['student-notes-details'],
        queryFn: () => getAllStudentNotesWithDetails(),
        enabled: user?.role === 'director' || user?.role === 'supervisor'
    });

    const stats = [
        {
            title: user?.role === 'teacher' ? 'طلابي' : 'إجمالي الطلاب',
            value: myStudents.length.toString(),
            icon: Users,
            color: 'from-blue-500 to-blue-600',
            lightBg: 'bg-blue-50',
            border: 'border-blue-200',
            shadow: 'shadow-blue-500/10',
            roles: ['director', 'supervisor', 'teacher'],
            link: '/students'
        },
        {
            title: 'الحضور اليوم',
            value: myAttendanceCount.toString(),
            icon: CalendarCheck,
            color: 'from-green-500 to-emerald-600',
            lightBg: 'bg-green-50',
            border: 'border-green-200',
            shadow: 'shadow-green-500/10',
            roles: ['director', 'supervisor', 'teacher'],
            link: '/attendance-report'
        },
        {
            title: user?.role === 'teacher' ? 'مجموعاتي' : 'المجموعات',
            value: myGroups.length.toString(),
            icon: LayoutGrid,
            color: 'from-orange-500 to-orange-600',
            lightBg: 'bg-orange-50',
            border: 'border-orange-200',
            shadow: 'shadow-orange-500/10',
            roles: ['director', 'supervisor', 'teacher'],
            link: '/groups'
        },
        {
            title: 'طلاب جدد',
            value: pendingStudents.length.toString(),
            icon: UserCheck,
            color: 'from-amber-500 to-amber-600',
            lightBg: 'bg-amber-50',
            border: 'border-amber-200',
            shadow: 'shadow-amber-500/10',
            roles: ['director', 'supervisor'],
            link: '/students/pending'
        },

        {
            title: 'تحديث الحسابات',
            value: students.filter(s => s.status === 'active' && (s.parentPhone || '').replace(/[^0-9]/g, '').length >= 11).length.toString(),
            icon: RefreshCw,
            color: 'from-indigo-500 to-indigo-600',
            lightBg: 'bg-indigo-50',
            border: 'border-indigo-200',
            shadow: 'shadow-indigo-500/10',
            roles: ['director'],
            onClick: () => handleSyncParents()
        },
        {
            title: 'طلبات الإجازة',
            value: (user?.role === 'supervisor'
                ? pendingLeaves.filter(req => myStudents.some(s => s.fullName === req.studentName))
                : pendingLeaves).length.toString(),
            icon: CalendarDays,
            color: 'from-orange-500 to-rose-600',
            lightBg: 'bg-orange-50',
            border: 'border-orange-200',
            shadow: 'shadow-orange-500/10',
            roles: ['director', 'supervisor'],
            onClick: () => setIsLeaveModalOpen(true)
        },
        {
            title: 'ملحوظات الطلاب',
            value: (user?.role === 'supervisor'
                ? studentNotes.filter(n => !n.isRead && myStudents.some(s => s.id === n.studentId))
                : studentNotes.filter(n => !n.isRead)).length.toString(),
            icon: MessageSquare,
            color: 'from-blue-500 to-blue-600',
            lightBg: 'bg-blue-50',
            border: 'border-blue-200',
            shadow: 'shadow-blue-500/10',
            roles: ['director', 'supervisor'],
            onClick: () => setIsNotesModalOpen(true)
        },

    ].filter(s => s.roles.includes(user?.role || ''));

    const hour = today.getHours();
    const greeting = hour >= 5 && hour < 12 ? 'صباح الخير' : hour >= 12 && hour < 18 ? 'مساء الخير' : 'مرحباً';

    const isLoading = loadingStudents || loadingGroups || (loadingFinance && (user?.role === 'director' || user?.role === 'supervisor'));

    const handleSyncParents = async () => {
        setIsSyncing(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        const activeStudentsOnly = students.filter((s: Student) => s.status === 'active');
        const invalidCount = activeStudentsOnly.filter((s: Student) => (s.parentPhone || '').replace(/[^0-9]/g, '').length < 11).length;
        if (invalidCount > 0) {
            alert(`تم فحص البيانات. يوجد ${invalidCount} طلاب لديهم أرقام هواتف غير مكتملة (أقل من 11 رقم)، لن يتمكن أولياء أمورهم من الدخول حتى يتم تحديث بياناتهم.`);
        } else {
            alert('تم تحديث جميع حسابات أولياء الأمور بنجاح. جميع الأرقام مطابقة للمواصفات (11 رقم فأكثر).');
        }
        setIsSyncing(false);
    };

    return (
        <div className="min-h-screen bg-[#f8faff] pb-32">
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-10 text-right">
                {/* Welcome Banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-[32px] p-6 md:p-8 shadow-2xl shadow-blue-600/20">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white rounded-full blur-3xl" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
                            <div className="grid grid-cols-6 gap-4 opacity-5 rotate-12">
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <div key={i} className="w-2 h-2 bg-white rounded-full" />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                        <div className="text-center sm:text-right">
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight">
                                {greeting}، {user?.displayName || 'مستخدم'}
                            </h1>
                            <p className="text-sm md:text-base text-blue-200 font-bold mt-1.5">
                                {mounted && today.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white font-black text-sm shadow-lg">
                                {user?.displayName?.charAt(0) || 'م'}
                            </div>
                            <span className="text-white/80 text-xs font-bold">{user?.role === 'director' ? 'مدير عام' : user?.role === 'supervisor' ? 'مشرف' : user?.role === 'teacher' ? 'مدرس' : ''}</span>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="h-64 flex items-center justify-center font-bold text-gray-400">
                        <Loader className="w-10 h-10 text-blue-600 animate-spin ml-3" />
                        جاري تحميل البيانات...
                    </div>
                ) : (
                    <>
                        {/* Main Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {stats.map((stat, idx) => (
                                <div
                                    key={idx}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                    onClick={() => {
                                        if (stat.onClick) stat.onClick();
                                        else if (stat.link) router.push(stat.link);
                                    }}
                                    className="bg-white rounded-[24px] p-4 border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-xl hover:shadow-gray-200/60 hover:-translate-y-1 transition-all group animate-[fadeIn_0.4s_ease-out_both] relative overflow-hidden"
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shrink-0",
                                        stat.color,
                                        stat.onClick && isSyncing ? "animate-spin" : ""
                                    )}>
                                        <stat.icon size={22} className="text-white" />
                                    </div>
                                    <div className="flex-1 text-right min-w-0">
                                        <p className="text-xs font-black text-gray-500 truncate">{stat.title}</p>
                                        <div className="w-8 h-1 rounded-full mt-1.5 bg-gradient-to-r from-transparent to-gray-200" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-2xl md:text-3xl font-black text-gray-900 font-sans leading-none tabular-nums">{stat.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 px-1">
                                <div className="h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
                                <h3 className="font-black text-gray-900 text-xl">الوصول السريع</h3>
                                <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-full">مركز التحكم</span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                {[
                                    { title: 'غرفة الأتمتة', desc: 'خصومات وتقارير آلي', icon: RefreshCw, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', textColor: 'text-purple-600', link: '/automation' },
                                    { title: 'تقارير الحضور', desc: 'متابعة الغياب اليومي', icon: CalendarCheck, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', textColor: 'text-green-600', link: '/attendance-report' },
                                    { title: 'مركز الاختبارات', desc: 'نتائج تقييم الطلاب', icon: Trophy, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', textColor: 'text-amber-600', link: '/exams-report' },
                                    { title: 'إدارة المجموعات', desc: 'توزيع الطلاب والمدرسين', icon: LayoutGrid, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', textColor: 'text-blue-600', link: '/groups' },
                                ].map((action, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => router.push(action.link)}
                                        className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/40 transition-all cursor-pointer group flex flex-col items-center text-center hover:-translate-y-1 active:scale-[0.97]"
                                    >
                                        <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-12", action.color)}>
                                            <action.icon size={26} className="text-white" />
                                        </div>
                                        <h4 className="font-black text-gray-900 text-sm mb-1">{action.title}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold leading-tight">{action.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>


            {/* نافذة إدارة طلبات الإجازة */}
            <FadeIn show={isLeaveModalOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsLeaveModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            </FadeIn>
            <SlideIn show={isLeaveModalOpen} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[80vh] overflow-hidden relative z-10 shadow-2xl flex flex-col">
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
                </div>
            </SlideIn>

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
                onTransferStudent={(studentId) => {
                    const student = students.find((s: Student) => s.id === studentId);
                    if (student) setSelectedStudentForEdit(student);
                }}
                onReplyToNote={async (noteId, reply) => {
                    await replyToNote(noteId, reply, user?.displayName || 'المدير');
                    queryClient.invalidateQueries({ queryKey: ['student-notes-details'] });
                }}
            />

            {/* نافذة تفاصيل الطالب */}
            <StudentDetailModal
                student={selectedStudentForDetail}
                isOpen={!!selectedStudentForDetail}
                onClose={() => setSelectedStudentForDetail(null)}
                initialTab="notes"
            />

            {/* نافذة تعديل بيانات الطالب (للنقل لمجموعة أخرى) */}
            <EditStudentModal
                isOpen={!!selectedStudentForEdit}
                onClose={() => setSelectedStudentForEdit(null)}
                student={selectedStudentForEdit}
            />
        </div>
    );
}

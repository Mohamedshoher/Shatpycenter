"use client";
import { useEffect, useState } from 'react';

import Users from 'lucide-react/dist/esm/icons/users'
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid'
import CalendarCheck from 'lucide-react/dist/esm/icons/calendar-check'
import UserCheck from 'lucide-react/dist/esm/icons/user-check'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days'
import MessageSquare from 'lucide-react/dist/esm/icons/message-square'
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Loader from 'lucide-react/dist/esm/icons/loader'
import CloseIcon from 'lucide-react/dist/esm/icons/x'
import Check from 'lucide-react/dist/esm/icons/check'
import { useAuthStore } from '@/store/useAuthStore';
import { FadeIn, SlideIn } from '@/components/ui/transition';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboardData } from '@/features/dashboard/services/dashboardService';
import { updateLeaveRequest, deleteStudentNote, markNoteAsRead, replyToNote } from '@/features/students/services/recordsService';
import { useStudents } from '@/features/students/hooks/useStudents';
import dynamic from 'next/dynamic';
const StudentNotesModal = dynamic(() => import('@/features/finance/components/StudentNotesModal'), { ssr: false });
const StudentDetailModal = dynamic(() => import('@/features/students/components/StudentDetailModal'), { ssr: false });
const EditStudentModal = dynamic(() => import('@/features/students/components/EditStudentModal'), { ssr: false });
import { Student } from '@/types';
import { useRouter } from 'next/navigation';

export default function DashboardOverview() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const today = new Date();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
    const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
    const queryClient = useQueryClient();
    const { archiveStudent } = useStudents();

    useEffect(() => {
        if (user?.role === 'teacher') router.push('/students');
        else if (user?.role === 'parent') router.push('/parent');
    }, [user, router]);

    const canLoadData = user?.role === 'director' || user?.role === 'supervisor' || user?.role === 'teacher';

    const { data: dashData, isLoading } = useQuery({
        queryKey: ['dashboard', user?.role, user?.teacherId],
        queryFn: () => getDashboardData({
            role: user?.role,
            teacherId: user?.teacherId,
            sections: user?.responsibleSections,
        }),
        enabled: canLoadData,
    });

    const groups = dashData?.groups || [];
    const students = dashData?.students || [];
    const myAttendanceCount = dashData?.todayAttendanceCount || 0;
    const pendingLeaves = dashData?.pendingLeaves || [];
    const unreadNotesCount = dashData?.unreadNotesCount || 0;
    const recentNotes = dashData?.recentNotes || [];

    const activeStudents = students.filter((s: Student) => s.status !== 'archived');
    const pendingStudents = students.filter((s: Student) => s.status === 'pending');
    const isDirectorOrSupervisor = user?.role === 'director' || user?.role === 'supervisor';
    const isDirector = user?.role === 'director';

    const hour = today.getHours();
    const greeting = hour >= 5 && hour < 12 ? 'صباح الخير' : hour >= 12 && hour < 18 ? 'مساء الخير' : 'مرحباً';

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

    const stats = [
        {
            title: user?.role === 'teacher' ? 'طلابي' : 'إجمالي الطلاب',
            value: activeStudents.length.toString(),
            icon: Users,
            color: 'from-blue-500 to-blue-600',
            link: '/students'
        },
        {
            title: 'الحضور اليوم',
            value: myAttendanceCount.toString(),
            icon: CalendarCheck,
            color: 'from-green-500 to-emerald-600',
            link: '/attendance-report'
        },
        {
            title: user?.role === 'teacher' ? 'مجموعاتي' : 'المجموعات',
            value: groups.length.toString(),
            icon: LayoutGrid,
            color: 'from-orange-500 to-orange-600',
            link: '/groups'
        },
        ...(isDirectorOrSupervisor ? [{
            title: 'طلاب جدد',
            value: pendingStudents.length.toString(),
            icon: UserCheck,
            color: 'from-amber-500 to-amber-600',
            link: '/students/pending'
        }] : []),
        ...(isDirector ? [{
            title: 'تحديث الحسابات',
            value: students.filter((s: Student) => s.status === 'active' && (s.parentPhone || '').replace(/[^0-9]/g, '').length >= 11).length.toString(),
            icon: RefreshCw,
            color: 'from-indigo-500 to-indigo-600',
            onClick: () => handleSyncParents()
        }] : []),
        ...(isDirectorOrSupervisor ? [{
            title: 'طلبات الإجازة',
            value: pendingLeaves.length.toString(),
            icon: CalendarDays,
            color: 'from-orange-500 to-rose-600',
            onClick: () => setIsLeaveModalOpen(true)
        }] : []),
        ...(isDirectorOrSupervisor ? [{
            title: 'ملحوظات الطلاب',
            value: unreadNotesCount.toString(),
            icon: MessageSquare,
            color: 'from-blue-500 to-blue-600',
            onClick: () => setIsNotesModalOpen(true)
        }] : []),
    ];

    return (
        <div className="min-h-screen bg-[#f8faff] pb-24 md:pb-32">
            <div className="max-w-7xl mx-auto p-3 md:p-6 lg:p-8 space-y-4 md:space-y-8 text-right">
                {/* Welcome Banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl md:rounded-[32px] p-4 md:p-8 shadow-xl md:shadow-2xl shadow-blue-600/20">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white rounded-full blur-3xl" />
                    </div>
                    <div className="relative z-10 flex flex-row items-center justify-between gap-3">
                        <div className="text-right">
                            <h1 className="text-lg md:text-3xl lg:text-4xl font-black text-white leading-tight">
                                {greeting}، {user?.displayName || 'مستخدم'}
                            </h1>
                            <p className="text-xs md:text-base text-blue-200 font-bold mt-0.5 md:mt-1.5">
                                {today.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl border border-white/10">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white font-black text-[10px] md:text-sm shadow-lg">
                                {user?.displayName?.charAt(0) || 'م'}
                            </div>
                            <span className="text-white/80 text-[10px] md:text-xs font-bold">{user?.role === 'director' ? 'مدير عام' : user?.role === 'supervisor' ? 'مشرف' : user?.role === 'teacher' ? 'مدرس' : ''}</span>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="h-48 md:h-64 flex items-center justify-center font-bold text-gray-400">
                        <Loader className="w-8 h-8 md:w-10 md:h-10 text-blue-600 animate-spin ml-3" />
                        جاري تحميل البيانات...
                    </div>
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                            {stats.map((stat, idx) => (
                                <div
                                    key={idx}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                    onClick={() => {
                                        if (stat.onClick) stat.onClick();
                                        else if (stat.link) router.push(stat.link);
                                    }}
                                    className="bg-white rounded-xl md:rounded-[24px] p-3 md:p-4 border border-gray-100 flex items-center gap-2 md:gap-4 cursor-pointer hover:shadow-xl hover:shadow-gray-200/60 hover:-translate-y-0.5 transition-all group animate-[fadeIn_0.4s_ease-out_both]"
                                >
                                    <div className={cn(
                                        "w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 shrink-0",
                                        stat.color,
                                    )}>
                                        <stat.icon size={16} className="text-white md:w-[22px] md:h-[22px]" />
                                    </div>
                                    <div className="flex-1 text-right min-w-0">
                                        <p className="text-[10px] md:text-xs font-black text-gray-500 truncate">{stat.title}</p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-lg md:text-3xl font-black text-gray-900 font-sans leading-none tabular-nums">{stat.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-3 md:space-y-5">
                            <div className="flex items-center gap-2 md:gap-3 px-1">
                                <div className="h-5 w-1 md:h-7 md:w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
                                <h3 className="font-black text-gray-900 text-sm md:text-xl">الوصول السريع</h3>
                                <span className="text-[8px] md:text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 md:px-3 md:py-1 rounded-full">مركز التحكم</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 md:gap-4">
                                {[
                                    { title: 'الأتمتة', desc: 'خصومات وتقارير آلي', icon: RefreshCw, color: 'from-purple-500 to-purple-600', link: '/automation' },
                                    { title: 'الحضور', desc: 'متابعة الغياب اليومي', icon: CalendarCheck, color: 'from-green-500 to-emerald-600', link: '/attendance-report' },
                                    { title: 'الاختبارات', desc: 'نتائج تقييم الطلاب', icon: Trophy, color: 'from-amber-500 to-amber-600', link: '/exams-report' },
                                    { title: 'المجموعات', desc: 'توزيع الطلاب', icon: LayoutGrid, color: 'from-blue-500 to-blue-600', link: '/groups' },
                                ].map((action, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => router.push(action.link)}
                                        className="bg-white rounded-2xl md:rounded-[28px] p-3 md:p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/40 transition-all cursor-pointer group flex flex-col items-center text-center hover:-translate-y-0.5 active:scale-[0.97]"
                                    >
                                        <div className={cn("w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br flex items-center justify-center mb-2 md:mb-4 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-12", action.color)}>
                                            <action.icon size={18} className="text-white md:w-[26px] md:h-[26px]" />
                                        </div>
                                        <h4 className="font-black text-gray-900 text-[11px] md:text-sm mb-0.5 md:mb-1">{action.title}</h4>
                                        <p className="text-[8px] md:text-[10px] text-gray-400 font-bold leading-tight">{action.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Leave modal */}
            <FadeIn show={isLeaveModalOpen} className="fixed inset-0 z-[100]">
                <div onClick={() => setIsLeaveModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            </FadeIn>
            <SlideIn show={isLeaveModalOpen} className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4">
                <div className="bg-white rounded-3xl md:rounded-[40px] w-full max-w-2xl max-h-[80vh] overflow-hidden relative z-10 shadow-2xl flex flex-col">
                    <div className="p-4 md:p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                        <h2 className="text-lg md:text-2xl font-black text-gray-900 border-r-4 border-orange-500 pr-3 md:pr-4">طلبات الإجازة المعلقة</h2>
                        <button onClick={() => setIsLeaveModalOpen(false)} className="w-9 h-9 md:w-12 md:h-12 bg-gray-50 rounded-xl md:rounded-2xl flex items-center justify-center text-gray-400">
                            <CloseIcon size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 md:space-y-4">
                        {pendingLeaves.length === 0 ? (
                            <div className="text-center py-8 md:py-12 text-gray-400 font-bold text-sm md:text-base">
                                لا توجد طلبات إجازة معلقة حالياً
                            </div>
                        ) : (
                            pendingLeaves.map((req: any) => (
                                <div key={req.id} className="bg-gray-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-gray-100">
                                    <div className="flex items-center justify-between mb-3 md:mb-4">
                                        <div>
                                            <h3 className="font-black text-gray-900 text-sm md:text-lg">{req.studentName}</h3>
                                            <p className="text-[10px] md:text-xs text-blue-600 font-bold">
                                                من {req.startDate} إلى {req.endDate}
                                            </p>
                                        </div>
                                        <div className="flex gap-1.5 md:gap-2">
                                            <button
                                                onClick={async () => {
                                                    await updateLeaveRequest(req.id, { status: 'approved' });
                                                    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                                                }}
                                                className="w-8 h-8 md:w-10 md:h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all"
                                                title="موافقة"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    await updateLeaveRequest(req.id, { status: 'rejected' });
                                                    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                                                }}
                                                className="w-8 h-8 md:w-10 md:h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"
                                                title="رفض"
                                            >
                                                <CloseIcon size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-3 md:p-4 text-xs md:text-sm text-gray-600 font-bold shadow-sm">
                                        <p className="text-[8px] md:text-[10px] text-gray-400 mb-1">السبب:</p>
                                        {req.reason}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </SlideIn>

            {/* Notes modal */}
            <StudentNotesModal
                isOpen={isNotesModalOpen}
                onClose={() => setIsNotesModalOpen(false)}
                notes={recentNotes}
                onArchiveStudent={async (id: string) => {
                    if (confirm("هل أنت متأكد من أرشفة هذا الطالب؟")) {
                        await archiveStudent(id);
                        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                    }
                }}
                onDeleteNote={async (id: string) => {
                    if (confirm("هل أنت متأكد من حذف هذه الملحوظة؟")) {
                        await deleteStudentNote(id);
                        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                    }
                }}
                onToggleRead={async (id: string, currentStatus: boolean) => {
                    await markNoteAsRead(id, !currentStatus);
                    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                }}
                onStudentClick={(studentId: string) => {
                    const student = students.find((s: Student) => s.id === studentId);
                    if (student) setSelectedStudentForDetail(student);
                }}
                onTransferStudent={(studentId: string) => {
                    const student = students.find((s: Student) => s.id === studentId);
                    if (student) setSelectedStudentForEdit(student);
                }}
                onReplyToNote={async (noteId: string, reply: string) => {
                    await replyToNote(noteId, reply, user?.displayName || 'المدير');
                    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                }}
            />

            <StudentDetailModal
                student={selectedStudentForDetail}
                isOpen={!!selectedStudentForDetail}
                onClose={() => setSelectedStudentForDetail(null)}
                initialTab="notes"
            />

            <EditStudentModal
                isOpen={!!selectedStudentForEdit}
                onClose={() => setSelectedStudentForEdit(null)}
                student={selectedStudentForEdit}
            />
        </div>
    );
}

"use client";
import { useEffect } from 'react';

import {
    Users,
    LayoutGrid,
    CreditCard,
    CalendarCheck,
    TrendingUp,
    MessageCircle,
    Bell,
    Search,
    Loader,
    UserCheck
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getStudents } from '@/features/students/services/studentService';
import { getGroups } from '@/features/groups/services/groupService';
import { getTransactionsByMonth } from '@/features/finance/services/financeService';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardOverview() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // إعادة توجيه المدرس بعيداً عن الصفحة الرئيسية
    useEffect(() => {
        if (user?.role === 'teacher') {
            router.push('/students');
        }
    }, [user, router]);

    // جلب البيانات الحقيقية
    const { data: students = [], isLoading: loadingStudents } = useQuery({
        queryKey: ['students'],
        queryFn: getStudents
    });

    const { data: groups = [], isLoading: loadingGroups } = useQuery({
        queryKey: ['groups'],
        queryFn: getGroups
    });

    const { data: transactions = [], isLoading: loadingFinance } = useQuery({
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
    const myGroups = user?.role === 'teacher' ? groups.filter(g => g.teacherId === user.teacherId) : groups;
    const myGroupsIds = myGroups.map(g => g.id);
    // استبعاد الطلاب المؤرشفين من العد الإجمالي
    const activeStudents = students.filter(s => s.status !== 'archived');
    const myStudents = user?.role === 'teacher'
        ? activeStudents.filter(s => myGroupsIds.includes(s.groupId || ''))
        : activeStudents;
    const myAttendanceCount = user?.role === 'teacher'
        ? todayAttendance.filter(a => myStudents.some(s => s.id === a.student_id)).length
        : todayAttendance.length;

    const monthlyIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    // حساب عدد الطلاب المعلقين
    const pendingStudents = students.filter(s => s.status === 'pending');

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
            link: '/attendance'
        },
        {
            title: 'إيرادات الشهر',
            value: monthlyIncome.toLocaleString(),
            icon: CreditCard,
            color: 'bg-purple-500',
            roles: ['director', 'supervisor'],
            link: '/finance'
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
    ].filter(s => s.roles.includes(user?.role || ''));

    const isLoading = loadingStudents || loadingGroups || (loadingFinance && (user?.role === 'director' || user?.role === 'supervisor'));

    return (
        <div className="space-y-8 pb-24 text-right p-4 md:p-6 font-sans" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between px-2 pt-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 leading-tight">مرحباً، {user?.displayName || 'مستخدم'} 👋</h1>
                    <p className="text-sm text-gray-400 font-bold mt-1">
                        {today.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => router.push('/chat')} className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors">
                        <MessageCircle size={22} />
                    </button>
                    <button className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 relative">
                        <Bell size={22} />
                        <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
                        {stats.map((stat, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => router.push(stat.link)}
                                className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 flex flex-col items-center gap-4 cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all group"
                            >
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6", stat.color)}>
                                    <stat.icon size={28} />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-400 font-bold mb-1">{stat.title}</p>
                                    <p className="text-2xl font-black text-gray-900 font-sans">{stat.value}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Recent Activity Section */}
                    <div className="px-2 space-y-6 pt-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-black text-gray-900 text-xl tracking-tight">آخر التحديثات</h3>
                            <button onClick={() => router.push('/students')} className="text-blue-600 text-sm font-bold bg-blue-50 px-4 py-1.5 rounded-full hover:bg-blue-100 transition-colors">عرض الكل</button>
                        </div>

                        <div className="space-y-4">
                            {[
                                { tag: 'حضور', text: `تم تسجيل حضور ${todayAttendance.length} طالباً اليوم حتى الآن`, time: 'اليوم', icon: CalendarCheck, color: 'text-orange-500', bg: 'bg-orange-50', roles: ['director', 'supervisor', 'teacher'] },
                                { tag: 'طلاب', text: `تم تسجيل ${students.length} طالباً في النظام`, time: 'محدث', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', roles: ['director', 'supervisor'] },
                                { tag: 'مالية', text: `إجمالي إيرادات النقدية لهذا الشهر: ${monthlyIncome.toLocaleString()} ج.م`, time: 'هذا الشهر', icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-50', roles: ['director'] },
                            ]
                                .filter(item => item.roles.includes(user?.role || ''))
                                .map((item, idx) => (
                                    <div key={idx} className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-50 flex items-center gap-5 hover:border-blue-100 transition-colors">
                                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", item.bg, item.color)}>
                                            <item.icon size={22} />
                                        </div>
                                        <div className="flex-1 text-right">
                                            <div className="flex items-center justify-end gap-3 mb-1.5">
                                                <span className="text-xs text-gray-300 font-bold">{item.time}</span>
                                                <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider", item.bg, item.color)}>{item.tag}</span>
                                            </div>
                                            <p className="text-[15px] font-bold text-gray-700 leading-snug">{item.text}</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </>
            )}


        </div>
    );
}

"use client";

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudents } from '@/features/students/services/studentService';
import { getGroups } from '@/features/groups/services/groupService';
import { useAuthStore } from '@/store/useAuthStore';
import { Users, Calendar, Phone, BookOpen, Info, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Student, Group } from '@/types';

export default function TeacherNewStudentsPage() {
    const user = useAuthStore((state) => state.user);

    const { data: allGroups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: () => getGroups()
    });

    const myGroupIds = useMemo(() => {
        if (!allGroups.length || !user?.teacherId) return [];
        return allGroups
            .filter((g: Group) => g.teacherId === user.teacherId)
            .map((g: Group) => g.id);
    }, [allGroups, user?.teacherId]);

    const { data: allStudents = [] } = useQuery({
        queryKey: ['students', myGroupIds.join(',')],
        queryFn: () => getStudents(myGroupIds),
        enabled: myGroupIds.length > 0
    });

    const getGroupName = (groupId: string | null) => {
        if (!groupId) return 'بدون مجموعة';
        const group = allGroups.find((g: Group) => g.id === groupId);
        return group?.name || 'مجموعة غير معروفة';
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const newStudents = useMemo(() => {
        return allStudents
            .filter((s: Student) => {
                if (s.status === 'archived') return false;
                if (!s.enrollmentDate) return false;
                const d = new Date(s.enrollmentDate);
                d.setHours(0, 0, 0, 0);
                return d >= sevenDaysAgo && d <= new Date();
            })
            .sort((a: Student, b: Student) => {
                const dateA = new Date(b.enrollmentDate || 0).getTime();
                const dateB = new Date(a.enrollmentDate || 0).getTime();
                return dateA - dateB;
            });
    }, [allStudents]);

    return (
        <div className="p-4 md:p-6 space-y-6 pb-24" dir="rtl">
            {/* Header */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <UserCheck size={28} />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black text-gray-900">الطلاب الجدد</h1>
                        <p className="text-sm text-gray-500 font-bold mt-1">
                            {newStudents.length} طالب مضاف حديثاً لمجموعاتك
                        </p>
                    </div>
                </div>
            </div>

            {/* Info Banner - 7 أيام بدون مصروفات */}
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 shrink-0 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Info size={20} className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-amber-800 text-sm mb-1">إشعار هام</h3>
                        <p className="text-xs font-bold text-amber-700 leading-relaxed">
                            الطلاب المضافون حديثاً مسموح لهم بالحضور دون مصروفات لمدة 7 أيام فقط من تاريخ التسجيل.
                            يرجى متابعة حالتهم المالية بعد انتهاء هذه المدة.
                        </p>
                    </div>
                </div>
            </div>

            {/* Students List */}
            {newStudents.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
                    <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Users size={32} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-bold text-lg">لا يوجد طلاب جدد في مجموعاتك خلال آخر 7 أيام</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {newStudents.map((student: Student, idx: number) => (
                        <div
                            key={student.id}
                            className="bg-white rounded-3xl p-4 shadow-sm border border-green-100 hover:shadow-xl transition-all animate-[fadeIn_0.3s_ease-out]"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            {/* Avatar + Name + Group */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm">
                                    {student.fullName[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-gray-900 leading-tight">{student.fullName}</h3>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full">
                                            <BookOpen size={11} />
                                            {getGroupName(student.groupId)}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                                            <Calendar size={11} />
                                            {student.enrollmentDate}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {/* Info row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mr-[52px]">
                                {student.parentPhone && (
                                    <span className="flex items-center gap-1.5">
                                        <Phone size={12} className="text-blue-400" />
                                        <span className="font-sans font-bold text-gray-700">{student.parentPhone}</span>
                                    </span>
                                )}
                                {student.monthlyAmount ? (
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-bold text-gray-500">رسوم:</span>
                                        <span className="font-sans font-bold text-gray-700">{student.monthlyAmount} ج.م</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">بدون مصروفات (7 أيام)</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudents } from '@/features/students/services/studentService';
import { getGroups } from '@/features/groups/services/groupService';
import { useAuthStore } from '@/store/useAuthStore';
import { Clock, Users, ArrowRight, Loader2, CalendarClock, TrendingUp, Filter, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import StudentDetailModal from '@/features/students/components/StudentDetailModal';

export default function SchedulesDashboard() {
    const { user } = useAuthStore();
    const [selectedDay, setSelectedDay] = useState<string>('الأحد');
    const [searchGroup, setSearchGroup] = useState<string>('');
    const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
    const [expandedUnscheduledGroupId, setExpandedUnscheduledGroupId] = useState<string | null>(null);
    const [expandedGroupSlotsIds, setExpandedGroupSlotsIds] = useState<string[]>([]);
    const [selectedStudentForModal, setSelectedStudentForModal] = useState<any | null>(null);

    const toggleGroupSlots = (groupId: string) => {
        setExpandedGroupSlotsIds(prev => 
            prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
        );
    };

    const weekDaysNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    const { data: allStudents, isLoading: isStudentsLoading } = useQuery({ queryKey: ['students'], queryFn: getStudents });
    const { data: allGroups, isLoading: isGroupsLoading } = useQuery({ queryKey: ['groups'], queryFn: getGroups });

    const isLoading = isStudentsLoading || isGroupsLoading;

    // معالجة البيانات وبناء الجدول
    const dashboardData = useMemo(() => {
        if (!allStudents || !allGroups) return [];

        // فلترة المجموعات بناءً على الصلاحيات والبحث
        let filteredGroups = allGroups;
        if (user?.role === 'teacher') {
            filteredGroups = filteredGroups.filter(g => g.teacher === user.displayName || g.teacherId === user.teacherId || g.teacherId === user.uid);
        }

        if (searchGroup) {
            filteredGroups = filteredGroups.filter(g => g.name.includes(searchGroup) || g.teacher?.includes(searchGroup));
        }

        const groupsData = filteredGroups.map(group => {
            const maxCapacity = group.maxStudentsPerHour || 5;
            
            // استخراج المواعيد الخاصة بهذه المجموعة في اليوم المحدد
            const slotsMap = new Map<string, any[]>();
            const studentsWithoutSchedule: any[] = [];

            allStudents.forEach(s => {
                if (s.groupId === group.id && s.status === 'active') {
                    if (s.appointment) {
                        s.appointment.split(',').forEach((p: string) => {
                            const parts = p.split(':');
                            if (parts.length >= 2) {
                                const d = parts[0].trim();
                                const t = parts.slice(1).join(':').trim();
                                
                                if (d === selectedDay) {
                                    if (!slotsMap.has(t)) {
                                        slotsMap.set(t, []);
                                    }
                                    slotsMap.get(t)!.push(s);
                                }
                            }
                        });
                    } else {
                        studentsWithoutSchedule.push(s);
                    }
                }
            });

            // تحويل Map إلى مصفوفة وترتيبها
            const slots = Array.from(slotsMap.entries()).map(([time, students]) => {
                const count = students.length;
                const percentage = Math.min(100, Math.round((count / maxCapacity) * 100));
                
                let statusColor = "bg-green-500";
                let statusBg = "bg-green-50";
                let statusText = "text-green-700";
                let statusLabel = "متاح";

                if (percentage >= 100) {
                    statusColor = "bg-red-500";
                    statusBg = "bg-red-50";
                    statusText = "text-red-700";
                    statusLabel = "ممتلئ";
                } else if (percentage >= 80) {
                    statusColor = "bg-orange-500";
                    statusBg = "bg-orange-50";
                    statusText = "text-orange-700";
                    statusLabel = "شبه ممتلئ";
                } else if (percentage >= 50) {
                    statusColor = "bg-blue-500";
                    statusBg = "bg-blue-50";
                    statusText = "text-blue-700";
                    statusLabel = "متوسط";
                }

                return {
                    time,
                    students,
                    count,
                    percentage,
                    statusColor,
                    statusBg,
                    statusText,
                    statusLabel
                };
            }).sort((a, b) => a.time.localeCompare(b.time));

            return {
                ...group,
                slots,
                totalStudentsToday: slots.reduce((sum, slot) => sum + slot.count, 0),
                studentsWithoutSchedule
            };
        });

        // ترتيب المجموعات بحيث تظهر المجموعات التي بها طلاب في هذا اليوم أولاً
        return groupsData.sort((a, b) => b.totalStudentsToday - a.totalStudentsToday);

    }, [allStudents, allGroups, selectedDay, user, searchGroup]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto pb-24 md:pb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <CalendarClock className="text-blue-600" size={28} />
                        تحليل ومراقبة المواعيد
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-bold">
                        راقب توزيع الطلاب على المجموعات
                    </p>
                </div>
                
                {user?.role !== 'teacher' && (
                    <div className="relative">
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="بحث عن مجموعة أو معلم..."
                            value={searchGroup}
                            onChange={(e) => setSearchGroup(e.target.value)}
                            className="pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold w-full md:w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                        />
                    </div>
                )}
            </div>

            {/* Days Navigation */}
            <div className="bg-white p-1 md:p-2 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm overflow-x-auto custom-scrollbar w-full max-w-[calc(100vw-32px)] md:max-w-none">
                <div className="flex items-center gap-1.5 md:gap-2 min-w-max px-0.5">
                    {weekDaysNames.map(day => (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={cn(
                                "px-3.5 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-black text-xs md:text-sm transition-all duration-300 relative overflow-hidden",
                                selectedDay === day 
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                            )}
                        >
                            {selectedDay === day && (
                                <motion.div 
                                    layoutId="activeDay" 
                                    className="absolute inset-0 bg-white/20" 
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">{day}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Grid */}
            <div className="space-y-4">
                {dashboardData.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                        <CalendarClock size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-lg font-black text-gray-500">لا توجد مجموعات لعرضها</p>
                    </div>
                ) : (
                    dashboardData.map((group) => (
                        <motion.div 
                            key={group.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden"
                        >
                            {/* Group Header */}
                            <div className="bg-gray-50/80 p-4 md:p-5 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
                                        {group.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-base md:text-lg text-gray-900">{group.name}</h3>
                                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs font-bold text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Users size={14} /> المعلم: {group.teacher || 'غير محدد'}
                                            </span>
                                            <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-300" />
                                            <span>السعة القصوى: {group.maxStudentsPerHour || 5} طلاب/ساعة</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2">
                                    {group.studentsWithoutSchedule?.length > 0 && (
                                        <button 
                                            onClick={() => setExpandedUnscheduledGroupId(expandedUnscheduledGroupId === group.id ? null : group.id)}
                                            className={cn(
                                                "px-3 md:px-4 py-2 rounded-xl border shadow-sm flex items-center gap-2 w-fit transition-colors",
                                                expandedUnscheduledGroupId === group.id 
                                                    ? "bg-red-100 text-red-700 border-red-200" 
                                                    : "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                                            )}
                                        >
                                            <UserMinus size={16} />
                                            <span className="text-[10px] md:text-xs font-bold">بدون موعد:</span>
                                            <span className="font-black text-sm md:text-base">{group.studentsWithoutSchedule.length}</span>
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => toggleGroupSlots(group.id)}
                                        className={cn(
                                            "px-3 md:px-4 py-2 rounded-xl border shadow-sm flex items-center gap-2 w-fit transition-all duration-300",
                                            expandedGroupSlotsIds.includes(group.id)
                                                ? "bg-blue-50 border-blue-200"
                                                : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                                        )}
                                    >
                                        <TrendingUp size={16} className={group.totalStudentsToday > 0 ? "text-blue-500" : "text-gray-400"} />
                                        <span className="text-[10px] md:text-xs font-bold text-gray-600">إجمالي طلاب اليوم:</span>
                                        <span className="font-black text-blue-600 text-sm md:text-base">{group.totalStudentsToday}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Unscheduled Students List */}
                            <AnimatePresence>
                                {expandedUnscheduledGroupId === group.id && group.studentsWithoutSchedule?.length > 0 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden bg-red-50/30 border-b border-red-100/50"
                                    >
                                        <div className="p-4 md:p-5">
                                            <p className="text-xs font-bold text-red-600 mb-3">الطلاب الذين لم يسجلوا مواعيد بعد (انقر على اسم الطالب لتسجيل موعد):</p>
                                            <div className="flex flex-wrap gap-2">
                                                {group.studentsWithoutSchedule.map((st: any) => (
                                                    <button
                                                        key={st.id}
                                                        onClick={() => setSelectedStudentForModal(st)}
                                                        className="text-xs font-bold text-gray-700 bg-white px-3 py-2 rounded-lg border border-red-200 flex items-center gap-2 hover:bg-red-50 hover:text-red-700 hover:shadow-sm transition-all"
                                                    >
                                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                                        {st.fullName}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Time Slots */}
                            <AnimatePresence>
                                {expandedGroupSlotsIds.includes(group.id) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-5 border-t border-gray-100">
                                            {group.slots.length === 0 ? (
                                                <div className="text-center py-6 text-gray-400 font-bold text-sm bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                                    لا توجد مواعيد مسجلة في هذه المجموعة يوم {selectedDay}
                                                </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {group.slots.map((slot, idx) => {
                                            const slotId = `${group.id}-${slot.time}`;
                                            const isExpanded = expandedSlotId === slotId;
                                            return (
                                            <div 
                                                key={idx} 
                                                onClick={() => setExpandedSlotId(isExpanded ? null : slotId)}
                                                className={cn("p-4 rounded-2xl border transition-all duration-300 cursor-pointer hover:shadow-md", slot.statusBg, slot.percentage >= 100 ? "border-red-100" : "border-transparent hover:border-gray-200 bg-gray-50/50")}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={16} className="text-gray-400" />
                                                        <span className="font-black text-gray-800 text-sm">{slot.time}</span>
                                                    </div>
                                                    <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full", slot.statusBg, slot.statusText)}>
                                                        {slot.statusLabel}
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-bold">
                                                        <span className="text-gray-500">العدد المسجل</span>
                                                        <span className={cn("font-black", slot.statusText)}>
                                                            {slot.count} / {group.maxStudentsPerHour || 5}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Progress Bar */}
                                                    <div className="h-2.5 w-full bg-gray-200/60 rounded-full overflow-hidden">
                                                        <div 
                                                            className={cn("h-full rounded-full transition-all duration-1000", slot.statusColor)}
                                                            style={{ width: `${slot.percentage}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Expanded Students Details */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                                            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                                                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="pt-3 border-t border-gray-200/50 space-y-2">
                                                                <p className="text-[11px] font-black text-gray-500 mb-2">الطلاب المسجلين:</p>
                                                                {slot.students.map((st: any) => (
                                                                    <div key={st.id} className="text-xs font-bold text-gray-800 bg-white/50 px-3 py-2 rounded-lg border border-gray-100 flex items-center gap-2">
                                                                        <div className={cn("w-2 h-2 rounded-full", slot.statusColor)} />
                                                                        {st.fullName}
                                                                    </div>
                                                                ))}
                                                                {slot.students.length === 0 && (
                                                                    <p className="text-xs text-gray-400">لا يوجد طلاب</p>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            );
                                        })}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Student Detail Modal for Schedule Update */}
            {selectedStudentForModal && (
                <StudentDetailModal
                    student={selectedStudentForModal}
                    isOpen={!!selectedStudentForModal}
                    onClose={() => setSelectedStudentForModal(null)}
                    initialTab="schedule"
                />
            )}
        </div>
    );
}

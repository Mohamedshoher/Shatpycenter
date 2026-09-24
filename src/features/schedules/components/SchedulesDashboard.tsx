"use client";

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { getStudents, clearGroupAppointments } from '@/features/students/services/studentService';
import { getGroups } from '@/features/groups/services/groupService';
import { useAuthStore } from '@/store/useAuthStore';
import Clock from 'lucide-react/dist/esm/icons/clock'
import Users from 'lucide-react/dist/esm/icons/users'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right'
import Loader2 from 'lucide-react/dist/esm/icons/loader-2'
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import Filter from 'lucide-react/dist/esm/icons/filter'
import Search from 'lucide-react/dist/esm/icons/search'
import UserMinus from 'lucide-react/dist/esm/icons/user-minus';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus'
import CalendarX from 'lucide-react/dist/esm/icons/calendar-x'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import X from 'lucide-react/dist/esm/icons/x'
import { cn, tieredSearchFilter } from '@/lib/utils';
import { FadeIn } from '@/components/ui/transition';
import StudentDetailModal from '@/features/students/components/StudentDetailModal';

const AddStudentModal = dynamic(() => import('@/features/students/components/AddStudentModal'), { ssr: false });

export default function SchedulesDashboard() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedDay, setSelectedDay] = useState<string>('الأحد');
    const [searchGroup, setSearchGroup] = useState<string>('');
    const [searchStudent, setSearchStudent] = useState<string>('');
    const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
    const [expandedUnscheduledGroupId, setExpandedUnscheduledGroupId] = useState<string | null>(null);
    const [expandedGroupSlotsIds, setExpandedGroupSlotsIds] = useState<string[]>([]);
    const [selectedStudentForModal, setSelectedStudentForModal] = useState<any | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [groupToCancel, setGroupToCancel] = useState<{ id: string, name: string, totalStudents: number, dayStudents: number } | null>(null);
    const [isCancellingGroup, setIsCancellingGroup] = useState(false);

    const canCancelGroup = user?.role === 'director' || user?.role === 'teacher' || user?.role === 'supervisor';

    const handleConfirmCancelGroup = async (dayOnly?: string) => {
        if (!groupToCancel) return;
        setIsCancellingGroup(true);
        try {
            await clearGroupAppointments(groupToCancel.id, dayOnly);
            await queryClient.invalidateQueries({ queryKey: ['students'] });
            setGroupToCancel(null);
        } catch (error) {
            alert('حدث خطأ أثناء إلغاء مواعيد المجموعة');
        } finally {
            setIsCancellingGroup(false);
        }
    };

    const toggleGroupSlots = (groupId: string) => {
        setExpandedGroupSlotsIds(prev => 
            prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
        );
    };

    const weekDaysNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    const { data: allStudents, isLoading: isStudentsLoading } = useQuery({ queryKey: ['students'], queryFn: () => getStudents() });
    const { data: allGroups, isLoading: isGroupsLoading } = useQuery({ queryKey: ['groups'], queryFn: () => getGroups() });

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

    // بحث عن طالب معين بالاسم لفتح تفاصيله مباشرة
    const studentSearchResults = useMemo(() => {
        if (!searchStudent.trim() || !allStudents) return [];
        const activeStudents = allStudents.filter(s => s.status === 'active');
        return tieredSearchFilter(activeStudents, searchStudent, (s: any) => s.fullName || '').slice(0, 10);
    }, [allStudents, searchStudent]);

    const getGroupName = (groupId: string | null | undefined) =>
        allGroups?.find(g => g.id === groupId)?.name || 'بدون مجموعة';

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
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="بحث عن طالب بالاسم..."
                                value={searchStudent}
                                onChange={(e) => setSearchStudent(e.target.value)}
                                className="pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold w-full sm:w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                            />
                        </div>
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
                                <div className="absolute inset-0 bg-white/20" />
                            )}
                            <span className="relative z-10">{day}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Student Search Results */}
            {user?.role !== 'teacher' && searchStudent.trim() !== '' && (
                <div className="bg-white rounded-[24px] border border-blue-100 shadow-sm p-4 md:p-5">
                    <p className="text-xs font-black text-gray-500 mb-3">نتائج البحث عن الطلاب (انقر على الطالب لفتح تفاصيله):</p>
                    {studentSearchResults.length === 0 ? (
                        <p className="text-sm font-bold text-gray-400 text-center py-4">لا يوجد طالب مطابق لهذا الاسم</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {studentSearchResults.map((st: any) => {
                                const hasAppointment = st.appointment?.split(',').some((p: string) => p.trim().startsWith(`${selectedDay}:`));
                                return (
                                    <button
                                        key={st.id}
                                        onClick={() => setSelectedStudentForModal(st)}
                                        className="flex flex-col items-start gap-0.5 text-right bg-gray-50 hover:bg-blue-50 px-3 py-2 rounded-xl border border-gray-200 hover:border-blue-300 transition-all group"
                                    >
                                        <span className="text-xs font-black text-gray-800 group-hover:text-blue-700">{st.fullName}</span>
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                            <span>{getGroupName(st.groupId)}</span>
                                            <span className={cn("px-1.5 py-0.5 rounded-full", hasAppointment ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                                                {hasAppointment ? `له موعد يوم ${selectedDay}` : `بدون موعد يوم ${selectedDay}`}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Content Grid */}
            <div className="space-y-4">
                {dashboardData.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                        <CalendarClock size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-lg font-black text-gray-500">لا توجد مجموعات لعرضها</p>
                    </div>
                ) : (
                    dashboardData.map((group, index) => (
                        <div key={group.id || index} className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
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
                                    {canCancelGroup && (
                                        <button
                                            onClick={() => setGroupToCancel({
                                                id: group.id,
                                                name: group.name,
                                                totalStudents: (allStudents || []).filter(s => s.groupId === group.id && s.status === 'active' && s.appointment).length,
                                                dayStudents: group.totalStudentsToday
                                            })}
                                            className="p-2 md:px-3.5 md:py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 shadow-sm flex items-center justify-center gap-1.5 transition-all font-black text-[10px] md:text-xs active:scale-95 shrink-0"
                                            title="إلغاء مواعيد المجموعة"
                                        >
                                            <CalendarX size={16} className="text-red-600" />
                                            <span className="hidden sm:inline">إلغاء المواعيد</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Unscheduled Students List */}
                            <FadeIn show={expandedUnscheduledGroupId === group.id && group.studentsWithoutSchedule?.length > 0}>
                                <div className="bg-red-50/30 border-b border-red-100/50">
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
                                </div>
                            </FadeIn>

                            {/* Time Slots */}
                            <FadeIn show={expandedGroupSlotsIds.includes(group.id)}>
                                <div>
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
                                            className={cn("p-4 rounded-2xl border transition-all duration-300 cursor-pointer hover:shadow-md", slot.percentage >= 100 ? `${slot.statusBg} border-red-100` : "bg-gray-50/50 border-transparent hover:border-gray-200")}
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
                                            <FadeIn show={isExpanded}>
                                                <div className="pt-3 border-t border-gray-200/50 space-y-2">
                                                    <p className="text-[11px] font-black text-gray-500 mb-2">الطلاب المسجلين (انقر على الطالب لفتح تفاصيله):</p>
                                                    {slot.students.map((st: any) => (
                                                        <button
                                                            key={st.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedStudentForModal(st);
                                                            }}
                                                            className="w-full text-right text-xs font-bold text-gray-800 bg-white/50 px-3 py-2 rounded-lg border border-gray-100 flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all cursor-pointer"
                                                        >
                                                            <div className={cn("w-2 h-2 rounded-full", slot.statusColor)} />
                                                            {st.fullName}
                                                        </button>
                                                    ))}
                                                    {slot.students.length === 0 && (
                                                        <p className="text-xs text-gray-400">لا يوجد طلاب</p>
                                                    )}
                                                </div>
                                            </FadeIn>
                                        </div>
                                        );
                                    })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </FadeIn>
                        </div>
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

            {/* Add Student Modal */}
            <AddStudentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            {/* Floating Add Student Button (السكرتارية) */}
            {user?.role === 'schedule_secretary' && (
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="fixed bottom-20 left-6 z-[100] w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/40 active:scale-90 transition-transform hover:bg-blue-700"
                    title="إضافة طالب جديد"
                >
                    <UserPlus size={26} />
                </button>
            )}

            {/* نافذة تأكيد إلغاء مواعيد المجموعة */}
            {groupToCancel && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="bg-gradient-to-br from-red-600 to-rose-700 p-6 text-white flex justify-between items-center relative overflow-hidden">
                            <CalendarX className="absolute -right-4 -top-4 w-28 h-28 opacity-10 rotate-12" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className="text-red-200" size={20} />
                                    <h3 className="font-black text-lg">إلغاء مواعيد المجموعة</h3>
                                </div>
                                <p className="text-red-100 text-xs font-bold">
                                    مجموعة: {groupToCancel.name}
                                </p>
                            </div>
                            <button
                                disabled={isCancellingGroup}
                                onClick={() => setGroupToCancel(null)}
                                className="relative z-10 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors disabled:opacity-50"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="bg-red-50/60 border border-red-100 p-4 rounded-2xl space-y-2">
                                <p className="text-xs font-black text-gray-700">
                                    اختر نوع الإلغاء المطلوب لطلاب مجموعة <span className="text-red-600">"{groupToCancel.name}"</span>:
                                </p>
                                <div className="text-[11px] font-bold text-gray-500 space-y-1 pr-2">
                                    <div>• طلاب مسجلين يوم {selectedDay}: <span className="font-black text-gray-800">{groupToCancel.dayStudents} طالب</span></div>
                                    <div>• إجمالي الطلاب المسجلين بمواعيد: <span className="font-black text-gray-800">{groupToCancel.totalStudents} طالب</span></div>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                {/* خيار 1: إلغاء مواعيد اليوم المحدد فقط */}
                                <button
                                    onClick={() => handleConfirmCancelGroup(selectedDay)}
                                    disabled={isCancellingGroup || groupToCancel.dayStudents === 0}
                                    className="w-full p-3.5 rounded-2xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100/80 text-orange-800 text-right transition-all flex items-center justify-between group disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                >
                                    <div>
                                        <div className="font-black text-xs md:text-sm">إلغاء مواعيد يوم ({selectedDay}) فقط</div>
                                        <div className="text-[10px] text-orange-600 font-bold mt-0.5">مسح موعد هذا اليوم فقط لجميع طلاب المجموعة ({groupToCancel.dayStudents} طالب)</div>
                                    </div>
                                    {isCancellingGroup ? <Loader2 size={18} className="animate-spin text-orange-600" /> : <CalendarX size={18} className="text-orange-500 group-hover:scale-110 transition-transform" />}
                                </button>

                                {/* خيار 2: إلغاء كافة المواعيد لجميع الأيام */}
                                <button
                                    onClick={() => handleConfirmCancelGroup()}
                                    disabled={isCancellingGroup || groupToCancel.totalStudents === 0}
                                    className="w-full p-3.5 rounded-2xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-right transition-all flex items-center justify-between group disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                >
                                    <div>
                                        <div className="font-black text-xs md:text-sm">إلغاء كافة المواعيد (جميع الأيام)</div>
                                        <div className="text-[10px] text-red-600 font-bold mt-0.5">تصفير جدول جميع الطلاب في هذه المجموعة بالكامل ({groupToCancel.totalStudents} طالب)</div>
                                    </div>
                                    {isCancellingGroup ? <Loader2 size={18} className="animate-spin text-red-600" /> : <Trash2 size={18} className="text-red-500 group-hover:scale-110 transition-transform" />}
                                </button>
                            </div>

                            <div className="pt-2">
                                <button
                                    disabled={isCancellingGroup}
                                    onClick={() => setGroupToCancel(null)}
                                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-xl text-xs transition-colors cursor-pointer"
                                >
                                    إلغاء وتراجع
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

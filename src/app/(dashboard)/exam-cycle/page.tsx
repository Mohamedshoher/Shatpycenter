"use client";

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import User from 'lucide-react/dist/esm/icons/user';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { cn } from '@/lib/utils';

import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useAuthStore } from '@/store/useAuthStore';
import {
    getExamCycleAssignments,
    setExamCycleAssignment,
    setExamCycleAssignmentsBatch,
} from '@/features/groups/services/examCycleService';

// أيام العمل بالترتيب (السبت هو أول يوم في العمل، الخميس والجمعة إجازة)
const WORK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء'];

// فهرس اليوم الحالي داخل WORK_DAYS (0..4)، أو -1 إن كان اليوم إجازة (خميس/جمعة)
const getTodayWorkdayIndex = () => {
    const jsDay = new Date().getDay(); // 0=الأحد .. 6=السبت
    const index = (jsDay + 1) % 7; // 0=السبت .. 6=الجمعة (نفس ترتيب WORK_DAYS ثم الخميس/الجمعة)
    return index <= 4 ? index : -1;
};

// تحديد نوع الأسبوع الحالي بالتبادل حسب رقم الأسبوع في الشهر:
// الأسبوع 1 و3 = "الجديد"، الأسبوع 2 و4 (وهكذا) = "الماضي"
const getWeekCycleLabel = () => {
    const dayOfMonth = new Date().getDate();
    const weekOfMonth = Math.ceil(dayOfMonth / 7);
    return weekOfMonth % 2 === 1 ? 'الجديد' : 'الماضي';
};

// مجموعات دورتها كل 15 يوم بدل كل أسبوع (بالاسم، مثل باقي الفلاتر بالمجموعة في المشروع)
const BIWEEKLY_GROUP_KEYWORDS = ['تلقين', 'نور البيان'];
const isBiweeklyGroup = (groupName: string) => BIWEEKLY_GROUP_KEYWORDS.some((k) => groupName.includes(k));

// "أسبوع 0" أو "أسبوع 1" ثابت منذ تاريخ مرجعي (سبت 6 يناير 2024)، يتبادل كل أسبوع تقويمي
// نستخدمه لتقسيم طلاب كل يوم في مجموعات الـ15 يوم نصفين بالتبادل، بدل تعطيل المجموعة كلها أسبوعاً كاملاً:
// نص الطلاب يختبرون هذا الأسبوع والنص الآخر الأسبوع اللي بعده، فيظل كل يوم فيه نشاط كل أسبوع.
const BIWEEKLY_EPOCH = new Date(2024, 0, 6).getTime();
const getCurrentWeekParity = () => {
    const diffDays = Math.floor((Date.now() - BIWEEKLY_EPOCH) / 86400000);
    const weekIndex = Math.floor(diffDays / 7);
    return weekIndex % 2;
};

const ALL_GROUPS_VALUE = '__all__';

export default function ExamCyclePage() {
    const queryClient = useQueryClient();
    const { data: students } = useStudents();
    const { data: groups } = useGroups();
    const { user } = useAuthStore();

    const canEdit = user?.role === 'director' || user?.role === 'supervisor' || user?.role === 'teacher';

    // المجموعات المتاحة حسب دور المستخدم
    const filteredGroupsList = useMemo(() => {
        return (groups || []).filter((g) => {
            if (user?.role === 'teacher') return g.teacherId === user.teacherId;
            if (user?.role === 'supervisor') {
                const sections = user.responsibleSections || [];
                return sections.some((section) => g.name.includes(section));
            }
            return true;
        });
    }, [groups, user]);

    // "كل المجموعات" هي الاختيار الافتراضي عند فتح الصفحة
    const [selectedGroupId, setSelectedGroupId] = useState(ALL_GROUPS_VALUE);

    const [selectedDay, setSelectedDay] = useState<number>(() => {
        const todayIndex = getTodayWorkdayIndex();
        return todayIndex === -1 ? 0 : todayIndex;
    });

    const weekCycleLabel = getWeekCycleLabel();
    const isAllGroups = selectedGroupId === ALL_GROUPS_VALUE;

    const groupNameMap = useMemo(() => {
        const map = new Map<string, string>();
        (groups || []).forEach((g) => map.set(g.id, g.name));
        return map;
    }, [groups]);

    // طلاب المجموعة المختارة (أو كل المجموعات) النشطون فقط
    const groupStudents = useMemo(() => {
        const groupIds = isAllGroups
            ? new Set(filteredGroupsList.map((g) => g.id))
            : new Set([selectedGroupId]);
        return (students || [])
            .filter((s) => s.groupId && groupIds.has(s.groupId) && s.status === 'active')
            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
    }, [students, selectedGroupId, isAllGroups, filteredGroupsList]);

    const groupStudentIds = useMemo(() => groupStudents.map((s) => s.id), [groupStudents]);

    // توزيع الطلاب الحالي (من قاعدة البيانات)
    const { data: assignments = [] } = useQuery({
        queryKey: ['exam-cycle', selectedGroupId, groupStudentIds],
        queryFn: () => getExamCycleAssignments(groupStudentIds),
        enabled: groupStudentIds.length > 0,
    });

    const assignmentMap = useMemo(() => {
        const map = new Map<string, number>();
        assignments.forEach((a) => map.set(a.studentId, a.weekday));
        return map;
    }, [assignments]);

    // تعيين أولي تلقائي لأي طالب جديد لسه ملوش يوم محدد: يُضاف لأقل الأيام ازدحاماً
    // نوزّع كل مجموعة على حدة (حتى في عرض "كل المجموعات") حتى لا تختلط موازنة الأيام بين مجموعات مختلفة،
    // وحتى تُوزَّع مجموعات لم تُفتح صفحتها بمفردها من قبل (كانت تظل بلا توزيع في عرض "كل المجموعات").
    useEffect(() => {
        if (groupStudents.length === 0) return;
        const unassigned = groupStudents.filter((s) => !assignmentMap.has(s.id));
        if (unassigned.length === 0) return;

        const countsByGroup = new Map<string, number[]>();
        groupStudents.forEach((s) => {
            if (!s.groupId) return;
            const day = assignmentMap.get(s.id);
            if (day === undefined) return;
            const counts = countsByGroup.get(s.groupId) || [0, 0, 0, 0, 0];
            counts[day] += 1;
            countsByGroup.set(s.groupId, counts);
        });

        const newItems = unassigned.map((s) => {
            const groupId = s.groupId || '';
            const counts = countsByGroup.get(groupId) || [0, 0, 0, 0, 0];
            let minDay = 0;
            for (let d = 1; d < 5; d++) {
                if (counts[d] < counts[minDay]) minDay = d;
            }
            counts[minDay] += 1;
            countsByGroup.set(groupId, counts);
            return { studentId: s.id, weekday: minDay };
        });

        setExamCycleAssignmentsBatch(newItems).then(() => {
            queryClient.invalidateQueries({ queryKey: ['exam-cycle', selectedGroupId, groupStudentIds] });
        }).catch((err) => console.error('تعذر التوزيع التلقائي:', err));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupStudents, assignmentMap]);

    const handleMoveStudent = async (studentId: string, newDay: number) => {
        try {
            await setExamCycleAssignment(studentId, newDay);
            queryClient.invalidateQueries({ queryKey: ['exam-cycle', selectedGroupId, groupStudentIds] });
        } catch (err) {
            console.error('تعذر نقل الطالب:', err);
        }
    };

    // لمجموعات الـ15 يوم: نقسم طلاب كل يوم أسبوعي نصفين بالتبادل (ترتيب ثابت ثم فردي/زوجي)
    // بدل تعطيل المجموعة كلها أسبوعاً كاملاً، حتى يفضل كل يوم فيه نشاط كل أسبوع.
    const biweeklyTrackMap = useMemo(() => {
        const map = new Map<string, number>();
        const byWeekday: string[][] = [[], [], [], [], []];
        groupStudents.forEach((s) => {
            if (!s.groupId || !isBiweeklyGroup(groupNameMap.get(s.groupId) || '')) return;
            const day = assignmentMap.get(s.id);
            if (day === undefined) return;
            byWeekday[day].push(s.id);
        });
        byWeekday.forEach((ids) => {
            [...ids].sort().forEach((id, index) => map.set(id, index % 2));
        });
        return map;
    }, [groupStudents, assignmentMap, groupNameMap]);

    const currentWeekParity = getCurrentWeekParity();

    // نحسب العدّادات مستبعدين طلاب الدورة كل 15 يوم اللي مش دورهم هذا الأسبوع
    const dayCounts = useMemo(() => {
        const counts = [0, 0, 0, 0, 0];
        groupStudents.forEach((s) => {
            const track = biweeklyTrackMap.get(s.id);
            if (track !== undefined && track !== currentWeekParity) return;
            const day = assignmentMap.get(s.id);
            if (day !== undefined) counts[day] += 1;
        });
        return counts;
    }, [groupStudents, assignmentMap, biweeklyTrackMap, currentWeekParity]);

    const studentsForSelectedDay = useMemo(() => {
        return groupStudents.filter((s) => {
            const track = biweeklyTrackMap.get(s.id);
            if (track !== undefined && track !== currentWeekParity) return false;
            return assignmentMap.get(s.id) === selectedDay;
        });
    }, [groupStudents, assignmentMap, selectedDay, biweeklyTrackMap, currentWeekParity]);

    // تفصيل "كل المجموعات" حسب كل مجموعة على حدة لليوم المختار
    const perGroupCountsForSelectedDay = useMemo(() => {
        if (!isAllGroups) return [];
        const counts = new Map<string, number>();
        studentsForSelectedDay.forEach((s) => {
            if (!s.groupId) return;
            counts.set(s.groupId, (counts.get(s.groupId) || 0) + 1);
        });
        return filteredGroupsList
            .map((g) => ({
                id: g.id,
                name: g.name,
                count: counts.get(g.id) || 0,
                isBiweekly: isBiweeklyGroup(g.name),
            }))
            .sort((a, b) => b.count - a.count);
    }, [isAllGroups, studentsForSelectedDay, filteredGroupsList]);

    const todayIndex = getTodayWorkdayIndex();
    const selectedGroupIsBiweekly = !isAllGroups && isBiweeklyGroup(groupNameMap.get(selectedGroupId) || '');

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24 text-right font-sans overflow-x-hidden" dir="rtl">
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-3 md:px-6 py-3">
                <div className="max-w-3xl mx-auto space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h1 className="text-sm md:text-lg font-black text-gray-800">دورة الاختبارات</h1>
                        <span className={cn(
                            "text-[10px] md:text-xs font-black px-3 py-1 rounded-full",
                            weekCycleLabel === 'الجديد' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        )}>
                            الأسبوع: {weekCycleLabel}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                            <select
                                value={selectedGroupId}
                                onChange={(e) => { setSelectedGroupId(e.target.value); setSelectedDay(todayIndex === -1 ? 0 : todayIndex); }}
                                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-right"
                            >
                                <option value={ALL_GROUPS_VALUE}>كل المجموعات</option>
                                {filteredGroupsList.length === 0 && <option value="">لا توجد مجموعات</option>}
                                {filteredGroupsList.map((g) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <span className="shrink-0 bg-gray-100 text-gray-500 text-[11px] font-black px-3 py-2.5 rounded-xl font-sans">
                            {filteredGroupsList.length} مجموعة
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-3 md:px-6 py-4 space-y-4">
                {/* تبويبات الأيام: أعلى المحتوى مباشرة حتى يبقى اختيار اليوم أول حاجة تُرى */}
                <div className="grid grid-cols-5 gap-1.5 bg-gray-100 p-1.5 rounded-2xl">
                    {WORK_DAYS.map((day, index) => (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(index)}
                            className={cn(
                                "py-2.5 rounded-xl text-[11px] md:text-sm font-black transition-all flex flex-col items-center gap-1",
                                selectedDay === index ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:text-gray-700",
                                todayIndex === index && selectedDay !== index && "ring-2 ring-blue-300"
                            )}
                        >
                            <span>{day}</span>
                            <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                                selectedDay === index ? "bg-white/25 text-white" : "bg-gray-200 text-gray-400"
                            )}>
                                {dayCounts[index]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* تنبيه دورة كل 15 يوم لمجموعة مختارة بمفردها */}
                {selectedGroupIsBiweekly && (
                    <div className="flex items-center justify-between gap-2 rounded-2xl px-4 py-3 border bg-blue-50 border-blue-100 text-blue-700 text-xs font-bold">
                        <span>دورة اختبار كل طالب هنا كل 15 يوم تقريبًا</span>
                        <span className="font-black">نص الطلاب كل أسبوع بالتبادل</span>
                    </div>
                )}

                {/* إجمالي اختبارات النهاردة عند اختيار "كل المجموعات" */}
                {isAllGroups && (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                        <span className="text-xs font-bold text-blue-700">إجمالي اختبارات النهاردة (كل المجموعات)</span>
                        <span className="text-lg font-black text-blue-700 font-sans">{todayIndex === -1 ? 0 : dayCounts[todayIndex]}</span>
                    </div>
                )}

                {/* تفصيل كل مجموعة على حدة عند اختيار "كل المجموعات" */}
                {isAllGroups ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-gray-400">
                                توزيع يوم {WORK_DAYS[selectedDay]} على المجموعات
                                {todayIndex === selectedDay && <span className="text-blue-500"> (النهاردة)</span>}
                            </span>
                            <span className="bg-blue-100 text-blue-700 text-xs font-black px-3 py-1 rounded-full font-sans">
                                {studentsForSelectedDay.length} اختبار
                            </span>
                        </div>

                        {perGroupCountsForSelectedDay.length === 0 ? (
                            <div className="text-center py-16 bg-white/40 rounded-[28px] border-2 border-dashed border-gray-100">
                                <RefreshCw size={28} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm text-gray-400 font-bold">لا توجد مجموعات لعرضها</p>
                            </div>
                        ) : (
                            perGroupCountsForSelectedDay.map((row) => (
                                <div key={row.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{row.name}</p>
                                        {row.isBiweekly && (
                                            <p className="text-[10px] text-blue-500 font-bold mt-0.5">دورة كل 15 يوم (نص الطلاب هذا الأسبوع)</p>
                                        )}
                                    </div>
                                    <span className="shrink-0 bg-blue-50 text-blue-700 text-sm font-black px-3 py-1 rounded-full font-sans">
                                        {row.count}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    /* قائمة طلاب اليوم المختار لمجموعة واحدة */
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-gray-400">
                                طلاب يوم {WORK_DAYS[selectedDay]}
                                {todayIndex === selectedDay && <span className="text-blue-500"> (النهاردة)</span>}
                            </span>
                            <span className="bg-blue-100 text-blue-700 text-xs font-black px-3 py-1 rounded-full font-sans">
                                {studentsForSelectedDay.length} طالب
                            </span>
                        </div>

                        {studentsForSelectedDay.length === 0 ? (
                            <div className="text-center py-16 bg-white/40 rounded-[28px] border-2 border-dashed border-gray-100">
                                <RefreshCw size={28} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm text-gray-400 font-bold">لا يوجد طلاب في هذا اليوم بعد</p>
                            </div>
                        ) : (
                            studentsForSelectedDay.map((student) => (
                                <div key={student.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                                            <User size={15} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-800 truncate">{student.fullName}</span>
                                    </div>

                                    {canEdit && (
                                        <select
                                            value={selectedDay}
                                            onChange={(e) => handleMoveStudent(student.id, Number(e.target.value))}
                                            className="shrink-0 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-bold text-gray-600 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            {WORK_DAYS.map((day, index) => (
                                                <option key={day} value={index}>{day}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

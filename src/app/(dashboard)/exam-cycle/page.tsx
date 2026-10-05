"use client";

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import User from 'lucide-react/dist/esm/icons/user';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import ArrowLeftRight from 'lucide-react/dist/esm/icons/arrow-left-right';
import X from 'lucide-react/dist/esm/icons/x';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import { cn } from '@/lib/utils';
import { FadeIn, SlideIn } from '@/components/ui/transition';

import dynamic from 'next/dynamic';
import { useStudents } from '@/features/students/hooks/useStudents';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useAuthStore } from '@/store/useAuthStore';
import {
    getExamCycleAssignments,
    setExamCycleAssignment,
    setExamCycleAssignmentsBatch,
} from '@/features/groups/services/examCycleService';
import { getAllExams } from '@/features/students/services/recordsService';
import { Student } from '@/types';

const StudentDetailModal = dynamic(() => import('@/features/students/components/StudentDetailModal'), { ssr: false });

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

const ALL_GROUPS_VALUE = '__all__';

export default function ExamCyclePage() {
    const queryClient = useQueryClient();
    const { data: students } = useStudents();
    const { data: groups } = useGroups();
    const { user } = useAuthStore();

    const canEdit = user?.role === 'director' || user?.role === 'supervisor' || user?.role === 'teacher';

    // الضغط على اسم الطالب يفتح نافذة بياناته على تبويب الاختبارات مباشرة لتسجيل اختبار
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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
    const todayIndex = getTodayWorkdayIndex();
    const todayStr = new Date().toISOString().split('T')[0];

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

    // توزيع أيام كل مجموعة على حدة (بغض النظر عن كوننا في عرض "كل المجموعات")،
    // نستخدمه في التوزيع التلقائي للطلاب الجدد وفي حد أقصى النقل اليدوي بين الأيام.
    const dayCountsByGroup = useMemo(() => {
        const map = new Map<string, number[]>();
        groupStudents.forEach((s) => {
            if (!s.groupId) return;
            const day = assignmentMap.get(s.id);
            if (day === undefined) return;
            const counts = map.get(s.groupId) || [0, 0, 0, 0, 0];
            counts[day] += 1;
            map.set(s.groupId, counts);
        });
        return map;
    }, [groupStudents, assignmentMap]);

    // تعيين أولي تلقائي لأي طالب جديد لسه ملوش يوم محدد: يُضاف لأقل الأيام ازدحاماً
    // نوزّع كل مجموعة على حدة (حتى في عرض "كل المجموعات") حتى لا تختلط موازنة الأيام بين مجموعات مختلفة،
    // وحتى تُوزَّع مجموعات لم تُفتح صفحتها بمفردها من قبل (كانت تظل بلا توزيع في عرض "كل المجموعات").
    useEffect(() => {
        if (groupStudents.length === 0) return;
        const unassigned = groupStudents.filter((s) => !assignmentMap.has(s.id));
        if (unassigned.length === 0) return;

        const countsByGroup = new Map<string, number[]>();
        dayCountsByGroup.forEach((counts, groupId) => countsByGroup.set(groupId, [...counts]));

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

    // حد أقصى للنقل اليدوي: لا يمكن نقل طالب على يوم يخليه متقدم بأكتر من طالب واحد
    // عن أقل الأيام ازدحاماً في نفس مجموعته، حتى لا يتكدس يوم بينما باقي الأيام فاضية.
    const handleMoveStudent = async (studentId: string, newDay: number) => {
        const student = groupStudents.find((s) => s.id === studentId);
        const oldDay = assignmentMap.get(studentId);

        if (student?.groupId && oldDay !== undefined && oldDay !== newDay) {
            const counts = [...(dayCountsByGroup.get(student.groupId) || [0, 0, 0, 0, 0])];
            counts[oldDay] = Math.max(0, counts[oldDay] - 1);
            const countAfterMove = counts[newDay] + 1;
            const minOtherDays = Math.min(...counts.filter((_, day) => day !== newDay));

            if (countAfterMove - minOtherDays > 1) {
                alert(`لا يمكن نقل الطالب إلى يوم ${WORK_DAYS[newDay]} لأنه هيبقى مزدحم أكتر من باقي الأيام بأكتر من طالب. استخدم زر "تبديل" لتبديل مكانه مع طالب آخر في يوم ${WORK_DAYS[newDay]} بدلاً من ذلك.`);
                return;
            }
        }

        try {
            await setExamCycleAssignment(studentId, newDay);
            queryClient.invalidateQueries({ queryKey: ['exam-cycle', selectedGroupId, groupStudentIds] });
        } catch (err) {
            console.error('تعذر نقل الطالب:', err);
        }
    };

    // تبديل مكان طالبين: كل منهما يأخذ يوم الآخر، فلا يتأثر إجمالي عدد أي يوم
    // (بعكس النقل العادي، لا يوجد حد أقصى هنا لأن العدد الكلي لكل يوم يفضل ثابت)
    const [swapStudent, setSwapStudent] = useState<Student | null>(null);
    const [swapDay, setSwapDay] = useState<number | null>(null);

    const swapCandidates = useMemo(() => {
        if (!swapStudent || swapDay === null) return [];
        return groupStudents.filter((s) =>
            s.groupId === swapStudent.groupId && s.id !== swapStudent.id && assignmentMap.get(s.id) === swapDay
        );
    }, [groupStudents, swapStudent, swapDay, assignmentMap]);

    const closeSwapModal = () => {
        setSwapStudent(null);
        setSwapDay(null);
    };

    const handleSwapStudents = async (partnerId: string) => {
        if (!swapStudent || swapDay === null) return;
        const studentDay = assignmentMap.get(swapStudent.id);
        if (studentDay === undefined) return;

        try {
            await setExamCycleAssignmentsBatch([
                { studentId: swapStudent.id, weekday: swapDay },
                { studentId: partnerId, weekday: studentDay },
            ]);
            queryClient.invalidateQueries({ queryKey: ['exam-cycle', selectedGroupId, groupStudentIds] });
        } catch (err) {
            console.error('تعذر تبديل الطلاب:', err);
        } finally {
            closeSwapModal();
        }
    };

    const dayCounts = useMemo(() => {
        const counts = [0, 0, 0, 0, 0];
        groupStudents.forEach((s) => {
            const day = assignmentMap.get(s.id);
            if (day !== undefined) counts[day] += 1;
        });
        return counts;
    }, [groupStudents, assignmentMap]);

    const studentsForSelectedDay = useMemo(() => {
        return groupStudents.filter((s) => assignmentMap.get(s.id) === selectedDay);
    }, [groupStudents, assignmentMap, selectedDay]);

    // تواريخ أيام هذا الأسبوع الفعلية (السبت هو أول يوم عمل) لمعرفة هل عدّى يوم الطالب المحدد أم لا
    const weekDates = useMemo(() => {
        const now = new Date();
        const diffFromSaturday = (now.getDay() + 1) % 7;
        const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffFromSaturday);
        return WORK_DAYS.map((_, i) => {
            const d = new Date(saturday);
            d.setDate(saturday.getDate() + i);
            return d.toISOString().split('T')[0];
        });
    }, []);

    // اختبارات طلاب المجموعة المختارة، لمعرفة من أدى اختباره فعلاً هذا الأسبوع
    const { data: examsForGroup = [] } = useQuery({
        queryKey: ['exam-cycle-exams', groupStudentIds],
        queryFn: () => getAllExams(undefined, undefined, groupStudentIds),
        enabled: groupStudentIds.length > 0,
    });

    const examDatesByStudent = useMemo(() => {
        const map = new Map<string, Set<string>>();
        examsForGroup.forEach((exam) => {
            if (!exam.studentId || !exam.date) return;
            const set = map.get(exam.studentId) || new Set<string>();
            set.add(exam.date);
            map.set(exam.studentId, set);
        });
        return map;
    }, [examsForGroup]);

    const hasExamInRange = (studentId: string, fromDate: string, toDate: string) => {
        const dates = examDatesByStudent.get(studentId);
        if (!dates) return false;
        for (const d of dates) {
            if (d >= fromDate && d <= toDate) return true;
        }
        return false;
    };

    type DayStudentStatus = 'done' | 'missed' | 'pending';

    // قائمة طلاب اليوم المختار لعرض مجموعة واحدة: طلاب اليوم نفسه + من "ترحّل" إليه
    // لأنه فوّت اختباره في يوم سابق هذا الأسبوع ولسه ما سجلش
    const displayStudentsForDay = useMemo(() => {
        if (isAllGroups) return [] as { student: Student; status: DayStudentStatus; carriedFromDay?: number }[];
        const items: { student: Student; status: DayStudentStatus; carriedFromDay?: number }[] = [];

        groupStudents.forEach((s) => {
            const day = assignmentMap.get(s.id);
            if (day === undefined) return;

            if (day === selectedDay) {
                const dueDate = weekDates[selectedDay];
                let status: DayStudentStatus = 'pending';
                if (dueDate <= todayStr) {
                    status = hasExamInRange(s.id, dueDate, todayStr) ? 'done' : (dueDate < todayStr ? 'missed' : 'pending');
                }
                items.push({ student: s, status });
            } else if (day < selectedDay && selectedDay <= todayIndex) {
                const dueDate = weekDates[day];
                const stillMissing = !hasExamInRange(s.id, dueDate, weekDates[selectedDay]);
                if (stillMissing) {
                    items.push({ student: s, status: 'missed', carriedFromDay: day });
                }
            }
        });

        return items.sort((a, b) => a.student.fullName.localeCompare(b.student.fullName, 'ar'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupStudents, assignmentMap, selectedDay, isAllGroups, weekDates, todayStr, todayIndex, examDatesByStudent]);

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
            }))
            .sort((a, b) => b.count - a.count);
    }, [isAllGroups, studentsForSelectedDay, filteredGroupsList]);

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
                                {displayStudentsForDay.length} طالب
                            </span>
                        </div>

                        {displayStudentsForDay.length === 0 ? (
                            <div className="text-center py-16 bg-white/40 rounded-[28px] border-2 border-dashed border-gray-100">
                                <RefreshCw size={28} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm text-gray-400 font-bold">لا يوجد طلاب في هذا اليوم بعد</p>
                            </div>
                        ) : (
                            displayStudentsForDay.map(({ student, status, carriedFromDay }) => (
                                <div key={student.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => setSelectedStudent(student)}
                                        className="flex items-center gap-2 min-w-0 text-right hover:opacity-70 transition-opacity"
                                        title="فتح تبويب الاختبارات لتسجيل اختبار"
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                            status === 'done' ? "bg-green-50 text-green-600" : status === 'missed' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                                        )}>
                                            {status === 'done' ? <CheckCircle2 size={15} /> : status === 'missed' ? <AlertCircle size={15} /> : <User size={15} />}
                                        </div>
                                        <div className="min-w-0 flex flex-col">
                                            <span className={cn(
                                                "text-sm font-bold truncate",
                                                status === 'done' ? "text-green-600" : status === 'missed' ? "text-red-600" : "text-gray-800"
                                            )}>
                                                {student.fullName}
                                            </span>
                                            {carriedFromDay !== undefined && (
                                                <span className="text-[9px] font-bold text-red-400">مؤجل من يوم {WORK_DAYS[carriedFromDay]}</span>
                                            )}
                                        </div>
                                    </button>

                                    {canEdit && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <select
                                                value={selectedDay}
                                                onChange={(e) => handleMoveStudent(student.id, Number(e.target.value))}
                                                className="bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-bold text-gray-600 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                {WORK_DAYS.map((day, index) => (
                                                    <option key={day} value={index}>{day}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => { setSwapStudent(student); setSwapDay(null); }}
                                                className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                                                title="تبديل مكانه مع طالب آخر"
                                            >
                                                <ArrowLeftRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            <StudentDetailModal
                student={selectedStudent}
                isOpen={!!selectedStudent}
                onClose={() => setSelectedStudent(null)}
                initialTab="exams"
            />

            {/* مودال تبديل مكان طالبين */}
            <FadeIn show={!!swapStudent} className="fixed inset-0 z-[300]">
                <div onClick={closeSwapModal} className="absolute inset-0 bg-black/40" />
            </FadeIn>
            <SlideIn show={!!swapStudent} className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                <div className="relative bg-white p-5 rounded-[28px] w-full max-w-sm max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-black text-sm text-gray-800">تبديل مكان: {swapStudent?.fullName}</h3>
                        <button onClick={closeSwapModal} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg">
                            <X size={16} />
                        </button>
                    </div>

                    <p className="text-[11px] text-gray-400 font-bold mb-3">اختر اليوم اللي عايز تبدل معاه، هيظهر لك طلابه وتختار منهم</p>

                    <div className="grid grid-cols-5 gap-1 mb-4">
                        {WORK_DAYS.map((day, index) => {
                            const studentCurrentDay = swapStudent ? assignmentMap.get(swapStudent.id) : undefined;
                            if (index === studentCurrentDay) return null;
                            return (
                                <button
                                    key={day}
                                    onClick={() => setSwapDay(index)}
                                    className={cn(
                                        "py-2 rounded-xl text-[10px] font-black transition-all",
                                        swapDay === index ? "bg-amber-500 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                    )}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    {swapDay !== null && (
                        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
                            {swapCandidates.length === 0 ? (
                                <p className="text-center text-xs text-gray-400 font-bold py-6">لا يوجد طلاب في يوم {WORK_DAYS[swapDay]} لنفس المجموعة</p>
                            ) : (
                                swapCandidates.map((candidate) => (
                                    <button
                                        key={candidate.id}
                                        onClick={() => handleSwapStudents(candidate.id)}
                                        className="w-full flex items-center gap-2 bg-gray-50 hover:bg-amber-50 rounded-xl p-3 text-right transition-colors"
                                    >
                                        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                                            <User size={13} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 truncate">{candidate.fullName}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </SlideIn>
        </div>
    );
}

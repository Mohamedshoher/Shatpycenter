import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getStudentAttendance,
    getStudentExams,
    getStudentFees,
    addAttendanceRecord,
    addExamRecord,
    updateExamRecord,
    addFeeRecord,
    addPlanRecord,
    deleteExamRecord,
    deleteFeeRecord,
    addLeaveRequest,
    getStudentExemptions,
    addExemptionRecord,
    deleteExemptionRecord,
    getStudentExamGoals,
    addExamGoal,
    updateExamGoal,
    deleteExamGoal,
} from "../services/recordsService";
import type { AttendanceRecord, ExamRecord, FeeRecord, PlanRecord, ExamGoal } from "../services/recordsService";

export const useStudentRecords = (studentId: string) => {
    const queryClient = useQueryClient();

    const attendanceQuery = useQuery({
        queryKey: ['attendance', studentId],
        queryFn: () => getStudentAttendance(studentId),
        enabled: !!studentId
    });

    const examsQuery = useQuery({
        queryKey: ['exams', studentId],
        queryFn: () => getStudentExams(studentId),
        enabled: !!studentId
    });

    const feesQuery = useQuery({
        queryKey: ['fees', studentId],
        queryFn: () => getStudentFees(studentId),
        enabled: !!studentId
    });

    const exemptionsQuery = useQuery({
        queryKey: ['exemptions', studentId],
        queryFn: () => getStudentExemptions(studentId),
        enabled: !!studentId
    });

    const goalsQuery = useQuery({
        queryKey: ['exam_goals', studentId],
        queryFn: () => getStudentExamGoals(studentId),
        enabled: !!studentId
    });

    const addAttendance = useMutation({
        mutationFn: addAttendanceRecord,
        onMutate: async (newRecord) => {
            await queryClient.cancelQueries({ queryKey: ['attendance', studentId] });
            const previousAttendance = queryClient.getQueryData(['attendance', studentId]);

            queryClient.setQueryData(['attendance', studentId], (old: AttendanceRecord[] | undefined) => {
                const records = Array.isArray(old) ? old : [];
                const filtered = records.filter((r) => !(r.day === newRecord.day && r.month === newRecord.month));
                return [...filtered, { ...newRecord, id: 'temp-' + Date.now() }];
            });

            return { previousAttendance };
        },
        onError: (err) => {
            console.error('Attendance mutation error:', err);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance', studentId] });
            queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
            queryClient.invalidateQueries({ queryKey: ['report-data'] });
        }
    });

    const addExam = useMutation({
        mutationFn: addExamRecord,
        onMutate: async (newRecord) => {
            await queryClient.cancelQueries({ queryKey: ['exams', studentId] });
            const previousExams = queryClient.getQueryData(['exams', studentId]);
            queryClient.setQueryData(['exams', studentId], (old: ExamRecord[] | undefined) => [...(old || []), { ...newRecord, id: 'temp-' + Date.now() }]);
            return { previousExams };
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['exams', studentId] });
            // دورة الاختبارات وصفحات التحليلات عندها نسخة منفصلة من بيانات الاختبارات
            // (exam-cycle-exams, all-exams)، لازم تتحدّث برضو وإلا تفضل تعتبر الطالب لسه ما اختبرش
            queryClient.invalidateQueries({ queryKey: ['exam-cycle-exams'] });
            queryClient.invalidateQueries({ queryKey: ['all-exams'] });
        }
    });

    const addFee = useMutation({
        mutationFn: addFeeRecord,
        onMutate: async (newRecord) => {
            await queryClient.cancelQueries({ queryKey: ['fees', studentId] });
            const previousFees = queryClient.getQueryData(['fees', studentId]);
            queryClient.setQueryData(['fees', studentId], (old: FeeRecord[] | undefined) => [...(old || []), { ...newRecord, id: 'temp-' + Date.now() }]);
            return { previousFees };
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['fees'] });
        }
    });

    const deleteExam = useMutation({
        mutationFn: deleteExamRecord,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exams', studentId] });
            queryClient.invalidateQueries({ queryKey: ['exam-cycle-exams'] });
            queryClient.invalidateQueries({ queryKey: ['all-exams'] });
        }
    });

    const updateExam = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ExamRecord> }) => updateExamRecord(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exams', studentId] });
            queryClient.invalidateQueries({ queryKey: ['exam-cycle-exams'] });
            queryClient.invalidateQueries({ queryKey: ['all-exams'] });
        }
    });

    const deleteFee = useMutation({
        mutationFn: deleteFeeRecord,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fees'] });
            queryClient.invalidateQueries({ queryKey: ['exemptions', studentId] });
        }
    });

    const addExemption = useMutation({
        mutationFn: addExemptionRecord,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exemptions', studentId] });
            queryClient.invalidateQueries({ queryKey: ['fees', studentId] });
        }
    });

    const deleteExemption = useMutation({
        mutationFn: deleteExemptionRecord,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exemptions', studentId] });
        }
    });

    const addLeave = useMutation({
        mutationFn: addLeaveRequest,
        onSuccess: () => {
            alert('تم إرسال طلب الإجازة بنجاح');
        }
    });

    const notesQuery = useQuery({
        queryKey: ['notes', studentId],
        queryFn: () => import("../services/recordsService").then(m => m.getStudentNotes(studentId)),
        enabled: !!studentId
    });

    const addNote = useMutation({
        mutationFn: (note: { content: string, type: string, createdBy: string }) =>
            import("../services/recordsService").then(m => m.addStudentNote({ studentId, ...note })),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes', studentId] });
            queryClient.invalidateQueries({ queryKey: ['student-notes-details'] });
        }
    });

    const deleteNote = useMutation({
        mutationFn: (id: string) => import("../services/recordsService").then(m => m.deleteStudentNote(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes', studentId] });
            queryClient.invalidateQueries({ queryKey: ['student-notes-details'] });
        }
    });

    const replyNote = useMutation({
        mutationFn: ({ id, reply, repliedBy }: { id: string, reply: string, repliedBy: string }) =>
            import("../services/recordsService").then(m => m.replyToNote(id, reply, repliedBy)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes', studentId] });
            queryClient.invalidateQueries({ queryKey: ['student-notes-details'] });
        }
    });

    const plansQuery = useQuery({
        queryKey: ['plans', studentId],
        queryFn: () => import("../services/recordsService").then(m => m.getStudentPlans(studentId)),
        enabled: !!studentId
    });

    const addPlan = useMutation({
        mutationFn: addPlanRecord,
        onMutate: async (newRecord) => {
            await queryClient.cancelQueries({ queryKey: ['plans', studentId] });
            const previousPlans = queryClient.getQueryData(['plans', studentId]);
            queryClient.setQueryData(['plans', studentId], (old: PlanRecord[] | undefined) => [...(old || []), { ...newRecord, id: 'temp-' + Date.now() }]);
            return { previousPlans };
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['plans', studentId] });
        }
    });

    const addGoal = useMutation({
        mutationFn: addExamGoal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exam_goals', studentId] });
        }
    });

    const updateGoal = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Omit<ExamGoal, 'id' | 'studentId'>> }) => updateExamGoal(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exam_goals', studentId] });
        }
    });

    const deleteGoal = useMutation({
        mutationFn: deleteExamGoal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exam_goals', studentId] });
        }
    });

    // نثبّت مراجع المصفوفات الافتراضية [] حتى لا تتغيّر مع كل render
    // (تكسر أي useMemo/useCallback لدى المستهلك يعتمد عليها كتبعية)
    const attendance = useMemo(() => attendanceQuery.data || [], [attendanceQuery.data]);
    const exams = useMemo(() => examsQuery.data || [], [examsQuery.data]);
    const fees = useMemo(() => feesQuery.data || [], [feesQuery.data]);
    const exemptions = useMemo(() => exemptionsQuery.data || [], [exemptionsQuery.data]);
    const plans = useMemo(() => plansQuery.data || [], [plansQuery.data]);
    const notes = useMemo(() => notesQuery.data || [], [notesQuery.data]);
    const goals = useMemo(() => goalsQuery.data || [], [goalsQuery.data]);

    return {
        attendance,
        isLoadingAttendance: attendanceQuery.isLoading,
        exams,
        isLoadingExams: examsQuery.isLoading,
        fees,
        isLoadingFees: feesQuery.isLoading,
        exemptions,
        isLoadingExemptions: exemptionsQuery.isLoading,
        plans,
        isLoadingPlans: plansQuery.isLoading,
        notes,
        isLoadingNotes: notesQuery.isLoading,
        goals,
        isLoadingGoals: goalsQuery.isLoading,

        addAttendance,
        addExam,
        addFee,
        addPlan,
        addLeave,
        addNote,
        replyNote,
        updateExam,
        deleteExam,
        deleteFee,
        addExemption,
        deleteExemption,
        deleteNote,
        addGoal,
        updateGoal,
        deleteGoal,
    };
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getStudentAttendance,
    getStudentExams,
    getStudentFees,
    addAttendanceRecord,
    addExamRecord,
    addFeeRecord,
    addPlanRecord,
    deleteExamRecord,
    deleteFeeRecord,
    addLeaveRequest,
    getStudentExemptions,
    deleteExemptionRecord
} from "../services/recordsService";
import { addToOfflineQueue } from "@/lib/offline-queue";

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

    const addAttendance = useMutation({
        mutationFn: addAttendanceRecord,
        onMutate: async (newRecord) => {
            await queryClient.cancelQueries({ queryKey: ['attendance', studentId] });
            const previousAttendance = queryClient.getQueryData(['attendance', studentId]);

            queryClient.setQueryData(['attendance', studentId], (old: any) => {
                const records = Array.isArray(old) ? old : [];
                const filtered = records.filter((r: any) => !(r.day === newRecord.day && r.month === newRecord.month));
                return [...filtered, { ...newRecord, id: 'temp-' + Date.now() }];
            });

            return { previousAttendance };
        },
        onError: (err, newRecord, context) => {
            console.error('Attendance mutation error, saving to offline queue:', err);
            addToOfflineQueue('attendance', newRecord);
            // We don't rollback the cache here because we want it to stay "saved" in UI
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
            queryClient.setQueryData(['exams', studentId], (old: any) => [...(old || []), { ...newRecord, id: 'temp-' + Date.now() }]);
            return { previousExams };
        },
        onError: (err, newRecord) => {
            addToOfflineQueue('exam', newRecord);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['exams', studentId] });
        }
    });

    const addFee = useMutation({
        mutationFn: addFeeRecord,
        onMutate: async (newRecord) => {
            await queryClient.cancelQueries({ queryKey: ['fees', studentId] });
            const previousFees = queryClient.getQueryData(['fees', studentId]);
            queryClient.setQueryData(['fees', studentId], (old: any) => [...(old || []), { ...newRecord, id: 'temp-' + Date.now() }]);
            return { previousFees };
        },
        onError: (err, newRecord) => {
            addToOfflineQueue('fee', newRecord);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['fees'] });
        }
    });

    const deleteExam = useMutation({
        mutationFn: deleteExamRecord,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exams', studentId] });
        }
    });

    const deleteFee = useMutation({
        mutationFn: deleteFeeRecord,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fees'] });
            queryClient.invalidateQueries({ queryKey: ['exemptions', studentId] });
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
            // No specific query to invalidate yet as we don't list leaves in parent UI yet
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
            queryClient.setQueryData(['plans', studentId], (old: any) => [...(old || []), { ...newRecord, id: 'temp-' + Date.now() }]);
            return { previousPlans };
        },
        onError: (err, newRecord) => {
            addToOfflineQueue('plan', newRecord);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['plans', studentId] });
        }
    });

    return {
        attendance: attendanceQuery.data || [],
        isLoadingAttendance: attendanceQuery.isLoading,
        exams: examsQuery.data || [],
        isLoadingExams: examsQuery.isLoading,
        fees: feesQuery.data || [],
        isLoadingFees: feesQuery.isLoading,
        exemptions: exemptionsQuery.data || [],
        isLoadingExemptions: exemptionsQuery.isLoading,
        plans: plansQuery.data || [],
        isLoadingPlans: plansQuery.isLoading,
        notes: notesQuery.data || [],
        isLoadingNotes: notesQuery.isLoading,
        addAttendance,
        addExam,
        addFee,
        addPlan,
        addLeave,
        addNote,
        deleteExam,
        deleteFee,
        deleteExemption,
        deleteNote
    };
};


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
    addLeaveRequest
} from "../services/recordsService";

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

    const addAttendance = useMutation({
        mutationFn: addAttendanceRecord,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance', studentId] });
        }
    });

    const addExam = useMutation({
        mutationFn: addExamRecord,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exams', studentId] });
        }
    });

    const addFee = useMutation({
        mutationFn: addFeeRecord,
        onSuccess: () => {
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
        }
    });

    const deleteNote = useMutation({
        mutationFn: (id: string) => import("../services/recordsService").then(m => m.deleteStudentNote(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes', studentId] });
        }
    });

    return {
        attendance: attendanceQuery.data || [],
        isLoadingAttendance: attendanceQuery.isLoading,
        exams: examsQuery.data || [],
        isLoadingExams: examsQuery.isLoading,
        fees: feesQuery.data || [],
        isLoadingFees: feesQuery.isLoading,
        notes: notesQuery.data || [],
        isLoadingNotes: notesQuery.isLoading,
        addAttendance,
        addExam,
        addFee,
        addLeave,
        addNote,
        deleteExam,
        deleteFee,
        deleteNote
    };
};


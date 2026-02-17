import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeacherAttendance, getAllTeachersAttendance, updateTeacherAttendance, TeacherAttendanceStatus } from "../services/attendanceService";
import { addToOfflineQueue } from "@/lib/offline-queue";

export const useTeacherAttendance = (teacherId?: string, monthKey?: string) => {
    const queryClient = useQueryClient();

    const attendanceQuery = useQuery({
        queryKey: ['teacher-attendance', teacherId, monthKey],
        queryFn: () => teacherId && monthKey ? getTeacherAttendance(teacherId, monthKey) : Promise.resolve({}),
        enabled: !!teacherId && !!monthKey,
    });

    const updateAttendanceMutation = useMutation({
        mutationFn: ({ date, status, notes }: { date: string, status: TeacherAttendanceStatus, notes?: string }) =>
            teacherId ? updateTeacherAttendance(teacherId, date, status, notes) : Promise.reject("No teacher selected"),
        onMutate: async ({ date, status }) => {
            if (!teacherId) return;

            // Invalidate/Update queries optimistically
            const day = parseInt(date.split('-')[2]);

            // Update single teacher query
            await queryClient.cancelQueries({ queryKey: ['teacher-attendance', teacherId, monthKey] });
            queryClient.setQueryData(['teacher-attendance', teacherId, monthKey], (old: any) => ({
                ...(old || {}),
                [day]: status
            }));

            // Update all teachers map query
            await queryClient.cancelQueries({ queryKey: ['all-teachers-attendance', monthKey] });
            queryClient.setQueryData(['all-teachers-attendance', monthKey], (old: any) => ({
                ...(old || {}),
                [teacherId]: {
                    ...(old?.[teacherId] || {}),
                    [day]: status
                }
            }));
        },
        onError: (err, variables) => {
            if (teacherId) {
                addToOfflineQueue('teacher_attendance', {
                    teacherId,
                    date: variables.date,
                    status: variables.status,
                    notes: variables.notes
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-attendance', teacherId, monthKey] });
            queryClient.invalidateQueries({ queryKey: ['all-teachers-attendance', monthKey] });
        }
    });

    return {
        attendance: attendanceQuery.data || {},
        loading: attendanceQuery.isLoading,
        updateAttendance: updateAttendanceMutation.mutate,
        updateAttendanceAsync: updateAttendanceMutation.mutateAsync,
    };
};

export const useAllTeachersAttendance = (monthKey: string) => {
    return useQuery({
        queryKey: ['all-teachers-attendance', monthKey],
        queryFn: () => getAllTeachersAttendance(monthKey),
    });
};

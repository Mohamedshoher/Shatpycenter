import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeacherAttendance, getAllTeachersAttendance, updateTeacherAttendance, TeacherAttendanceStatus } from "../services/attendanceService";

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-attendance', teacherId, monthKey] });
            queryClient.invalidateQueries({ queryKey: ['all-teachers-attendance', monthKey] });
        }
    });

    return {
        attendance: attendanceQuery.data || {},
        loading: attendanceQuery.isLoading,
        updateAttendance: updateAttendanceMutation.mutate,
    };
};

export const useAllTeachersAttendance = (monthKey: string) => {
    return useQuery({
        queryKey: ['all-teachers-attendance', monthKey],
        queryFn: () => getAllTeachersAttendance(monthKey),
    });
};

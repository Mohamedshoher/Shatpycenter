import { useQuery } from "@tanstack/react-query";

export interface TeacherDirectoryEntry {
    id: string;
    fullName: string;
    role: string;
    status: string;
}

/**
 * قائمة مختصرة وعامة (بدون تسجيل دخول) بأسماء المعلمين/المشرفين النشطين.
 * تُستخدم فقط في شاشة الدخول لاختيار الحساب، ولا تحتوي بيانات حساسة.
 */
export const useTeacherDirectory = () => {
    return useQuery<TeacherDirectoryEntry[]>({
        queryKey: ['teachers-directory'],
        queryFn: async () => {
            const res = await fetch('/api/teachers/directory');
            if (!res.ok) return [];
            return res.json();
        },
    });
};

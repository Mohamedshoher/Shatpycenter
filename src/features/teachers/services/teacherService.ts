import { Teacher } from "@/types";

// ==========================================================
// خدمة إدارة بيانات الموظفين (Teacher Service)
// كل العمليات تمر عبر /api/teachers على الخادم (وليس Supabase مباشرة
// من المتصفح)، حتى تُطبَّق حراسة الجلسة وصلاحيات المدير على كل كتابة.
// ==========================================================

/**
 * جلب جميع الموظفين من قاعدة البيانات
 */
export const getTeachers = async (): Promise<Teacher[]> => {
    try {
        const res = await fetch('/api/teachers');
        if (!res.ok) {
            const errorText = await res.text();
            console.error("API error fetching teachers:", errorText);
            return [];
        }
        return await res.json();
    } catch (error) {
        console.error("Unexpected error fetching teachers:", error);
        return [];
    }
};

/**
 * إضافة موظف جديد إلى قاعدة البيانات
 */
export const addTeacher = async (teacher: Omit<Teacher, 'id'>): Promise<string> => {
    const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacher),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'تعذر إضافة الموظف');
    return body.id;
};

/**
 * تحديث بيانات موظف حالي بناءً على معرفه (ID)
 */
export const updateTeacher = async (id: string, data: Partial<Teacher>): Promise<void> => {
    const res = await fetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'تعذر تحديث بيانات الموظف');
};

/**
 * حذف موظف من قاعدة البيانات
 */
export const deleteTeacher = async (id: string): Promise<void> => {
    const res = await fetch(`/api/teachers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'تعذر حذف الموظف');
};

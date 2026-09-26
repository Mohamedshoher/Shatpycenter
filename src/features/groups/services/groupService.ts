import { Group } from "@/types";

// ==========================================================
// خدمة إدارة المجموعات — كل العمليات عبر /api/groups على الخادم
// ==========================================================

// الحصول على جميع المجموعات
export const getGroups = async (): Promise<Group[]> => {
    try {
        const res = await fetch('/api/groups');
        if (!res.ok) {
            const errorText = await res.text();
            console.error("API error fetching groups:", errorText);
            return [];
        }
        return await res.json();
    } catch (error) {
        console.error("Unexpected error fetching groups:", error);
        return [];
    }
};

// الحصول على مجموعة بواسطة المعرف
export const getGroupById = async (groupId: string): Promise<Group | null> => {
    try {
        const res = await fetch(`/api/groups?id=${encodeURIComponent(groupId)}`);
        if (!res.ok) return null;
        const groups: Group[] = await res.json();
        return groups[0] || null;
    } catch (error) {
        console.error("Error fetching group by ID: ", error);
        return null;
    }
};

// إضافة مجموعة جديدة
export const addGroup = async (group: Omit<Group, 'id'>): Promise<string> => {
    const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'تعذر إضافة المجموعة');
    return body.id;
};

// تحديث بيانات مجموعة
export const updateGroup = async (id: string, data: Partial<Group>): Promise<void> => {
    const res = await fetch('/api/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'تعذر تحديث المجموعة');
};

// حذف مجموعة
export const deleteGroup = async (id: string): Promise<void> => {
    const res = await fetch(`/api/groups?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'تعذر حذف المجموعة');
};

// الحصول على المجموعات الخاصة بمعلم معين
export const getGroupsByTeacherId = async (teacherId: string): Promise<Group[]> => {
    try {
        const res = await fetch(`/api/groups?teacherId=${encodeURIComponent(teacherId)}`);
        if (!res.ok) {
            const errorText = await res.text();
            console.error("API error fetching teacher groups:", errorText);
            return [];
        }
        return await res.json();
    } catch (error) {
        console.error("Error fetching groups by teacher ID: ", error);
        return [];
    }
};

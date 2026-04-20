import { Group } from "@/types";
import { supabase } from "@/lib/supabase";

// الحصول على جميع المجموعات
export const getGroups = async (): Promise<Group[]> => {
    try {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error("Supabase error fetching groups:", error);
            return [];
        }

        return (data || []).map(row => ({
            id: row.id,
            name: row.name,
            teacherId: row.teacher_id,
            schedule: row.schedule || '',
            maxStudentsPerHour: row.max_students_per_hour || 5, // افتراضي 5 لو مفيش
            // Add defaults for UI-only fields if they exist in type but not DB
            students: [],
        } as unknown as Group));
    } catch (error) {
        console.error("Unexpected error fetching groups:", error);
        return [];
    }
};

// الحصول على مجموعة بواسطة المعرف
export const getGroupById = async (groupId: string): Promise<Group | null> => {
    try {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('id', groupId)
            .single();

        if (error || !data) {
            return null;
        }

        return {
            id: data.id,
            name: data.name,
            teacherId: data.teacher_id,
            schedule: data.schedule || '',
            maxStudentsPerHour: data.max_students_per_hour || 5,
            students: [],
        } as unknown as Group;
    } catch (error) {
        console.error("Error fetching group by ID: ", error);
        return null;
    }
};

// إضافة مجموعة جديدة
export const addGroup = async (group: Omit<Group, 'id'>): Promise<string> => {
    try {
        const { data, error } = await supabase
            .from('groups')
            .insert([{
                name: group.name,
                teacher_id: group.teacherId, // Map to snake_case
                schedule: group.schedule,
                max_students_per_hour: group.maxStudentsPerHour || 5,
            }])
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error("Error adding group:", error);
        throw error;
    }
};

// تحديث بيانات مجموعة
export const updateGroup = async (id: string, data: Partial<Group>): Promise<void> => {
    try {
        const updates: any = {};
        if (data.name) updates.name = data.name;
        if (data.teacherId !== undefined) updates.teacher_id = data.teacherId;
        if (data.schedule) updates.schedule = data.schedule;
        if (data.maxStudentsPerHour !== undefined) updates.max_students_per_hour = data.maxStudentsPerHour;

        const { error } = await supabase
            .from('groups')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Error updating group:", error);
        throw error;
    }
};

// حذف مجموعة
export const deleteGroup = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('groups')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Error deleting group:", error);
        throw error;
    }
};

// الحصول على المجموعات الخاصة بمعلم معين
export const getGroupsByTeacherId = async (teacherId: string): Promise<Group[]> => {
    try {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('teacher_id', teacherId)
            .order('name', { ascending: true });

        if (error) {
            console.error("Supabase error fetching teacher groups:", error);
            return [];
        }

        return (data || []).map(row => ({
            id: row.id,
            name: row.name,
            teacherId: row.teacher_id,
            schedule: row.schedule || '',
            maxStudentsPerHour: row.max_students_per_hour || 5,
            students: [],
        } as unknown as Group));
    } catch (error) {
        console.error("Error fetching groups by teacher ID: ", error);
        return [];
    }
};


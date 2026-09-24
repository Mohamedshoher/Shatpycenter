import { Teacher } from "@/types";
import { supabase } from "@/lib/supabase";

// ==========================================================
// خدمة إدارة بيانات الموظفين (Teacher Service)
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
    try {
        const { data, error } = await supabase
            .from('teachers')
            .insert([{
                full_name: teacher.fullName,
                phone: teacher.phone,
                role: teacher.role || 'teacher',
                accounting_type: teacher.accountingType || 'fixed',
                salary: teacher.salary || 0,
                partnership_percentage: teacher.partnershipPercentage || 0,
                daily_hours: teacher.dailyHours || 4,
                weekly_working_days: teacher.weeklyWorkingDays || 5,
                password: teacher.password,
                responsible_sections: teacher.responsibleSections || [],
                status: teacher.status || 'active'
            }])
            .select('id')
            .single();

        // إذا كانت أعمدة ساعات العمل غير موجودة بعد في قاعدة البيانات، نعيد الإضافة بدونها
        if (error) {
            const { data: retryData, error: retryError } = await supabase
                .from('teachers')
                .insert([{
                    full_name: teacher.fullName,
                    phone: teacher.phone,
                    role: teacher.role || 'teacher',
                    accounting_type: teacher.accountingType || 'fixed',
                    salary: teacher.salary || 0,
                    partnership_percentage: teacher.partnershipPercentage || 0,
                    password: teacher.password,
                    responsible_sections: teacher.responsibleSections || [],
                    status: teacher.status || 'active'
                }])
                .select('id')
                .single();

            if (retryError) throw retryError;
            return retryData.id;
        }

        return data.id;
    } catch (error) {
        console.error("Error adding teacher:", error);
        throw error;
    }
};

/**
 * تحديث بيانات موظف حالي بناءً على معرفه (ID)
 */
export const updateTeacher = async (id: string, data: Partial<Teacher>): Promise<void> => {
    try {
        // بناء كائن التحديثات بناءً على ما تم تغييره فقط
        const updates: any = {};
        if (data.fullName !== undefined) updates.full_name = data.fullName;
        if (data.phone !== undefined) updates.phone = data.phone;
        if (data.role !== undefined) updates.role = data.role;
        if (data.accountingType !== undefined) updates.accounting_type = data.accountingType;
        if (data.salary !== undefined) updates.salary = data.salary;
        if (data.partnershipPercentage !== undefined) updates.partnership_percentage = data.partnershipPercentage;
        if (data.dailyHours !== undefined) updates.daily_hours = data.dailyHours;
        if (data.weeklyWorkingDays !== undefined) updates.weekly_working_days = data.weeklyWorkingDays;
        if (data.password !== undefined) updates.password = data.password;
        if (data.responsibleSections !== undefined) updates.responsible_sections = data.responsibleSections;
        if (data.status !== undefined) updates.status = data.status;

        const { error } = await supabase
            .from('teachers')
            .update(updates)
            .eq('id', id);

        // إذا كانت أعمدة ساعات العمل غير موجودة بعد في قاعدة البيانات، نعيد التحديث بدونها
        if (error && (updates.daily_hours !== undefined || updates.weekly_working_days !== undefined)) {
            delete updates.daily_hours;
            delete updates.weekly_working_days;
            const { error: retryError } = await supabase
                .from('teachers')
                .update(updates)
                .eq('id', id);

            if (retryError) throw retryError;
        } else if (error) {
            throw error;
        }
    } catch (error) {
        console.error("Error updating teacher:", error);
        throw error;
    }
};

/**
 * حذف موظف من قاعدة البيانات
 */
export const deleteTeacher = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('teachers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Error deleting teacher:", error);
        throw error;
    }
};
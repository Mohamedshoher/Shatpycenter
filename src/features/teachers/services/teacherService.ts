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
        const { data, error } = await supabase
            .from('teachers')
            .select('*');

        if (error) {
            console.error("Supabase error fetching teachers:", error);
            return [];
        }

        // تحويل البيانات القادمة من Supabase إلى شكل الكائن (Object) المتوافق مع واجهة Teacher
        return (data || []).map(row => ({
            id: row.id,
            fullName: row.full_name,
            phone: row.phone,
            email: '', // غير موجود في المخطط ولكن النوع (Type) يتطلبه
            role: row.role || 'teacher',
            accountingType: row.accounting_type || 'fixed',
            salary: row.salary || 0,
            partnershipPercentage: row.partnership_percentage || 0,
            password: row.password || '',
            responsibleSections: row.responsible_sections || [],
            status: row.status,
            joinDate: row.created_at,
            assignedGroups: [] // عادة ما يتم جلب المجموعات في طلب منفصل
        } as Teacher));
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
                password: teacher.password,
                responsible_sections: teacher.responsibleSections || [],
                status: teacher.status || 'active'
            }])
            .select('id')
            .single();

        if (error) throw error;
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
        if (data.password !== undefined) updates.password = data.password;
        if (data.responsibleSections !== undefined) updates.responsible_sections = data.responsibleSections;
        if (data.status !== undefined) updates.status = data.status;

        const { error } = await supabase
            .from('teachers')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
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
import { Student } from "@/types";
import { supabase } from "@/lib/supabase";

export const getStudents = async (): Promise<Student[]> => {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*');

        if (error) {
            console.error("Supabase error fetching students:", error);
            return [];
        }

        return (data || []).map(row => ({
            id: row.id,
            fullName: row.full_name,
            groupId: row.group_id,
            parentPhone: row.parent_phone,
            status: row.status,
            isArchived: row.status === 'archived',
            monthlyAmount: Number(row.monthly_amount) || 0,
            birthDate: row.birth_date,
            address: row.address,
            appointment: row.appointment,
            notes: row.notes,
            // استخدام enrollment_date المخزن أو استخلاص التاريخ من created_at كخيار احتياطي
            enrollmentDate: row.enrollment_date || (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            archivedDate: row.archived_date,
            whatsapp: row.parent_phone,
            email: '',
            password: '',
            role: 'student',
            attendance: [],
            exams: []
        } as unknown as Student));
    } catch (error) {
        console.error("Unexpected error fetching students:", error);
        return [];
    }
};

export const addStudent = async (student: Omit<Student, 'id'>): Promise<string> => {
    try {
        const { data, error } = await supabase
            .from('students')
            .insert([{
                full_name: student.fullName,
                group_id: student.groupId,
                parent_phone: student.parentPhone,
                status: student.status || 'pending',
                monthly_amount: student.monthlyAmount,
                birth_date: student.birthDate,
                address: student.address,
                notes: student.notes,
                enrollment_date: student.enrollmentDate,
                appointment: student.appointment
            }])
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error("Error adding student:", error);
        throw error;
    }
};

export const updateStudent = async (id: string, data: Partial<Student>): Promise<void> => {
    try {
        const updates: any = {};
        if (data.fullName) updates.full_name = data.fullName;
        if (data.groupId !== undefined) updates.group_id = data.groupId;
        if (data.parentPhone) updates.parent_phone = data.parentPhone;
        if (data.status) updates.status = data.status;
        if (data.monthlyAmount !== undefined) updates.monthly_amount = data.monthlyAmount;
        if (data.birthDate) updates.birth_date = data.birthDate;
        if (data.address) updates.address = data.address;
        if (data.notes) updates.notes = data.notes;
        if (data.appointment !== undefined) updates.appointment = data.appointment;
        if (data.enrollmentDate) updates.enrollment_date = data.enrollmentDate;
        if (data.archivedDate) updates.archived_date = data.archivedDate;

        const { error } = await supabase
            .from('students')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error("Supabase detailed error:", error);
            throw error;
        }
    } catch (error: any) {
        console.error("Error updating student:", error);
        // إظهار الرسالة بوضوح في الكونسول للمستخدم
        const errorMsg = error.message || error.details || JSON.stringify(error);
        console.error("Technical Message:", errorMsg);
        throw new Error(errorMsg);
    }
};

export const deleteStudent = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Error deleting student:", error);
        throw error;
    }
};


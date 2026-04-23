import { supabase } from "@/lib/supabase";

export interface IqraProgress {
    id: string;
    student_id: string;
    book_name: string;
    received_from_sheikh: boolean;
    is_free: boolean;
    price: number;
    start_date: string;
    end_date?: string; // تاريخ الانتهاء
    total_lectures: number;
    full_exam_date: string;
    weekly_target?: number; // المقدر الأسبوعي
    final_grade?: string; // التقدير النهائي
    supervising_sheikh?: string; // إشراف الشيخ
    completed_courses: number;
    updated_at: string;
}

export interface IqraLog {
    id: string;
    student_id: string;
    course_id: string;
    lecture_number: number;
    general_follow_up_grade: string;
    sheikh_follow_up_day: string;
    sheikh_follow_up_time: string;
    sheikh_follow_up_grade: string;
    notes?: string; // خانة الملحوظات الجديدة
    created_at: string;
}

// جلب كافة الدورات المسجل فيها الطالب
export const getAllIqraProgress = async (studentId: string): Promise<IqraProgress[]> => {
    try {
        const { data, error } = await supabase
            .from('student_iqra_progress')
            .select('*')
            .eq('student_id', studentId)
            .order('start_date', { ascending: false });

        if (error) {
            console.error("Error fetching iqra progress:", error);
            if (error.code === '42P01') return [];
            throw error;
        }

        return data || [];
    } catch (error) {
        return [];
    }
};

// تحديث بيانات دورة موجودة
export const updateIqraProgress = async (id: string, data: Partial<IqraProgress>): Promise<IqraProgress> => {
    try {
        const { data: updated, error } = await supabase
            .from('student_iqra_progress')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return updated;
    } catch (error) {
        console.error("Error updating iqra progress:", error);
        throw error;
    }
};

// إنشاء دورة جديدة
export const createIqraProgress = async (studentId: string, data: Partial<IqraProgress>): Promise<IqraProgress> => {
    try {
        const { data: inserted, error } = await supabase
            .from('student_iqra_progress')
            .insert([{ ...data, student_id: studentId }])
            .select()
            .single();
        if (error) throw error;
        return inserted;
    } catch (error) {
        console.error("Error creating iqra progress:", error);
        throw error;
    }
};

// حذف دورة
export const deleteIqraProgress = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('student_iqra_progress')
            .delete()
            .eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error("Error deleting iqra progress:", error);
        throw error;
    }
};

// جلب سجل المتابعة التاريخي (اختيارياً لـ دورة محددة)
export const getIqraLogs = async (studentId: string, courseId?: string): Promise<IqraLog[]> => {
    try {
        let query = supabase
            .from('student_iqra_logs')
            .select('*')
            .eq('student_id', studentId);
        
        if (courseId) {
            query = query.eq('course_id', courseId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }

        return data || [];
    } catch (error) {
        return [];
    }
};

// إضافة سجل متابعة جديد
export const addIqraLog = async (studentId: string, log: Omit<IqraLog, 'id' | 'student_id' | 'created_at'>): Promise<IqraLog> => {
    try {
        const { data, error } = await supabase
            .from('student_iqra_logs')
            .insert([{ ...log, student_id: studentId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error adding iqra log:", error);
        throw error;
    }
};

// حذف سجل متابعة
export const deleteIqraLog = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('student_iqra_logs')
            .delete()
            .eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error("Error deleting iqra log:", error);
        throw error;
    }
};

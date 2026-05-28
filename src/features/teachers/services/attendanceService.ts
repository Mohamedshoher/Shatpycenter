import { supabase } from '@/lib/supabase';

// ==========================================================
// 1. التعريفات والأنواع (Types)
// ==========================================================
export type TeacherAttendanceStatus = 'present' | 'absent' | 'quarter' | 'half' | 'quarter_reward' | 'half_reward' | 'full_reward';

export interface TeacherAttendanceRecord {
    id: string;
    teacherId: string;
    date: string;
    status: TeacherAttendanceStatus;
    notes?: string;
}

// ==========================================================
// 2. دوال جلب البيانات (Fetch Functions)
// ==========================================================

/**
 * جلب سجل حضور معلم محدد خلال شهر معين
 */
export const getTeacherAttendance = async (teacherId: string, monthKey: string): Promise<Record<string, TeacherAttendanceStatus>> => {
    try {
        const res = await fetch(`/api/attendance/teacher?monthKey=${encodeURIComponent(monthKey)}&teacherId=${encodeURIComponent(teacherId)}`);
        if (!res.ok) return {};
        const data = await res.json();

        const attendanceMap: Record<string, TeacherAttendanceStatus> = {};
        (data || []).forEach((row: any) => {
            const dateParts = row.date.split('-');
            const day = parseInt(dateParts[2], 10);
            attendanceMap[day] = row.status as TeacherAttendanceStatus;
        });

        return attendanceMap;
    } catch (error) {
        console.error("Unexpected error fetching teacher attendance:", error);
        return {};
    }
};

/**
 * جلب سجل حضور جميع المعلمين خلال شهر معين
 */
export const getAllTeachersAttendance = async (monthKey: string): Promise<Record<string, Record<string, TeacherAttendanceStatus>>> => {
    try {
        if (!monthKey || !monthKey.includes('-')) return {};
        const res = await fetch(`/api/attendance/teacher?monthKey=${encodeURIComponent(monthKey)}`);
        if (!res.ok) return {};
        const data = await res.json();

        const fullMap: Record<string, Record<string, TeacherAttendanceStatus>> = {};
        (data || []).forEach((row: any) => {
            if (!fullMap[row.teacher_id]) fullMap[row.teacher_id] = {};
            const dateParts = row.date.split('-');
            const day = parseInt(dateParts[2], 10);
            fullMap[row.teacher_id][day] = row.status as TeacherAttendanceStatus;
        });

        return fullMap;
    } catch (error) {
        console.error("Error fetching all teachers attendance:", error);
        return {};
    }
}

// ==========================================================
// 3. دالة تعديل البيانات (Mutation Function)
// ==========================================================

/**
 * تحديث حالة حضور معلم ليوم معين (تتم عبر حذف السجل القديم ثم إدراج الجديد)
 */
export const updateTeacherAttendance = async (teacherId: string, date: string, status: TeacherAttendanceStatus, notes?: string): Promise<void> => {
    try {
        console.log(`Attempting to update attendance for teacher ${teacherId} on date ${date} with status ${status}`);

        // حذف السجل القديم أولاً لضمان عدم تكرار البيانات لنفس اليوم
        await supabase
            .from('teacher_attendance')
            .delete()
            .eq('teacher_id', teacherId)
            .eq('date', date);

        // إدراج السجل الجديد بالحالة المحدثة
        const { error } = await supabase
            .from('teacher_attendance')
            .insert({
                teacher_id: teacherId,
                date: date,
                status: status,
                notes: notes || null
            });

        if (error) {
            console.error("Supabase insert error details:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                data: { teacherId, date, status }
            });
            throw error;
        }
        console.log("Attendance updated successfully");
    } catch (error: any) {
        console.error("Error updating teacher attendance:", {
            message: error?.message,
            fullError: error
        });
        throw error;
    }
};
import { supabase } from '@/lib/supabase';

export type TeacherAttendanceStatus = 'present' | 'absent' | 'quarter' | 'half' | 'quarter_reward' | 'half_reward';

export interface TeacherAttendanceRecord {
    id: string;
    teacherId: string;
    date: string;
    status: TeacherAttendanceStatus;
    notes?: string;
}

export const getTeacherAttendance = async (teacherId: string, monthKey: string): Promise<Record<string, TeacherAttendanceStatus>> => {
    try {
        const [year, month] = monthKey.split('-');
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();

        const { data, error } = await supabase
            .from('teacher_attendance')
            .select('*')
            .eq('teacher_id', teacherId)
            .gte('date', `${monthKey}-01`)
            .lte('date', `${monthKey}-${lastDay}`);

        if (error) {
            console.error("Supabase error fetching teacher attendance:", error.message || error);
            return {};
        }

        const attendanceMap: Record<string, TeacherAttendanceStatus> = {};
        data?.forEach(row => {
            const day = new Date(row.date).getDate();
            attendanceMap[day] = row.status as TeacherAttendanceStatus;
        });

        return attendanceMap;
    } catch (error) {
        console.error("Unexpected error fetching teacher attendance:", error);
        return {};
    }
};

export const getAllTeachersAttendance = async (monthKey: string): Promise<Record<string, Record<string, TeacherAttendanceStatus>>> => {
    try {
        const [year, month] = monthKey.split('-');
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();

        const { data, error } = await supabase
            .from('teacher_attendance')
            .select('*')
            .gte('date', `${monthKey}-01`)
            .lte('date', `${monthKey}-${lastDay}`);

        if (error) {
            console.error("Supabase error fetching all teachers attendance:", error.message || error);
            return {};
        }

        const fullMap: Record<string, Record<string, TeacherAttendanceStatus>> = {};
        data?.forEach(row => {
            if (!fullMap[row.teacher_id]) fullMap[row.teacher_id] = {};
            const day = new Date(row.date).getDate();
            fullMap[row.teacher_id][day] = row.status as TeacherAttendanceStatus;
        });

        return fullMap;
    } catch (error) {
        console.error("Error fetching all teachers attendance:", error);
        return {};
    }
}

export const updateTeacherAttendance = async (teacherId: string, date: string, status: TeacherAttendanceStatus, notes?: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('teacher_attendance')
            .upsert({
                teacher_id: teacherId,
                date: date,
                status: status,
                notes: notes
            }, { onConflict: 'teacher_id,date' });

        if (error) throw error;
    } catch (error) {
        console.error("Error updating teacher attendance:", error);
        throw error;
    }
};

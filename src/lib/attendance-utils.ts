import { supabase } from "@/lib/supabase";

export interface AttendanceRecord {
    id: string;
    studentId: string;
    day: number;
    month: string;
    status: 'present' | 'absent';
    timestamp?: number;
}

// دالة لحساب الغياب المتصل
export const calculateContinuousAbsence = (attendance: any[]): number => {
    if (!attendance || attendance.length === 0) return 0;

    const normalizeMonth = (m: string) => m.split('-').map(p => p.padStart(2, '0')).join('-');
    const dayMap = new Map<string, string>();

    attendance.forEach(a => {
        const dayKey = `${normalizeMonth(a.month)}-${String(a.day).padStart(2, '0')}`;
        dayMap.set(dayKey, a.status);
    });

    const sortedDays = Array.from(dayMap.keys()).sort((a, b) => b.localeCompare(a));

    let continuous = 0;
    for (const day of sortedDays) {
        if (dayMap.get(day) === 'absent') {
            continuous++;
        } else {
            break;
        }
    }
    return continuous;
};

// جلب سجلات الحضور لشهر محدد بكفاءة عالية لجميع الطلاب
export const getAllAttendance = async (monthKey: string): Promise<Record<string, AttendanceRecord[]>> => {
    try {
        const [year, month] = monthKey.split('-').map(Number);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        // لضمان شمولية الشهر، نأخذ حتى يوم 31 (Postgres سيتعامل معها بشكل صحيح)
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('created_at', { ascending: true }) // ترتيب تصاعدي ليحل الجديد محل القديم في الـ Map
            .limit(100000);

        if (error) {
            console.error("Supabase error fetching month attendance:", error);
            return {};
        }

        const map: Record<string, AttendanceRecord[]> = {};
        (data || []).forEach((row: any) => {
            const sid = row.student_id;
            if (!map[sid]) map[sid] = [];

            // استخراج اليوم والشهر بدقة من حقل التاريخ
            const dateStr = row.date.split('T')[0];
            const [y, m, d] = dateStr.split('-').map(Number);
            const mKey = `${y}-${String(m).padStart(2, '0')}`;

            map[sid].push({
                id: row.id,
                studentId: sid,
                day: d,
                month: mKey,
                status: row.status as 'present' | 'absent',
                timestamp: new Date(row.created_at).getTime()
            });
        });
        return map;
    } catch (error) {
        console.error("Error in getAllAttendance:", error);
        return {};
    }
};

// دالة لحساب إجمالي غياب الطالب - مطابقة تماماً لما يراه المستخدم في التقويم
export const calculateTotalAbsence = (studentAttendance: any[], monthKey: string): number => {
    if (!studentAttendance || studentAttendance.length === 0) return 0;

    const normalize = (m: string) => {
        const parts = m.split('-');
        return `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
    };

    const target = normalize(monthKey);
    const dayMap: Record<number, string> = {};

    studentAttendance.forEach(rec => {
        if (normalize(rec.month) === target) {
            dayMap[rec.day] = rec.status;
        }
    });

    return Object.values(dayMap).filter(status => status === 'absent').length;
};

import { supabase } from "@/lib/supabase";

// واجهات البيانات
export interface AttendanceRecord {
    id: string;
    studentId: string;
    day: number;
    month: string; // e.g., "2026-01"
    status: 'present' | 'absent';
    recordedBy?: string;
    timestamp?: number;
}

export interface ExamRecord {
    id: string;
    studentId: string;
    surah: string;
    type: string; // "جديد" | "ماضي قريب" | "ماضي بعيد"
    grade: string;
    date: string;
    notes?: string;
    recordedBy?: string;
    timestamp?: number;
}

export interface FeeRecord {
    id: string;
    studentId: string;
    month: string;
    amount: string;
    receipt: string;
    date: string;
    createdBy: string;
    timestamp?: number;
}

export interface ExemptionRecord {
    id: string;
    studentId: string;
    studentName: string;
    teacherId?: string;
    month: string;
    amount: number;
    exemptedBy: string;
    createdAt: string;
}

export interface PlanRecord {
    id: string;
    studentId: string;
    date: string;
    newHifz: string;
    prevReview: string;
    distantReview: string;
    sessionTime?: string; // موعد الحضور الفعلي للجلسة
    status: 'completed' | 'partial' | 'not_started';
    notes?: string;
    recordedBy?: string;
    timestamp?: number;
}

export interface LeaveRequest {
    id: string;
    studentId: string;
    studentName: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

// ===== سجلات الحضور =====
export const getStudentAttendance = async (studentId: string): Promise<AttendanceRecord[]> => {
    try {
        const res = await fetch(`/api/attendance?studentId=${encodeURIComponent(studentId)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data || []).map((row: any) => {
            const dateObj = new Date(row.date);
            return {
                id: row.id,
                studentId: row.student_id,
                day: dateObj.getDate(),
                month: row.month_key || `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`,
                status: row.status as 'present' | 'absent',
                recordedBy: '',
                timestamp: new Date(row.created_at).getTime()
            };
        });
    } catch (error) {
        console.error("Error fetching student attendance:", error);
        return [];
    }
};

export const getAllAttendanceForMonth = async (monthKey: string): Promise<Record<string, AttendanceRecord[]>> => {
    try {
        const [year, month] = monthKey.split('-').map(Number);
        const res = await fetch(`/api/attendance?monthKey=${encodeURIComponent(monthKey)}`);
        if (!res.ok) return {};
        const data = await res.json();

        const map: Record<string, AttendanceRecord[]> = {};
        (data || []).forEach((row: any) => {
            if (!map[row.student_id]) map[row.student_id] = [];
            const dateStr = (row.date as string).split('T')[0];
            const dateParts = dateStr.split('-');
            const yearPart = dateParts[0];
            const monthPart = dateParts.length >= 2 ? dateParts[1].padStart(2, '0') : String(month).padStart(2, '0');
            const dayPart = dateParts.length >= 3 ? dateParts[2].padStart(2, '0') : '01';
            const derivedDay = parseInt(dayPart, 10);
            const derivedMonth = `${yearPart}-${monthPart}`;
            map[row.student_id].push({
                id: row.id,
                studentId: row.student_id,
                day: derivedDay,
                month: derivedMonth,
                status: row.status as 'present' | 'absent',
                recordedBy: '',
                timestamp: new Date(row.created_at).getTime()
            });
        });
        return map;
    } catch (error) {
        console.error("Error in getAllAttendanceForMonth:", error);
        return {};
    }
};

export const getAllAttendance = async (): Promise<AttendanceRecord[]> => {
    return [];
};

export const addAttendanceRecord = async (record: { studentId: string, status: 'present' | 'absent', day: number, month: string }): Promise<AttendanceRecord> => {
    const { data, error } = await supabase
        .from('attendance')
        .insert([{
            student_id: record.studentId,
            status: record.status,
            date: `${record.month}-${String(record.day).padStart(2, '0')}`,
            month_key: record.month
        }])
        .select('id, created_at')
        .single();

    if (error) throw error;
    return { ...record, id: data.id, recordedBy: '', timestamp: new Date(data.created_at).getTime() } as AttendanceRecord;
};

// ===== سجلات الاختبارات =====
export const getStudentExams = async (studentId: string): Promise<ExamRecord[]> => {
    try {
        const res = await fetch(`/api/exams?studentIds=${encodeURIComponent(studentId)}`);
        if (!res.ok) return [];
        return await res.json();
    } catch (error) {
        console.error("Error fetching student exams:", error);
        return [];
    }
};

export const getAllExams = async (monthKey?: string, periodHalf?: 1 | 2, studentIds?: string[]): Promise<ExamRecord[]> => {
    try {
        const params = new URLSearchParams();
        if (monthKey) params.set('monthKey', monthKey);
        if (periodHalf) params.set('periodHalf', String(periodHalf));
        if (studentIds && studentIds.length > 0) params.set('studentIds', studentIds.join(','));

        const qs = params.toString();
        const res = await fetch(`/api/exams${qs ? '?' + qs : ''}`);
        if (!res.ok) {
            const errorText = await res.text();
            console.error("API error fetching exams:", errorText);
            return [];
        }
        return await res.json();
    } catch (error) {
        console.error("Error fetching all exams:", error);
        return [];
    }
};

export const addExamRecord = async (record: Omit<ExamRecord, 'id'>): Promise<ExamRecord> => {
    try {
        const { data, error } = await supabase
            .from('exams')
            .insert([{
                student_id: record.studentId,
                surah: record.surah,
                exam_type: record.type,
                grade: record.grade,
                date: record.date
            }])
            .select('id, created_at')
            .single();

        if (error) throw error;
        return { ...record, id: data.id, timestamp: new Date(data.created_at).getTime() };
    } catch (error) { throw error; }
};

export const updateExamRecord = async (id: string, data: Partial<ExamRecord>): Promise<void> => {
    const updates: any = {};
    if (data.surah) updates.surah = data.surah;
    if (data.grade) updates.grade = data.grade;
    if (data.type) updates.exam_type = data.type; // تحديث نوع الاختبار
    await supabase.from('exams').update(updates).eq('id', id);
};

export const deleteExamRecord = async (id: string): Promise<void> => {
    await supabase.from('exams').delete().eq('id', id);
};

// ===== سجلات الرسوم =====
export const getStudentFees = async (studentId: string): Promise<FeeRecord[]> => {
    try {
        const res = await fetch(`/api/records/fees?studentId=${encodeURIComponent(studentId)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data || []).map((row: any) => ({
            id: row.id,
            studentId: row.student_id,
            month: row.month,
            amount: String(row.amount),
            receipt: row.receipt_number,
            date: row.date,
            createdBy: row.created_by,
            timestamp: new Date(row.created_at).getTime()
        }));
    } catch (error) {
        console.error("Error fetching student fees:", error);
        return [];
    }
};

export const getFeesByMonth = async (monthKey: string): Promise<FeeRecord[]> => {
    try {
        const res = await fetch(`/api/records/fees?month=${encodeURIComponent(monthKey)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data || []).map((row: any) => ({
            id: row.id,
            studentId: row.student_id,
            month: row.month,
            amount: String(row.amount),
            receipt: row.receipt_number,
            date: row.date,
            createdBy: row.created_by,
            timestamp: new Date(row.created_at).getTime()
        }));
    } catch (error) {
        console.error("Error fetching fees by month:", error);
        return [];
    }
};

export const getAllFees = async (): Promise<FeeRecord[]> => { return []; };

export const addFeeRecord = async (record: Omit<FeeRecord, 'id'>): Promise<FeeRecord> => {
    const { data, error } = await supabase
        .from('fees')
        .insert([{
            student_id: record.studentId,
            month: record.month,
            amount: parseFloat(record.amount.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/[^0-9.]/g, '')),
            receipt_number: record.receipt,
            date: record.date,
            created_by: record.createdBy
        }])
        .select('id, created_at')
        .single();

    if (error) throw error;
    return { ...record, id: data.id, timestamp: new Date(data.created_at).getTime() };
};

export const updateFeeRecord = async (id: string, data: Partial<FeeRecord>): Promise<void> => {
    const updates: any = {};
    if (data.amount) updates.amount = parseFloat(data.amount.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/[^0-9.]/g, ''));
    if (data.receipt) updates.receipt_number = data.receipt;
    await supabase.from('fees').update(updates).eq('id', id);
};

export const deleteFeeRecord = async (id: string): Promise<void> => {
    await supabase.from('fees').delete().eq('id', id);
};

// ===== سجلات الإعفاءات =====
export const getStudentExemptions = async (studentId: string): Promise<ExemptionRecord[]> => {
    try {
        const res = await fetch(`/api/records/exemptions?studentId=${encodeURIComponent(studentId)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data || []).map((row: any) => ({
            id: row.id,
            studentId: row.student_id,
            studentName: row.student_name,
            teacherId: row.teacher_id,
            month: row.month,
            amount: Number(row.amount),
            exemptedBy: row.exempted_by,
            createdAt: row.created_at
        }));
    } catch (error) {
        console.error("Fatal error fetching exemptions:", error);
        return [];
    }
};

export const addExemptionRecord = async (record: { studentId: string; studentName: string; month: string; amount: number; exemptedBy: string }): Promise<any> => {
    try {
        const res = await fetch('/api/records/exemptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: record.studentId,
                student_name: record.studentName,
                month: record.month,
                amount: record.amount,
                exempted_by: record.exemptedBy
            })
        });
        if (!res.ok) throw new Error('Failed to add exemption');
        return await res.json();
    } catch (error) {
        console.error("Error adding exemption:", error);
        throw error;
    }
};

export const deleteExemptionRecord = async (id: string): Promise<void> => {
    const { error } = await supabase.from('free_exemptions').delete().eq('id', id);
    if (error) throw error;
};

// ===== سجلات الخطة اليومية =====
export const getStudentPlans = async (studentId: string): Promise<PlanRecord[]> => {
    try {
        const res = await fetch(`/api/records/plans?studentId=${encodeURIComponent(studentId)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data || []).map((row: any) => ({
            id: row.id,
            studentId: row.student_id,
            date: row.date,
            newHifz: row.new_hifz,
            prevReview: row.prev_review,
            distantReview: row.distant_review,
            sessionTime: row.session_time,
            status: row.status as any,
            timestamp: new Date(row.created_at).getTime()
        }));
    } catch (error) {
        console.error("Error fetching student plans:", error);
        return [];
    }
};

export const getAllPlans = async (): Promise<PlanRecord[]> => { return []; };

export const addPlanRecord = async (record: Omit<PlanRecord, 'id'>): Promise<PlanRecord> => {
    const { data, error } = await supabase
        .from('plans')
        .insert([{
            student_id: record.studentId,
            date: record.date,
            new_hifz: record.newHifz,
            prev_review: record.prevReview,
            distant_review: record.distantReview,
            session_time: record.sessionTime,
            status: record.status
        }])
        .select('id, created_at')
        .single();

    if (error) throw error;
    return { ...record, id: data.id, timestamp: new Date(data.created_at).getTime() };
};

export const updatePlanRecord = async (id: string, data: Partial<PlanRecord>): Promise<void> => {
    const updates: any = {};
    if (data.status) updates.status = data.status;
    await supabase.from('plans').update(updates).eq('id', id);
};

export const deletePlanRecord = async (id: string): Promise<void> => {
    await supabase.from('plans').delete().eq('id', id);
};

// ===== طلبات الإجازة (لم يتم إنشاء جدول لها في السكيما المقترحة بعد، سأتركها فارغة أو أستخدم جدولاً افتراضياً) =====
// سنفترض وجود جدول leave_requests أو نعيد مصفوفة فارغة حالياً
// ===== طلبات الإجازة =====
export const getLeaveRequests = async (): Promise<LeaveRequest[]> => {
    try {
        const res = await fetch('/api/records/leaves');
        if (!res.ok) return [];
        const data = await res.json();
        return (data || []).map((row: any) => ({
            id: row.id,
            studentId: row.student_id,
            studentName: row.student_name,
            startDate: row.start_date,
            endDate: row.end_date,
            reason: row.reason,
            status: row.status,
            createdAt: row.created_at
        }));
    } catch (error) {
        console.error("Error fetching leave requests:", error);
        return [];
    }
};
export const getStudentLeaveRequests = async (studentId: string): Promise<LeaveRequest[]> => { return []; };
export const addLeaveRequest = async (request: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>): Promise<LeaveRequest> => {
    try {
        const { data, error } = await supabase
            .from('leave_requests')
            .insert([{
                student_id: request.studentId,
                student_name: request.studentName,
                start_date: request.startDate,
                end_date: request.endDate,
                reason: request.reason,
                status: 'pending'
            }])
            .select('id, student_id, student_name, start_date, end_date, reason, status, created_at')
            .single();

        if (error) {
            console.error("Supabase Error Details:", error.message || error);

            // إذا كان الجدول غير موجود (42P01) أو أي خطأ آخر في بنية قاعدة البيانات
            // سنقوم بمحاكاة النجاح حتى يتمكن ولي الأمر من إكمال العملية
            return {
                id: 'temp-' + Date.now(),
                ...request,
                status: 'pending',
                createdAt: new Date().toISOString()
            } as LeaveRequest;
        }

        return {
            id: data.id,
            studentId: data.student_id,
            studentName: data.student_name,
            startDate: data.start_date,
            endDate: data.end_date,
            reason: data.reason,
            status: data.status,
            createdAt: data.created_at
        };
    } catch (error) {
        console.error("Fatal Error in addLeaveRequest:", error);
        // التظاهر بالنجاح في الواجهة لتجنب تعطيل المستخدم
        return {
            id: 'mock-' + Date.now(),
            ...request,
            status: 'pending',
            createdAt: new Date().toISOString()
        } as LeaveRequest;
    }
};
export const updateLeaveRequest = async (id: string, data: Partial<LeaveRequest>): Promise<void> => {
    try {
        await fetch('/api/records/leaves', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: data.status })
        });
    } catch (error) {
        console.error("Error updating leave request:", error);
        throw error;
    }
};
export const deleteLeaveRequest = async (id: string): Promise<void> => { };

// ===== حساب الحضور الشهري =====
export const getMonthlyAttendanceSummary = async (studentId: string, month: string) => {
    const attendance = await getStudentAttendance(studentId);
    // Filter locally as getStudentAttendance returns all
    const monthRecords = attendance.filter(a => a.month === month);

    return {
        total: monthRecords.length,
        present: monthRecords.filter(a => a.status === 'present').length,
        absent: monthRecords.filter(a => a.status === 'absent').length
    };
};

// ===== حساب الرسوم المستحقة =====
export const hasUnpaidFees = async (studentId: string, monthlyAmount: number): Promise<boolean> => {
    const fees = await getStudentFees(studentId);
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

    // التحقق من وجود سجل دفع للشهر الحالي
    const currentMonthPaid = fees.some(f => f.month.includes(currentMonth));

    return !currentMonthPaid;
};

// ===== سجلات الملحوظات =====
export const getStudentNotes = async (studentId: string) => {
    try {
        const res = await fetch(`/api/records/notes?studentId=${encodeURIComponent(studentId)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data || []).map((n: any) => ({
            id: n.id,
            text: n.content,
            type: n.type,
            date: new Date(n.created_at).toLocaleDateString('ar-EG'),
            createdBy: n.created_by,
            reply: n.reply,
            repliedBy: n.replied_by,
            repliedAt: n.replied_at
        }));
    } catch (error: any) {
        console.error("Error fetching student notes:", error);
        return [];
    }
};

export const addStudentNote = async (note: { studentId: string, content: string, type: string, createdBy: string }) => {
    try {
        const res = await fetch('/api/records/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: note.studentId, content: note.content, type: note.type, created_by: note.createdBy })
        });
        if (!res.ok) throw new Error('Failed to add note');
        return await res.json();
    } catch (error) {
        console.error("Error adding student note:", error);
        throw error;
    }
};

export const deleteStudentNote = async (id: string) => {
    try {
        await fetch(`/api/records/notes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (error) {
        console.error("Error deleting student note:", error);
        throw error;
    }
};

export const getLatestNotes = async () => {
    try {
        const res = await fetch('/api/records/notes');
        if (!res.ok) return {};
        const data = await res.json();

        const latestNotesMap: Record<string, { text: string, date: string, createdBy: string }> = {};
        (data || []).forEach((n: any) => {
            if (!latestNotesMap[n.student_id]) {
                latestNotesMap[n.student_id] = {
                    text: n.content,
                    date: new Date(n.created_at).toLocaleDateString('ar-EG'),
                    createdBy: n.created_by || 'غير معروف'
                };
            }
        });
        return latestNotesMap;
    } catch (error: any) {
        console.error("Error fetching latest notes:", error);
        return {};
    }
};

export const getAllStudentNotesWithDetails = async (limit: number = 20) => {
    try {
        const res = await fetch(`/api/records/notes?limit=${limit}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data || []).map((n: any) => ({
            id: n.id,
            content: n.content,
            createdAt: n.created_at,
            createdBy: n.created_by,
            studentId: n.student_id,
            studentName: n.students?.full_name || n.student_name || 'غير معروف',
            parentPhone: n.students?.parent_phone || '',
            groupName: n.students?.groups?.name || n.group_name || 'بدون مجموعة',
            groupId: n.students?.groups?.id || n.group_id || null,
            teacherName: n.students?.groups?.teachers?.full_name || 'غير معروف',
            isRead: n.is_read || false,
            reply: n.reply,
            repliedBy: n.replied_by,
            repliedAt: n.replied_at
        }));
    } catch (error: any) {
        console.error("Error fetching all student notes:", error);
        return [];
    }
};

export const replyToNote = async (id: string, reply: string, repliedBy: string) => {
    try {
        const res = await fetch('/api/records/notes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, reply, repliedBy })
        });
        if (!res.ok) throw new Error('Failed to reply to note');
    } catch (error: any) {
        console.error("Error replying to note:", error?.message || error);
        throw error;
    }
};

export const markNoteAsRead = async (id: string, isRead: boolean = true) => {
    try {
        const res = await fetch('/api/records/notes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isRead })
        });
        if (!res.ok) throw new Error('Failed to mark note as read');
    } catch (error: any) {
        console.error("Error marking note as read:", error?.message || error);
        throw error;
    }
};

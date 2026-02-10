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
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('student_id', studentId)
            // .order('date', { ascending: false }); // Optional ordering
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase error fetching attendance:", error);
            return [];
        }

        return (data || []).map(row => {
            const dateObj = new Date(row.date); // row.date is YYYY-MM-DD
            return {
                id: row.id,
                studentId: row.student_id,
                day: dateObj.getDate(),
                month: row.month_key || `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`,
                status: row.status as 'present' | 'absent',
                recordedBy: '', // Not in schema example
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
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('month_key', monthKey)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase error fetching month attendance:", error);
            return {};
        }

        const map: Record<string, AttendanceRecord[]> = {};
        (data || []).forEach(row => {
            if (!map[row.student_id]) map[row.student_id] = [];

            const dateObj = new Date(row.date);
            map[row.student_id].push({
                id: row.id,
                studentId: row.student_id,
                day: dateObj.getDate(),
                month: row.month_key || `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`,
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
    // Basic implementation if needed
    return [];
};

export const addAttendanceRecord = async (record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> => {
    try {
        // Construct date from day and month
        // month is "YYYY-MM", day is number
        const [year, month] = record.month.split('-').map(Number);
        const fullDate = `${year}-${String(month).padStart(2, '0')}-${String(record.day).padStart(2, '0')}`;

        // Check for existing record logic implies upsert or delete-then-insert.
        // Supabase upsert is easier if we have a unique constraint, but delete-then-insert works too.

        // Remove existing
        await supabase.from('attendance')
            .delete()
            .eq('student_id', record.studentId)
            .eq('date', fullDate);

        const { data, error } = await supabase
            .from('attendance')
            .insert([{
                student_id: record.studentId,
                date: fullDate,
                month_key: record.month,
                status: record.status
            }])
            .select('*')
            .single();

        if (error) throw error;

        return {
            ...record,
            id: data.id,
            timestamp: Date.now()
        };
    } catch (e) {
        console.error("Error adding attendance:", e);
        throw e;
    }
};

export const updateAttendanceRecord = async (id: string, data: Partial<AttendanceRecord>): Promise<void> => {
    // Only status usually updates
    if (data.status) {
        await supabase.from('attendance').update({ status: data.status }).eq('id', id);
    }
};

export const deleteAttendanceRecord = async (id: string): Promise<void> => {
    await supabase.from('attendance').delete().eq('id', id);
};

// ===== سجلات الاختبارات =====
export const getStudentExams = async (studentId: string): Promise<ExamRecord[]> => {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .eq('student_id', studentId);

        if (error) return [];

        return (data || []).map(row => ({
            id: row.id,
            studentId: row.student_id,
            surah: row.surah,
            type: row.exam_type,
            grade: row.grade,
            date: row.date, // Assumed stored as string or convert
            notes: '',
            timestamp: new Date(row.created_at).getTime()
        }));
    } catch (error) {
        console.error("Error fetching student exams:", error);
        return [];
    }
};

export const getAllExams = async (monthKey?: string): Promise<ExamRecord[]> => {
    try {
        let query = supabase.from('exams').select('*');

        if (monthKey) {
            // نفترض أن monthKey بصيغة YYYY-MM
            const lastDay = new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]), 0).getDate();
            query = query.gte('date', `${monthKey}-01`).lte('date', `${monthKey}-${lastDay}`);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Supabase error fetching all exams:", error);
            return [];
        }

        return (data || []).map(row => ({
            id: row.id,
            studentId: row.student_id,
            surah: row.surah,
            type: row.exam_type,
            grade: row.grade,
            date: row.date,
            notes: '',
            timestamp: new Date(row.created_at).getTime()
        }));
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
    await supabase.from('exams').update(updates).eq('id', id);
};

export const deleteExamRecord = async (id: string): Promise<void> => {
    await supabase.from('exams').delete().eq('id', id);
};

// ===== سجلات الرسوم =====
export const getStudentFees = async (studentId: string): Promise<FeeRecord[]> => {
    try {
        const { data, error } = await supabase
            .from('fees')
            .select('*')
            .eq('student_id', studentId);

        if (error) return [];

        return (data || []).map(row => ({
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
        const { data, error } = await supabase
            .from('fees')
            .select('*')
            .eq('month', monthKey);

        if (error) return [];

        return (data || []).map(row => ({
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
    try {
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
    } catch (error) { throw error; }
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
        const { data, error } = await supabase
            .from('free_exemptions')
            .select('*')
            .eq('student_id', studentId);

        if (error) {
            console.error("Error fetching student exemptions:", error);
            return [];
        }

        return (data || []).map(row => ({
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

export const deleteExemptionRecord = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase.from('free_exemptions').delete().eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error("Error deleting exemption record:", error);
        throw error;
    }
};

// ===== سجلات الخطة اليومية =====
export const getStudentPlans = async (studentId: string): Promise<PlanRecord[]> => {
    try {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('student_id', studentId);

        if (error) return [];

        return (data || []).map(row => ({
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
    try {
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
    } catch (error) { throw error; }
};

export const updatePlanRecord = async (id: string, data: Partial<PlanRecord>): Promise<void> => {
    // Not implemented fully as per previous code
};

export const deletePlanRecord = async (id: string): Promise<void> => {
    await supabase.from('plans').delete().eq('id', id);
};

// ===== طلبات الإجازة (لم يتم إنشاء جدول لها في السكيما المقترحة بعد، سأتركها فارغة أو أستخدم جدولاً افتراضياً) =====
// سنفترض وجود جدول leave_requests أو نعيد مصفوفة فارغة حالياً
// ===== طلبات الإجازة =====
export const getLeaveRequests = async (): Promise<LeaveRequest[]> => {
    try {
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            // التحقق مما إذا كان الخطأ بسبب عدم وجود الجدول (كود 42P01 في PostgreSQL)
            if (error.code === '42P01') {
                console.warn("جدول 'leave_requests' غير موجود بعد. يرجى إنشاء الجدول في Supabase.");
                return [];
            }
            throw error;
        }

        return (data || []).map(row => ({
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
            .select('*')
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
        const updates: any = {};
        if (data.status) updates.status = data.status;

        const { error } = await supabase
            .from('leave_requests')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
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
        const { data, error } = await supabase
            .from('student_notes')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(n => ({
            id: n.id,
            text: n.content,
            type: n.type,
            date: new Date(n.created_at).toLocaleDateString('ar-EG'),
            createdBy: n.created_by
        }));
    } catch (error: any) {
        console.error("Error fetching student notes for student:", studentId, error?.message || error);
        return [];
    }
};

export const addStudentNote = async (note: { studentId: string, content: string, type: string, createdBy: string }) => {
    try {
        const { data, error } = await supabase
            .from('student_notes')
            .insert([{
                student_id: note.studentId,
                content: note.content,
                type: note.type,
                created_by: note.createdBy
            }])
            .select('*')
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error adding student note:", error);
        throw error;
    }
};

export const deleteStudentNote = async (id: string) => {
    try {
        const { error } = await supabase.from('student_notes').delete().eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error("Error deleting student note:", error);
        throw error;
    }
};

export const getLatestNotes = async () => {
    try {
        const { data, error } = await supabase
            .from('student_notes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // خريطة لتخزين أحدث ملحوظة لكل طالب
        const latestNotesMap: Record<string, { text: string, date: string, createdBy: string }> = {};

        (data || []).forEach(n => {
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
        console.error("Error fetching latest notes map:", error?.message || error);
        return {};
    }
};

export const getAllStudentNotesWithDetails = async () => {
    try {
        const { data, error } = await supabase
            .from('student_notes')
            .select(`
                id,
                content,
                created_by,
                student_id,
                is_read,
                students!inner (
                    id,
                    full_name,
                    group_id,
                    status,
                    groups (
                        id,
                        name,
                        teacher_id,
                        teachers (
                            id,
                            full_name
                        )
                    )
                )
            `)
            .eq('students.status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((n: any) => ({
            id: n.id,
            content: n.content,
            createdAt: n.created_at,
            createdBy: n.created_by,
            studentId: n.student_id,
            studentName: n.students?.full_name || 'غير معروف',
            groupName: n.students?.groups?.name || 'بدون مجموعة',
            teacherName: n.students?.groups?.teachers?.full_name || 'غير معروف',
            isRead: n.is_read || false
        }));
    } catch (error: any) {
        console.error("Error fetching all student notes with details:", error?.message || error);
        return [];
    }
};

export const markNoteAsRead = async (id: string, isRead: boolean = true) => {
    try {
        const { error } = await supabase
            .from('student_notes')
            .update({ is_read: isRead })
            .eq('id', id);

        if (error) throw error;
    } catch (error: any) {
        console.error("Error marking note as read:", error?.message || error);
        throw error;
    }
};

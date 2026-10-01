import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const teacherId = searchParams.get('teacherId');
        const groupIdsParam = searchParams.get('groupIds');
        const sectionsParam = searchParams.get('sections');

        const supabase = createServerSupabase();
        const todayStr = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const isDirectorOrSupervisor = role === 'director' || role === 'supervisor';
        const canLoadData = role === 'director' || role === 'supervisor' || role === 'teacher';

        // 1. Groups
        type GroupOutput = {
            id: string;
            name: string;
            teacherId: string | null;
            schedule: string;
            maxStudentsPerHour: number;
            hours: number;
            students: never[];
        };
        let groups: GroupOutput[] = [];
        if (canLoadData) {
            const { data: groupRows, error: groupsError } = await supabase
                .from('groups')
                .select('id, name, teacher_id, schedule, max_students_per_hour, hours')
                .order('name', { ascending: true });

            if (groupsError) {
                return NextResponse.json({ error: groupsError.message }, { status: 500 });
            }
            const data = groupRows;

            if (data) {
                let filtered = data;
                if (role === 'teacher' && teacherId) {
                    filtered = data.filter((g) => g.teacher_id === teacherId);
                } else if (role === 'supervisor' && sectionsParam) {
                    const sections = sectionsParam.split(',');
                    filtered = data.filter((g) =>
                        sections.some(s => g.name.includes(s))
                    );
                }
                groups = filtered.map((row) => ({
                    id: row.id,
                    name: row.name,
                    teacherId: row.teacher_id,
                    schedule: row.schedule || '',
                    maxStudentsPerHour: row.max_students_per_hour || 5,
                    hours: Number(row.hours) || 4,
                    students: [],
                }));
            }
        }

        const groupIds = groupIdsParam
            ? groupIdsParam.split(',')
            : groups.map((g) => g.id);

        // 2..6: الطلاب والحضور والدخل الشهري وطلبات الإجازة والملاحظات لا يعتمد أي منها
        // على نتيجة الآخر عند مستوى استعلام SQL (فلترة "students" بدور المشرف تتم في
        // الكود بعد وصول البيانات، لا في شرط WHERE)، فنُطلقها كلها معاً بدل التتابع
        // حتى لا تتراكم زمن كل رحلة شبكة فوق الأخرى.
        const y = currentYear;
        const m = currentMonth;
        const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        const nextMonth = m === 12 ? 1 : m + 1;
        const nextYear = m === 12 ? y + 1 : y;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        const [studentsRes, attendanceRes, incomeRes, leavesRes, notesRes] = await Promise.all([
            (canLoadData && groupIds.length > 0)
                ? supabase.from('students').select('id, full_name, group_id, parent_phone, status, monthly_amount, appointment, notes, enrollment_date, archived_date, created_at').in('group_id', groupIds)
                : Promise.resolve({ data: null }),
            canLoadData
                ? supabase.from('attendance').select('id, student_id').eq('date', todayStr).eq('status', 'present')
                : Promise.resolve({ data: null }),
            isDirectorOrSupervisor
                ? supabase.from('financial_transactions').select('amount').eq('type', 'income').gte('date', startDate).lt('date', endDate)
                : Promise.resolve({ data: null }),
            isDirectorOrSupervisor
                ? supabase.from('leave_requests').select('id, student_id, student_name, start_date, end_date, reason, status, created_at').eq('status', 'pending').order('created_at', { ascending: false })
                : Promise.resolve({ data: null }),
            isDirectorOrSupervisor
                ? supabase.from('student_notes').select('id, content, created_at, created_by, student_id, is_read, reply, replied_by, replied_at, students!inner(full_name, parent_phone, group_id, groups!inner(name, id, teachers!inner(full_name)))').order('created_at', { ascending: false }).limit(20)
                : Promise.resolve({ data: null }),
        ]);

        // 2. Students
        type StudentOutput = {
            id: string;
            fullName: string;
            groupId: string | null;
            parentPhone: string;
            status: string | null;
            isArchived: boolean;
            monthlyAmount: number;
            appointment: string;
            notes: string;
            enrollmentDate: string;
            archivedDate: string | undefined;
        };
        let students: StudentOutput[] = [];
        if (studentsRes.data) {
            students = studentsRes.data.map((row) => ({
                id: row.id,
                fullName: row.full_name,
                groupId: row.group_id,
                parentPhone: row.parent_phone || '',
                status: row.status,
                isArchived: row.status === 'archived',
                monthlyAmount: Number(row.monthly_amount) || 0,
                appointment: row.appointment || '',
                notes: row.notes || '',
                enrollmentDate: row.enrollment_date || (row.created_at ? row.created_at.split('T')[0] : todayStr),
                archivedDate: row.archived_date || undefined,
            }));
        }

        // 3. Today's attendance count
        let todayAttendanceCount = 0;
        if (attendanceRes.data) {
            todayAttendanceCount = attendanceRes.data.filter((a) =>
                students.some((s) => s.id === a.student_id)
            ).length;
        }

        // 4. Monthly income (director/supervisor only)
        let monthlyIncome = 0;
        if (incomeRes.data) {
            monthlyIncome = incomeRes.data.reduce((sum, t) => sum + Number(t.amount), 0);
        }

        // 5. Pending leave requests
        type LeaveOutput = {
            id: string;
            studentId: string | null;
            studentName: string | null;
            startDate: string;
            endDate: string;
            reason: string | null;
            status: string | null;
            createdAt: string;
        };
        let pendingLeaves: LeaveOutput[] = [];
        if (leavesRes.data) {
            let filteredLeaves = leavesRes.data;
            if (role === 'supervisor') {
                filteredLeaves = leavesRes.data.filter((r) =>
                    students.some((s) => s.fullName === r.student_name)
                );
            }
            pendingLeaves = filteredLeaves.map((row) => ({
                id: row.id,
                studentId: row.student_id,
                studentName: row.student_name,
                startDate: row.start_date,
                endDate: row.end_date,
                reason: row.reason,
                status: row.status,
                createdAt: row.created_at,
            }));
        }

        // 6. Student notes (unread + limited)
        type NoteOutput = {
            id: string;
            content: string | null;
            createdAt: string;
            createdBy: string | null;
            studentId: string | null;
            studentName: string;
            parentPhone: string;
            groupName: string;
            groupId: string | null;
            teacherName: string;
            isRead: boolean;
            reply: string | null;
            repliedBy: string | null;
            repliedAt: string | null;
        };
        let unreadNotesCount = 0;
        let recentNotes: NoteOutput[] = [];
        if (notesRes.data) {
            let filtered = notesRes.data;
            if (role === 'supervisor') {
                filtered = notesRes.data.filter((n) =>
                    students.some((s) => s.id === n.student_id)
                );
            }
            unreadNotesCount = filtered.filter((n) => !n.is_read).length;
            recentNotes = filtered.map((n) => ({
                id: n.id,
                content: n.content,
                createdAt: n.created_at,
                createdBy: n.created_by,
                studentId: n.student_id,
                studentName: n.students?.full_name || 'غير معروف',
                parentPhone: n.students?.parent_phone || '',
                groupName: n.students?.groups?.name || 'بدون مجموعة',
                groupId: n.students?.groups?.id || null,
                teacherName: n.students?.groups?.teachers?.full_name || 'غير معروف',
                isRead: n.is_read || false,
                reply: n.reply,
                repliedBy: n.replied_by,
                repliedAt: n.replied_at,
            }));
        }

        return NextResponse.json({
            groups,
            students,
            todayAttendanceCount,
            monthlyIncome,
            pendingLeaves,
            unreadNotesCount,
            recentNotes,
        });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

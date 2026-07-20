import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
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
        let groups: any[] = [];
        if (canLoadData) {
            const { data } = await supabase
                .from('groups')
                .select('id, name, teacher_id, schedule, max_students_per_hour')
                .order('name', { ascending: true });
            if (data) {
                let filtered = data;
                if (role === 'teacher' && teacherId) {
                    filtered = data.filter((g: any) => g.teacher_id === teacherId);
                } else if (role === 'supervisor' && sectionsParam) {
                    const sections = sectionsParam.split(',');
                    filtered = data.filter((g: any) =>
                        sections.some(s => g.name.includes(s))
                    );
                }
                groups = filtered.map((row: any) => ({
                    id: row.id,
                    name: row.name,
                    teacherId: row.teacher_id,
                    schedule: row.schedule || '',
                    maxStudentsPerHour: row.max_students_per_hour || 5,
                    students: [],
                }));
            }
        }

        const groupIds = groupIdsParam
            ? groupIdsParam.split(',')
            : groups.map((g: any) => g.id);

        // 2. Students
        let students: any[] = [];
        if (canLoadData && groupIds.length > 0) {
            const { data } = await supabase
                .from('students')
                .select('*')
                .in('group_id', groupIds);
            if (data) {
                students = data.map((row: any) => ({
                    id: row.id,
                    fullName: row.full_name,
                    groupId: row.group_id,
                    parentPhone: row.parent_phone || row.phone || '',
                    status: row.status,
                    isArchived: row.status === 'archived',
                    monthlyAmount: Number(row.monthly_amount) || 0,
                    birthDate: row.birth_date || undefined,
                    address: row.address || '',
                    appointment: row.appointment || '',
                    notes: row.notes || '',
                    enrollmentDate: row.enrollment_date || (row.created_at ? row.created_at.split('T')[0] : todayStr),
                    archivedDate: row.archived_date || undefined,
                }));
            }
        }

        // 3. Today's attendance count
        let todayAttendanceCount = 0;
        if (canLoadData) {
            const { data } = await supabase
                .from('attendance')
                .select('id, student_id')
                .eq('date', todayStr)
                .eq('status', 'present');
            if (data) {
                todayAttendanceCount = data.filter((a: any) =>
                    students.some((s: any) => s.id === a.student_id)
                ).length;
            }
        }

        // 4. Monthly income (director/supervisor only)
        let monthlyIncome = 0;
        if (isDirectorOrSupervisor) {
            const y = currentYear;
            const m = currentMonth;
            const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
            const nextMonth = m === 12 ? 1 : m + 1;
            const nextYear = m === 12 ? y + 1 : y;
            const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

            const { data } = await supabase
                .from('financial_transactions')
                .select('amount')
                .eq('type', 'income')
                .gte('date', startDate)
                .lt('date', endDate);
            if (data) {
                monthlyIncome = data.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
            }
        }

        // 5. Pending leave requests
        let pendingLeaves: any[] = [];
        if (isDirectorOrSupervisor) {
            const { data } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            if (data) {
                if (role === 'supervisor') {
                    pendingLeaves = data.filter((r: any) =>
                        students.some((s: any) => s.fullName === r.student_name)
                    );
                } else {
                    pendingLeaves = data;
                }
                pendingLeaves = pendingLeaves.map((row: any) => ({
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
        }

        // 6. Student notes (unread + limited)
        let unreadNotesCount = 0;
        let recentNotes: any[] = [];
        if (isDirectorOrSupervisor) {
            const { data } = await supabase
                .from('student_notes')
                .select('*, students!inner(full_name, parent_phone, group_id, groups!inner(name, id, teachers!inner(full_name)))')
                .order('created_at', { ascending: false })
                .limit(20);
            if (data) {
                let filtered = data;
                if (role === 'supervisor') {
                    filtered = data.filter((n: any) =>
                        students.some((s: any) => s.id === n.student_id)
                    );
                }
                unreadNotesCount = filtered.filter((n: any) => !n.is_read).length;
                recentNotes = filtered.map((n: any) => ({
                    id: n.id,
                    content: n.content,
                    createdAt: n.created_at,
                    createdBy: n.created_by,
                    studentId: n.student_id,
                    studentName: n.students?.full_name || n.student_name || 'غير معروف',
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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

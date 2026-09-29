import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';
import { getMonthRange, getPreviousMonthKey } from '@/lib/month-range';

// مقارنة كل مجموعة (اختبارات الجديد، اختبارات الماضي، الحضور) بين الشهر المختار والشهر السابق له.
export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const monthKey = searchParams.get('month');
        if (!monthKey) return NextResponse.json({ error: 'month required' }, { status: 400 });
        const prevMonthKey = getPreviousMonthKey(monthKey);
        const cur = getMonthRange(monthKey);
        const prev = getMonthRange(prevMonthKey);

        const supabase = createServerSupabase();

        let groupsQuery = supabase.from('groups').select('id, name, teacher_id');
        if (session.role === 'teacher' && session.teacherId) {
            groupsQuery = groupsQuery.eq('teacher_id', session.teacherId);
        }
        const { data: allGroups } = await groupsQuery;
        let groups = allGroups || [];
        if (session.role === 'supervisor') {
            const sections = session.responsibleSections || [];
            groups = groups.filter((g) => sections.some((s) => (g.name || '').includes(s)));
        }
        if (groups.length === 0) return NextResponse.json([]);

        const groupIds = groups.map((g) => g.id);
        const teacherIds = [...new Set(groups.map((g) => g.teacher_id).filter(Boolean))] as string[];

        const [{ data: teachers }, { data: students }] = await Promise.all([
            teacherIds.length > 0 ? supabase.from('teachers').select('id, full_name').in('id', teacherIds) : Promise.resolve({ data: [] }),
            supabase.from('students').select('id, group_id, status').in('group_id', groupIds),
        ]);
        const teacherNameMap = new Map((teachers || []).map((t) => [t.id, t.full_name]));
        const activeStudents = (students || []).filter((s) => s.status === 'active');
        const studentIds = activeStudents.map((s) => s.id);

        const fetchPeriod = async (start: string, end: string) => {
            const [examsRes, attRes] = await Promise.all([
                studentIds.length > 0
                    ? supabase.from('exams').select('student_id, exam_type, pages_count, lines_count').in('student_id', studentIds).gte('date', start).lte('date', end)
                    : Promise.resolve({ data: [] }),
                studentIds.length > 0
                    ? supabase.from('attendance').select('student_id, status').in('student_id', studentIds).gte('date', start).lte('date', end)
                    : Promise.resolve({ data: [] }),
            ]);
            return { exams: examsRes.data || [], attendance: attRes.data || [] };
        };

        const [current, previous] = await Promise.all([fetchPeriod(cur.start, cur.end), fetchPeriod(prev.start, prev.end)]);

        const summarizeExams = (exams: { exam_type: string | null; pages_count: number | null }[]) => ({
            examsCount: exams.length,
            pagesSum: exams.reduce((s, e) => s + (Number(e.pages_count) || 0), 0),
        });

        const summarize = (period: typeof current, groupStudentIds: string[]) => {
            const exams = period.exams.filter((e) => groupStudentIds.includes(e.student_id as string));
            const newExams = exams.filter((e) => e.exam_type?.trim() === 'جديد');
            const pastExams = exams.filter((e) => e.exam_type?.trim() === 'ماضي قريب' || e.exam_type?.trim() === 'ماضي بعيد');
            const attendance = period.attendance.filter((a) => groupStudentIds.includes(a.student_id as string));
            const present = attendance.filter((a) => a.status === 'present').length;
            const absent = attendance.filter((a) => a.status === 'absent').length;
            const attendanceRate = (present + absent) > 0 ? Math.round((present / (present + absent)) * 100) : null;
            return {
                all: summarizeExams(exams),
                new: summarizeExams(newExams),
                past: summarizeExams(pastExams),
                attendanceRate,
            };
        };

        const result = groups.map((g) => {
            const groupStudentIds = activeStudents.filter((s) => s.group_id === g.id).map((s) => s.id);
            return {
                id: g.id,
                name: g.name,
                teacherName: g.teacher_id ? teacherNameMap.get(g.teacher_id) || '' : '',
                studentsCount: groupStudentIds.length,
                current: summarize(current, groupStudentIds),
                previous: summarize(previous, groupStudentIds),
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

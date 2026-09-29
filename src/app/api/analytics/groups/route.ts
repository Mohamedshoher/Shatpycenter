import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';
import { getMonthRange, getPreviousMonthKey } from '@/lib/month-range';

// أداء كل مجموعة (صفحات الاختبارات، عدد الاختبارات، نسبة الحضور) بين الشهر المختار والشهر السابق له.
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

        // نجلب سجلات الشهر كاملة (بلا فلترة .in() بأعداد طلاب كبيرة قد تُطيل الرابط وتفشل بصمت)
        // ثم نُصفّي حسب طلاب كل مجموعة في summarize أدناه.
        const studentIdSet = new Set(studentIds);
        const fetchPeriod = async (start: string, end: string) => {
            const [examsRes, attRes] = await Promise.all([
                supabase.from('exams').select('student_id, pages_count, lines_count').gte('date', start).lte('date', end),
                supabase.from('attendance').select('student_id, status').gte('date', start).lte('date', end),
            ]);
            if (examsRes.error) console.error('analytics/groups exams error:', examsRes.error.message);
            if (attRes.error) console.error('analytics/groups attendance error:', attRes.error.message);
            return {
                exams: (examsRes.data || []).filter((e) => studentIdSet.has(e.student_id as string)),
                attendance: (attRes.data || []).filter((a) => studentIdSet.has(a.student_id as string)),
            };
        };

        const [current, previous] = await Promise.all([fetchPeriod(cur.start, cur.end), fetchPeriod(prev.start, prev.end)]);

        const summarize = (period: typeof current, groupStudentIds: string[]) => {
            const exams = period.exams.filter((e) => groupStudentIds.includes(e.student_id as string));
            const attendance = period.attendance.filter((a) => groupStudentIds.includes(a.student_id as string));
            const pagesSum = exams.reduce((s, e) => s + (Number(e.pages_count) || 0), 0);
            const linesSum = exams.reduce((s, e) => s + (Number(e.lines_count) || 0), 0);
            const present = attendance.filter((a) => a.status === 'present').length;
            const absent = attendance.filter((a) => a.status === 'absent').length;
            const attendanceRate = (present + absent) > 0 ? Math.round((present / (present + absent)) * 100) : null;
            return { examsCount: exams.length, pagesSum, linesSum, attendanceRate };
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

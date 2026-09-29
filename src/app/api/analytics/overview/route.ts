import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';
import { getMonthRange, getPreviousMonthKey } from '@/lib/month-range';

// مؤشرات عامة للمركز (اختبارات/حضور/تحصيل) لشهر مختار مقارنة بالشهر السابق له مباشرة.
// النطاق يُحصر حسب دور المستخدم: مدرس يرى مجموعاته فقط، مشرف يرى أقسامه، مدير يرى الكل.
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

        // نطاق المجموعات المتاحة لهذا المستخدم
        let groupsQuery = supabase.from('groups').select('id, teacher_id, name');
        if (session.role === 'teacher' && session.teacherId) {
            groupsQuery = groupsQuery.eq('teacher_id', session.teacherId);
        }
        const { data: allGroups } = await groupsQuery;
        let scopedGroups = allGroups || [];
        if (session.role === 'supervisor') {
            const sections = session.responsibleSections || [];
            scopedGroups = scopedGroups.filter((g) => sections.some((s) => (g.name || '').includes(s)));
        }
        const groupIds = scopedGroups.map((g) => g.id);

        const { data: students } = groupIds.length > 0
            ? await supabase.from('students').select('id, group_id, status, monthly_amount, enrollment_date, archived_date').in('group_id', groupIds)
            : { data: [] as { id: string; group_id: string | null; status: string | null; monthly_amount: number | null; enrollment_date: string | null; archived_date: string | null }[] };
        const studentIds = (students || []).map((s) => s.id);

        const fetchPeriod = async (start: string, end: string) => {
            const [examsRes, attRes, feesRes] = await Promise.all([
                studentIds.length > 0
                    ? supabase.from('exams').select('student_id, pages_count, lines_count').in('student_id', studentIds).gte('date', start).lte('date', end)
                    : Promise.resolve({ data: [] }),
                studentIds.length > 0
                    ? supabase.from('attendance').select('status').in('student_id', studentIds).gte('date', start).lte('date', end)
                    : Promise.resolve({ data: [] }),
                studentIds.length > 0
                    ? supabase.from('fees').select('amount').in('student_id', studentIds).gte('date', start).lte('date', end)
                    : Promise.resolve({ data: [] }),
            ]);

            const exams = examsRes.data || [];
            const attendance = attRes.data || [];
            const fees = feesRes.data || [];

            const examsCount = exams.length;
            const pagesSum = exams.reduce((s, e) => s + (Number(e.pages_count) || 0), 0);
            const linesSum = exams.reduce((s, e) => s + (Number(e.lines_count) || 0), 0);
            const notTestedCount = studentIds.filter((id) => !exams.some((e) => e.student_id === id)).length;

            const presentCount = attendance.filter((a) => a.status === 'present').length;
            const absentCount = attendance.filter((a) => a.status === 'absent').length;
            const attendanceRate = (presentCount + absentCount) > 0 ? Math.round((presentCount / (presentCount + absentCount)) * 100) : null;

            const collected = fees.reduce((s, f) => s + (Number(f.amount) || 0), 0);
            const monthTag = start.slice(0, 7);
            const expected = (students || [])
                .filter((s) => {
                    const isArchivedAfter = s.status === 'archived' && s.archived_date && s.archived_date.slice(0, 7) > monthTag;
                    const isMember = s.status !== 'archived' || isArchivedAfter;
                    const enrolledInTime = s.enrollment_date && s.enrollment_date.slice(0, 7) <= monthTag;
                    return isMember && enrolledInTime;
                })
                .reduce((s, st) => s + (Number(st.monthly_amount) || 0), 0);
            const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : null;

            return { examsCount, pagesSum, linesSum, notTestedCount, attendanceRate, collected, expected, collectionRate };
        };

        const [current, previous] = await Promise.all([fetchPeriod(cur.start, cur.end), fetchPeriod(prev.start, prev.end)]);

        return NextResponse.json({ monthKey, prevMonthKey, totalStudents: studentIds.length, current, previous });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

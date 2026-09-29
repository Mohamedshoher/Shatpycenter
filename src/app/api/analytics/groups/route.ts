import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';
import { getMonthRange, getPreviousMonthKey } from '@/lib/month-range';

// أداء كل مجموعة (صفحات الاختبارات بأنواعها، نسبة عدم الاختبار، نسبة الانصراف، نسبة الحضور)
// بين الشهر المختار والشهر السابق له.
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

        const [{ data: teachers }, { data: allStudents }] = await Promise.all([
            teacherIds.length > 0 ? supabase.from('teachers').select('id, full_name').in('id', teacherIds) : Promise.resolve({ data: [] }),
            supabase.from('students').select('id, group_id, status, archived_date').in('group_id', groupIds),
        ]);
        const teacherNameMap = new Map((teachers || []).map((t) => [t.id, t.full_name]));
        const students = allStudents || [];
        const activeStudents = students.filter((s) => s.status === 'active');
        const studentIdSet = new Set(activeStudents.map((s) => s.id));

        // نجلب سجلات الشهر كاملة (بلا فلترة .in() بأعداد طلاب كبيرة قد تُطيل الرابط وتفشل بصمت)
        // ثم نُصفّي حسب طلاب كل مجموعة في summarize أدناه.
        const fetchPeriod = async (start: string, end: string) => {
            const [examsRes, attRes] = await Promise.all([
                supabase.from('exams').select('student_id, exam_type, pages_count, lines_count').gte('date', start).lte('date', end),
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

        // كل 15 سطر = صفحة، حتى تظهر مجموعات التلقين (المقاسة بالأسطر) بنفس وحدة الصفحات
        const toPages = (rows: { pages_count: number | null; lines_count: number | null }[]) =>
            Math.round(rows.reduce((s, e) => s + (Number(e.pages_count) || 0) + (Number(e.lines_count) || 0) / 15, 0));

        const summarize = (period: typeof current, group: { id: string }, groupActiveIds: string[], start: string, end: string) => {
            const exams = period.exams.filter((e) => groupActiveIds.includes(e.student_id as string));
            const attendance = period.attendance.filter((a) => groupActiveIds.includes(a.student_id as string));

            const newExams = exams.filter((e) => e.exam_type?.trim() === 'جديد');
            const nearExams = exams.filter((e) => e.exam_type?.trim() === 'ماضي قريب');
            const farExams = exams.filter((e) => e.exam_type?.trim() === 'ماضي بعيد');

            const pagesSum = toPages(exams);
            const newPages = toPages(newExams);
            const nearPages = toPages(nearExams);
            const farPages = toPages(farExams);

            const present = attendance.filter((a) => a.status === 'present').length;
            const absent = attendance.filter((a) => a.status === 'absent').length;
            const attendanceRate = (present + absent) > 0 ? Math.round((present / (present + absent)) * 100) : null;

            const testedIds = new Set(exams.map((e) => e.student_id));
            const notTestedCount = groupActiveIds.filter((id) => !testedIds.has(id)).length;
            const notTestedRate = groupActiveIds.length > 0 ? Math.round((notTestedCount / groupActiveIds.length) * 100) : null;

            // الطلاب اللي انصرفوا من المركز خلال هذه الفترة (تحوّلوا من نشط إلى أرشيف بتاريخ داخل الفترة)
            const withdrawnCount = students.filter((s) =>
                s.group_id === group.id && s.status === 'archived' && s.archived_date && s.archived_date >= start && s.archived_date <= end
            ).length;
            const withdrawnBase = groupActiveIds.length + withdrawnCount;
            const withdrawnRate = withdrawnBase > 0 ? Math.round((withdrawnCount / withdrawnBase) * 100) : null;

            return { examsCount: exams.length, pagesSum, newPages, nearPages, farPages, notTestedRate, withdrawnRate, attendanceRate };
        };

        const result = groups.map((g) => {
            const groupActiveIds = activeStudents.filter((s) => s.group_id === g.id).map((s) => s.id);
            return {
                id: g.id,
                name: g.name,
                teacherName: g.teacher_id ? teacherNameMap.get(g.teacher_id) || '' : '',
                studentsCount: groupActiveIds.length,
                current: summarize(current, g, groupActiveIds, cur.start, cur.end),
                previous: summarize(previous, g, groupActiveIds, prev.start, prev.end),
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

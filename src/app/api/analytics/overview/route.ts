import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';
import { getMonthRange, getPreviousMonthKey } from '@/lib/month-range';

// مؤشرات عامة للمركز (اختبارات/حضور/تحصيل) لشهر مختار مقارنة بالشهر السابق له مباشرة.
// النطاق يُحصر حسب دور المستخدم: مدرس يرى مجموعاته فقط، مشرف يرى أقسامه، مدير يرى الكل.
//
// ملحوظة: نتجنّب فلترة استعلامات exams/attendance/fees بـ .in('student_id', [...])
// عندما تكون القائمة كبيرة (مئات الطلاب عند المدير)، لأن ذلك يُنتج رابط طلب طويل جداً
// قد يفشل بصمت. بدلاً من ذلك نجلب كل سجلات الشهر (نطاق محدود بالتاريخ) ونُصفّي في الكود.
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
        const { data: allGroups, error: groupsError } = await groupsQuery;
        if (groupsError) console.error('analytics/overview groups error:', groupsError.message);
        let scopedGroups = allGroups || [];
        if (session.role === 'supervisor') {
            const sections = session.responsibleSections || [];
            scopedGroups = scopedGroups.filter((g) => sections.some((s) => (g.name || '').includes(s)));
        }
        const groupIds = scopedGroups.map((g) => g.id);

        const { data: allStudents, error: studentsError } = groupIds.length > 0
            ? await supabase.from('students').select('id, group_id, status, monthly_amount, enrollment_date, archived_date').in('group_id', groupIds)
            : { data: [] as { id: string; group_id: string | null; status: string | null; monthly_amount: number | null; enrollment_date: string | null; archived_date: string | null }[], error: null };
        if (studentsError) console.error('analytics/overview students error:', studentsError.message);

        const students = allStudents || [];
        const activeStudentIds = new Set(students.filter((s) => s.status === 'active').map((s) => s.id));
        const scopedStudentIds = new Set(students.map((s) => s.id));

        const fetchPeriod = async (start: string, end: string) => {
            const [examsRes, attRes, feesRes] = await Promise.all([
                supabase.from('exams').select('student_id, pages_count, lines_count').gte('date', start).lte('date', end),
                supabase.from('attendance').select('student_id, status').gte('date', start).lte('date', end),
                supabase.from('fees').select('student_id, amount').gte('date', start).lte('date', end),
            ]);
            if (examsRes.error) console.error('analytics/overview exams error:', examsRes.error.message);
            if (attRes.error) console.error('analytics/overview attendance error:', attRes.error.message);
            if (feesRes.error) console.error('analytics/overview fees error:', feesRes.error.message);

            const exams = (examsRes.data || []).filter((e) => activeStudentIds.has(e.student_id as string));
            const attendance = (attRes.data || []).filter((a) => activeStudentIds.has(a.student_id as string));
            const fees = (feesRes.data || []).filter((f) => scopedStudentIds.has(f.student_id as string));

            const examsCount = exams.length;
            const rawPages = exams.reduce((s, e) => s + (Number(e.pages_count) || 0), 0);
            const rawLines = exams.reduce((s, e) => s + (Number(e.lines_count) || 0), 0);
            // كل 15 سطر = صفحة، حتى تظهر مجموعات التلقين (المقاسة بالأسطر) بنفس وحدة الصفحات
            const pagesSum = Math.round(rawPages + rawLines / 15);
            const testedIds = new Set(exams.map((e) => e.student_id));
            const notTestedCount = [...activeStudentIds].filter((id) => !testedIds.has(id)).length;

            const presentCount = attendance.filter((a) => a.status === 'present').length;
            const absentCount = attendance.filter((a) => a.status === 'absent').length;
            const attendanceRate = (presentCount + absentCount) > 0 ? Math.round((presentCount / (presentCount + absentCount)) * 100) : null;

            const collected = fees.reduce((s, f) => s + (Number(f.amount) || 0), 0);
            const monthTag = start.slice(0, 7);
            const expected = students
                .filter((s) => {
                    const isArchivedAfter = s.status === 'archived' && s.archived_date && s.archived_date.slice(0, 7) > monthTag;
                    const isMember = s.status !== 'archived' || isArchivedAfter;
                    const enrolledInTime = s.enrollment_date && s.enrollment_date.slice(0, 7) <= monthTag;
                    return isMember && enrolledInTime;
                })
                .reduce((s, st) => s + (Number(st.monthly_amount) || 0), 0);
            const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : null;

            return { examsCount, pagesSum, notTestedCount, attendanceRate, collected, expected, collectionRate };
        };

        const [current, previous] = await Promise.all([fetchPeriod(cur.start, cur.end), fetchPeriod(prev.start, prev.end)]);

        return NextResponse.json({ monthKey, prevMonthKey, totalStudents: activeStudentIds.size, current, previous });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

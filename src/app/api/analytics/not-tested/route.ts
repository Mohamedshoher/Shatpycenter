import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';
import { getMonthRange } from '@/lib/month-range';

// قائمة الطلاب النشطين الذين لم يسجَّل لهم أي اختبار خلال الشهر المختار (أي نوع اختبار).
// نفس منطق notTestedCount في /api/analytics/overview، لكن بالتفصيل (كل طالب باسمه ومجموعته).
export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const monthKey = searchParams.get('month');
        if (!monthKey) return NextResponse.json({ error: 'month required' }, { status: 400 });
        const { start, end } = getMonthRange(monthKey);

        const supabase = createServerSupabase();

        let groupsQuery = supabase.from('groups').select('id, name, teacher_id');
        if (session.role === 'teacher' && session.teacherId) {
            groupsQuery = groupsQuery.eq('teacher_id', session.teacherId);
        }
        const { data: allGroups, error: groupsError } = await groupsQuery;
        if (groupsError) console.error('analytics/not-tested groups error:', groupsError.message);
        let scopedGroups = allGroups || [];
        if (session.role === 'supervisor') {
            const sections = session.responsibleSections || [];
            scopedGroups = scopedGroups.filter((g) => sections.some((s) => (g.name || '').includes(s)));
        }
        const groupIds = scopedGroups.map((g) => g.id);
        const groupNameMap = new Map(scopedGroups.map((g) => [g.id, g.name]));

        if (groupIds.length === 0) return NextResponse.json([]);

        const { data: allStudents, error: studentsError } = await supabase
            .from('students')
            .select('id, full_name, group_id, status')
            .in('group_id', groupIds);
        if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 });

        const activeStudents = (allStudents || []).filter((s) => s.status === 'active');

        const { data: examsData, error: examsError } = await supabase
            .from('exams')
            .select('student_id')
            .gte('date', start)
            .lte('date', end);
        if (examsError) return NextResponse.json({ error: examsError.message }, { status: 500 });

        const testedIds = new Set((examsData || []).map((e) => e.student_id));

        const notTested = activeStudents
            .filter((s) => !testedIds.has(s.id))
            .map((s) => ({
                id: s.id,
                fullName: s.full_name,
                groupId: s.group_id,
                groupName: s.group_id ? groupNameMap.get(s.group_id) || 'غير محدد' : 'غير محدد',
            }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));

        return NextResponse.json(notTested);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

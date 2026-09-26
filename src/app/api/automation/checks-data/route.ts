import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';

// ==========================================================
// نقطة نهاية مخصصة لمحرك الأتمتة على المتصفح (automationService.ts).
// تجمع كل الاستعلامات الخام التي كانت تُنفَّذ مباشرة من المتصفح لفحص
// "عدم تسليم التقرير اليومي" و"عدم تسجيل الاختبارات الأسبوعية"، وتُرجعها
// كما هي دون أي تغيير في منطق التحليل (الذي يبقى في automationService.ts).
// ==========================================================

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const supabase = createServerSupabase();

        const { data: teachers, error: teachersError } = await supabase
            .from('teachers')
            .select('id, full_name')
            .eq('status', 'active');
        if (teachersError) return NextResponse.json({ error: teachersError.message }, { status: 500 });

        const teacherIds = (teachers || []).map((t: any) => t.id);
        if (teacherIds.length === 0) {
            return NextResponse.json({ teachers: [], groups: [], deductions: [], attendance: [], teacherAttendance: [], exams: [], students: [] });
        }

        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('id, teacher_id')
            .in('teacher_id', teacherIds);
        if (groupsError) return NextResponse.json({ error: groupsError.message }, { status: 500 });

        const groupIds = (groups || []).map((g: any) => g.id);
        const { data: students, error: studentsError } = groupIds.length > 0
            ? await supabase.from('students').select('id, group_id').in('group_id', groupIds)
            : { data: [], error: null };
        if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 });

        if (type === 'daily-reports') {
            const date = searchParams.get('date');
            if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

            const [dedResult, attResult, teaResult] = await Promise.all([
                supabase.from('deductions').select('teacher_id, reason').in('teacher_id', teacherIds).eq('date', date).eq('applied_by', 'system-automation'),
                supabase.from('attendance').select('student_id').eq('date', date),
                supabase.from('teacher_attendance').select('teacher_id, status').in('teacher_id', teacherIds).eq('date', date),
            ]);

            return NextResponse.json({
                teachers,
                groups,
                students,
                deductions: dedResult.data || [],
                attendance: attResult.data || [],
                teacherAttendance: teaResult.data || [],
            });
        }

        if (type === 'weekly-exams') {
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');
            if (!startDate || !endDate) return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });

            const [examsResult, dedResult] = await Promise.all([
                supabase.from('exams').select('student_id').gte('date', startDate).lte('date', endDate),
                supabase.from('deductions').select('teacher_id, reason').in('teacher_id', teacherIds).gte('date', startDate).lte('date', endDate),
            ]);

            return NextResponse.json({
                teachers,
                groups,
                students,
                exams: examsResult.data || [],
                deductions: dedResult.data || [],
            });
        }

        return NextResponse.json({ error: 'invalid type' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

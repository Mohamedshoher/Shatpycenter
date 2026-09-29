import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';

// السجل الشهري لطالب واحد على مدى عدد شهور معيّن: صفحات كل نوع اختبار
// (جديد / ماضي قريب / ماضي بعيد) على حدة، ونسبة حضوره.
export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const monthsBack = Math.max(1, Math.min(24, parseInt(searchParams.get('months') || '6')));
        if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

        const today = new Date();
        const rangeStart = new Date(today.getFullYear(), today.getMonth() - (monthsBack - 1), 1);
        const startStr = `${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, '0')}-01`;

        const supabase = createServerSupabase();
        const [{ data: exams }, { data: attendance }] = await Promise.all([
            supabase.from('exams').select('date, exam_type, pages_count, lines_count').eq('student_id', studentId).gte('date', startStr),
            supabase.from('attendance').select('date, status').eq('student_id', studentId).gte('date', startStr),
        ]);

        const months: { monthKey: string; label: string }[] = [];
        for (let i = monthsBack - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months.push({ monthKey, label: d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }) });
        }

        const sumType = (rows: { pages_count: number | null }[]) => rows.reduce((s, e) => s + (Number(e.pages_count) || 0), 0);

        const result = months.map(({ monthKey, label }) => {
            const monthExams = (exams || []).filter((e) => (e.date || '').slice(0, 7) === monthKey);
            const monthAttendance = (attendance || []).filter((a) => (a.date || '').slice(0, 7) === monthKey);
            const present = monthAttendance.filter((a) => a.status === 'present').length;
            const absent = monthAttendance.filter((a) => a.status === 'absent').length;

            const newExams = monthExams.filter((e) => e.exam_type?.trim() === 'جديد');
            const nearExams = monthExams.filter((e) => e.exam_type?.trim() === 'ماضي قريب');
            const farExams = monthExams.filter((e) => e.exam_type?.trim() === 'ماضي بعيد');

            return {
                monthKey,
                label,
                examsCount: monthExams.length,
                pagesSum: sumType(monthExams),
                linesSum: monthExams.reduce((s, e) => s + (Number(e.lines_count) || 0), 0),
                newPages: sumType(newExams),
                nearPages: sumType(nearExams),
                farPages: sumType(farExams),
                attendanceRate: (present + absent) > 0 ? Math.round((present / (present + absent)) * 100) : null,
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

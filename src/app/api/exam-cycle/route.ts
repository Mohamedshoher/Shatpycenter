import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';

// توزيع طلاب المجموعة على أيام الأسبوع (السبت→الأربعاء) لدورة الاختبارات.
// كل طالب له يوم ثابت (لا يتغير تلقائياً)، يظل عليه حتى يُنقل يدوياً.
export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const studentIds = searchParams.get('studentIds');

        const supabase = createServerSupabase();
        let query = supabase.from('exam_cycle_assignments').select('student_id, weekday');

        if (studentIds) {
            query = query.in('student_id', studentIds.split(','));
        }

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const assignments = (data || []).map((row) => ({
            studentId: row.student_id,
            weekday: row.weekday,
        }));

        return NextResponse.json(assignments);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireSession(request, ['director', 'supervisor', 'teacher']);
    if (session instanceof NextResponse) return session;

    try {
        const body = await request.json();
        const supabase = createServerSupabase();

        // دعم تعيين دفعة من الطلاب مرة واحدة (توزيع أولي تلقائي على الطلاب الجدد)
        if (Array.isArray(body.items)) {
            const rows = body.items.map((item: { studentId: string; weekday: number }) => ({
                student_id: item.studentId,
                weekday: item.weekday,
            }));
            const { error } = await supabase.from('exam_cycle_assignments').upsert(rows, { onConflict: 'student_id' });
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        const { studentId, weekday } = body;
        if (!studentId || weekday === undefined || weekday === null) {
            return NextResponse.json({ error: 'بيانات التوزيع غير مكتملة' }, { status: 400 });
        }

        const { error } = await supabase
            .from('exam_cycle_assignments')
            .upsert({ student_id: studentId, weekday }, { onConflict: 'student_id' });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

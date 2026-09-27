import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const month = searchParams.get('month');

        const supabase = createServerSupabase();
        let query = supabase.from('free_exemptions').select('id, student_id, student_name, teacher_id, month, amount, exempted_by, created_at');

        if (studentId) query = query.eq('student_id', studentId);
        if (month) query = query.eq('month', month);

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data || []);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const supabase = createServerSupabase();
        const body = await request.json();

        // دعم إدراج دفعة من الإعفاءات مرة واحدة (مثلاً: عفو عن كل شهور طالب متأخر)
        if (Array.isArray(body.items)) {
            const rows = body.items.map((item: { student_id: string; student_name: string; teacher_id: string; month: string; amount: number; exempted_by?: string }) => ({
                student_id: item.student_id,
                student_name: item.student_name,
                teacher_id: item.teacher_id,
                month: item.month,
                amount: item.amount,
                exempted_by: item.exempted_by || 'المدير',
                created_at: new Date().toISOString()
            }));
            const { data, error } = await supabase.from('free_exemptions').insert(rows).select();
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json(data);
        }

        // الحصول على معرف المعلم من مجموعة الطالب
        let teacherId = body.teacher_id;
        if (!teacherId && body.student_id) {
            const { data: student } = await supabase
                .from('students')
                .select('group_id')
                .eq('id', body.student_id)
                .maybeSingle();

            if (student?.group_id) {
                const { data: group } = await supabase
                    .from('groups')
                    .select('teacher_id')
                    .eq('id', student.group_id)
                    .maybeSingle();

                teacherId = group?.teacher_id;
            }
        }

        if (!teacherId) {
            return NextResponse.json({ error: 'لم يتم العثور على المعلم المسؤول عن هذا الطالب' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('free_exemptions')
            .insert([{
                student_id: body.student_id,
                student_name: body.student_name,
                teacher_id: teacherId,
                month: body.month,
                amount: body.amount,
                exempted_by: body.exempted_by || 'المدير',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const studentId = searchParams.get('studentId');
        const month = searchParams.get('month');

        const supabase = createServerSupabase();

        if (id) {
            const { error } = await supabase.from('free_exemptions').delete().eq('id', id);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        if (studentId && month) {
            const { error } = await supabase.from('free_exemptions').delete().eq('student_id', studentId).eq('month', month);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'id or (studentId and month) required' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');

        const supabase = createServerSupabase();
        let query = supabase.from('free_exemptions').select('*');

        if (studentId) query = query.eq('student_id', studentId);

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const body = await request.json();

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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const supabase = createServerSupabase();
        const { error } = await supabase.from('free_exemptions').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';
import { Group } from '@/types';

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');
        const id = searchParams.get('id');

        const supabase = createServerSupabase();
        const buildQuery = (cols: string) => {
            let q = supabase.from('groups').select(cols).order('name', { ascending: true });
            if (teacherId) q = q.eq('teacher_id', teacherId);
            if (id) q = q.eq('id', id);
            return q;
        };

        let { data, error } = await buildQuery('id, name, teacher_id, schedule, max_students_per_hour, hours');

        // إذا كان عمود "hours" غير موجود بعد في قاعدة البيانات، نعيد الاستعلام بدونه
        if (error) {
            ({ data, error } = await buildQuery('id, name, teacher_id, schedule, max_students_per_hour'));
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        type GroupRow = {
            id: string;
            name: string;
            teacher_id: string | null;
            schedule: string | null;
            max_students_per_hour: number | null;
            hours?: number | null;
        };
        const groups: Group[] = ((data || []) as unknown as GroupRow[]).map((row) => ({
            id: row.id,
            name: row.name,
            teacherId: row.teacher_id,
            schedule: row.schedule || '',
            maxStudentsPerHour: row.max_students_per_hour || 5,
            hours: Number(row.hours) || 4,
            students: [],
        })) as unknown as Group[];

        return NextResponse.json(groups);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireSession(request, ['director', 'supervisor']);
    if (session instanceof NextResponse) return session;

    try {
        const body = await request.json();
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('groups')
            .insert([{
                name: body.name,
                teacher_id: body.teacherId,
                schedule: body.schedule,
                max_students_per_hour: body.maxStudentsPerHour || 5,
                hours: body.hours || 4,
            }])
            .select('id')
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ id: data.id });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const session = await requireSession(request, ['director', 'supervisor']);
    if (session instanceof NextResponse) return session;

    try {
        const { id, ...body } = await request.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const updates: Record<string, unknown> = {};
        if (body.name) updates.name = body.name;
        if (body.teacherId !== undefined) updates.teacher_id = body.teacherId;
        if (body.schedule) updates.schedule = body.schedule;
        if (body.maxStudentsPerHour !== undefined) updates.max_students_per_hour = body.maxStudentsPerHour;
        if (body.hours !== undefined) updates.hours = body.hours;

        const supabase = createServerSupabase();
        const { error } = await supabase.from('groups').update(updates).eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const session = await requireSession(request, ['director', 'supervisor']);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const supabase = createServerSupabase();
        // فك ارتباط أي طلاب بالمجموعة قبل حذفها لتجنب قيود المفتاح الخارجي
        const { error: unlinkError } = await supabase.from('students').update({ group_id: null }).eq('group_id', id);
        if (unlinkError) console.warn('Warning unlinking students from group:', unlinkError);

        const { error } = await supabase.from('groups').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';
import { fetchAllRows } from '@/lib/fetch-all-rows';

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const studentIds = searchParams.get('studentIds');
        const isCompleted = searchParams.get('isCompleted'); // 'true', 'false', or null

        const supabase = createServerSupabase();

        type GoalRow = {
            id: string;
            student_id: string | null;
            exam_type: string | null;
            title: string | null;
            start_date: string | null;
            end_date: string | null;
            sessions_count: number | null;
            notes: string | null;
            is_completed: boolean | null;
            completed_by: string | null;
            completed_at: string | null;
        };
        let data: GoalRow[];
        try {
            data = await fetchAllRows<GoalRow>((from, to) => {
                let query = supabase.from('exam_goals').select('id, student_id, exam_type, title, start_date, end_date, sessions_count, notes, is_completed, completed_by, completed_at').order('created_at', { ascending: true }).range(from, to);
                if (studentIds) {
                    const ids = studentIds.split(',');
                    query = query.in('student_id', ids);
                }
                if (isCompleted === 'true') {
                    query = query.eq('is_completed', true);
                } else if (isCompleted === 'false') {
                    query = query.eq('is_completed', false);
                }
                return query;
            });
        } catch (error) {
            return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
        }

        const goals = (data || []).map((row) => ({
            id: row.id,
            studentId: row.student_id,
            examType: row.exam_type,
            title: row.title,
            startDate: row.start_date,
            endDate: row.end_date,
            sessionsCount: row.sessions_count ?? undefined,
            notes: row.notes || '',
            isCompleted: row.is_completed ?? false,
            completedBy: row.completed_by ?? undefined,
            completedAt: row.completed_at ?? undefined,
        }));

        return NextResponse.json(goals);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const goal = await request.json();
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('exam_goals')
            .insert([{
                student_id: goal.studentId,
                exam_type: goal.examType,
                title: goal.title,
                start_date: goal.startDate,
                end_date: goal.endDate,
                sessions_count: goal.sessionsCount ?? null,
                notes: goal.notes || '',
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
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { id, ...updates } = await request.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const payload: Record<string, unknown> = {};
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.examType !== undefined) payload.exam_type = updates.examType;
        if (updates.startDate !== undefined) payload.start_date = updates.startDate;
        if (updates.endDate !== undefined) payload.end_date = updates.endDate;
        if (updates.sessionsCount !== undefined) payload.sessions_count = updates.sessionsCount ?? null;
        if (updates.notes !== undefined) payload.notes = updates.notes;
        if (updates.isCompleted !== undefined) payload.is_completed = updates.isCompleted;
        if (updates.completedBy !== undefined) payload.completed_by = updates.completedBy;
        if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;
        payload.updated_at = new Date().toISOString();

        const supabase = createServerSupabase();
        const { error } = await supabase.from('exam_goals').update(payload).eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
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
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const supabase = createServerSupabase();
        const { error } = await supabase.from('exam_goals').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

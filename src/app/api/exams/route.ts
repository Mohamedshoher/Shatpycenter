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
        const monthKey = searchParams.get('monthKey');
        const periodHalf = searchParams.get('periodHalf');
        const studentIds = searchParams.get('studentIds');

        const supabase = createServerSupabase();

        type ExamRow = {
            id: string;
            student_id: string | null;
            surah: string | null;
            exam_type: string | null;
            grade: string | null;
            date: string | null;
            created_at: string;
            goal_id: string | null;
            pages_count: number | null;
            lines_count: number | null;
        };
        let data: ExamRow[];
        try {
            data = await fetchAllRows<ExamRow>((from, to) => {
                let query = supabase
                    .from('exams')
                    .select('id, student_id, surah, exam_type, grade, date, created_at, goal_id, pages_count, lines_count')
                    .range(from, to);

                if (monthKey) {
                    if (periodHalf === '1') {
                        query = query.gte('date', `${monthKey}-01`).lte('date', `${monthKey}-15`);
                    } else if (periodHalf === '2') {
                        const [y, m] = monthKey.split('-').map(Number);
                        const lastDay = new Date(y, m, 0).getDate();
                        query = query.gte('date', `${monthKey}-16`).lte('date', `${monthKey}-${lastDay}`);
                    } else {
                        const [y, m] = monthKey.split('-').map(Number);
                        const lastDay = new Date(y, m, 0).getDate();
                        query = query.gte('date', `${monthKey}-01`).lte('date', `${monthKey}-${lastDay}`);
                    }
                }

                if (studentIds) {
                    const ids = studentIds.split(',');
                    query = query.in('student_id', ids);
                }

                return query;
            });
        } catch (error) {
            return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
        }

        const exams = (data || []).map((row) => ({
            id: row.id,
            studentId: row.student_id,
            surah: row.surah,
            type: row.exam_type,
            grade: row.grade,
            date: row.date,
            goalId: row.goal_id ?? null,
            pagesCount: row.pages_count ?? null,
            linesCount: row.lines_count ?? null,
            notes: '',
            timestamp: new Date(row.created_at).getTime()
        }));

        return NextResponse.json(exams);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const record = await request.json();
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('exams')
            .insert([{
                student_id: record.studentId,
                surah: record.surah,
                exam_type: record.type,
                grade: record.grade,
                date: record.date,
                goal_id: record.goalId ?? null,
                pages_count: record.pagesCount ?? null,
                lines_count: record.linesCount ?? null
            }])
            .select('id, created_at')
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { id, ...data } = await request.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const updates: Record<string, unknown> = {};
        if (data.surah) updates.surah = data.surah;
        if (data.grade) updates.grade = data.grade;
        if (data.type) updates.exam_type = data.type;

        const supabase = createServerSupabase();
        const { error } = await supabase.from('exams').update(updates).eq('id', id);
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
        const { error } = await supabase.from('exams').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const monthKey = searchParams.get('monthKey');
        const periodHalf = searchParams.get('periodHalf');
        const studentIds = searchParams.get('studentIds');

        const supabase = createServerSupabase();
        let query = supabase.from('exams').select('id, student_id, surah, exam_type, grade, date, created_at, goal_id');

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

        query = query.limit(10000);

        const { data, error } = await query;
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const exams = (data || []).map((row: any) => ({
            id: row.id,
            studentId: row.student_id,
            surah: row.surah,
            type: row.exam_type,
            grade: row.grade,
            date: row.date,
            goalId: row.goal_id ?? null,
            notes: '',
            timestamp: new Date(row.created_at).getTime()
        }));

        return NextResponse.json(exams);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

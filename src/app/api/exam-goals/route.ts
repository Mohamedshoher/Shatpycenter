import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const studentIds = searchParams.get('studentIds');
        const isCompleted = searchParams.get('isCompleted'); // 'true', 'false', or null

        const supabase = createServerSupabase();
        let query = supabase.from('exam_goals').select('*');

        if (studentIds) {
            const ids = studentIds.split(',');
            query = query.in('student_id', ids);
        }

        if (isCompleted === 'true') {
            query = query.eq('is_completed', true);
        } else if (isCompleted === 'false') {
            query = query.eq('is_completed', false);
        }

        query = query.limit(10000);

        const { data, error } = await query;
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const goals = (data || []).map((row: any) => ({
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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

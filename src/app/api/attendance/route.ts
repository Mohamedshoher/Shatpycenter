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
        const studentId = searchParams.get('studentId');
        const date = searchParams.get('date');
        const sinceDate = searchParams.get('sinceDate');
        const studentIds = searchParams.get('studentIds');

        const supabase = createServerSupabase();

        if (sinceDate) {
            try {
                const data = await fetchAllRows((from, to) => {
                    let query = supabase
                        .from('attendance')
                        .select('student_id, date, status')
                        .gte('date', sinceDate);
                    if (studentIds) {
                        query = query.in('student_id', studentIds.split(','));
                    }
                    return query.order('date', { ascending: false }).range(from, to);
                });
                return NextResponse.json(data);
            } catch (error) {
                return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
            }
        }

        if (date) {
            const { data, error } = await supabase
                .from('attendance')
                .select('id, student_id, date, status, created_at')
                .eq('date', date);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });

            return NextResponse.json(data || []);
        }

        if (monthKey) {
            const [year, month] = monthKey.split('-').map(Number);
            const startDate = `${monthKey}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

            try {
                const data = await fetchAllRows((from, to) =>
                    supabase
                        .from('attendance')
                        .select('id, student_id, date, status, created_at')
                        .or(`month_key.eq.${monthKey},and(date.gte.${startDate},date.lte.${endDate})`)
                        .order('created_at', { ascending: true })
                        .range(from, to)
                );
                return NextResponse.json(data);
            } catch (error) {
                return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
            }
        }

        if (studentId) {
            try {
                const data = await fetchAllRows((from, to) =>
                    supabase
                        .from('attendance')
                        .select('id, student_id, date, month_key, status, created_at')
                        .eq('student_id', studentId)
                        .order('created_at', { ascending: false })
                        .range(from, to)
                );
                return NextResponse.json(data);
            } catch (error) {
                return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
            }
        }

        return NextResponse.json([]);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { studentId, status, day, month } = await request.json();
        if (!studentId || !status || !day || !month) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (!['present', 'absent'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        const dateStr = `${month}-${String(day).padStart(2, '0')}`;

        const { data, error } = await supabase
            .from('attendance')
            .upsert(
                { student_id: studentId, date: dateStr, month_key: month, status },
                { onConflict: 'student_id,date' }
            )
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, record: data }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const monthKey = searchParams.get('monthKey');
        const studentId = searchParams.get('studentId');

        const supabase = createServerSupabase();

        if (monthKey) {
            const [year, month] = monthKey.split('-').map(Number);
            const startDate = `${monthKey}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

            const { data, error } = await supabase
                .from('attendance')
                .select('id, student_id, date, status, created_at')
                .or(`month_key.eq.${monthKey},and(date.gte.${startDate},date.lte.${endDate})`)
                .order('created_at', { ascending: true })
                .limit(30000);

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });

            return NextResponse.json(data || []);
        }

        if (studentId) {
            const { data, error } = await supabase
                .from('attendance')
                .select('id, student_id, date, month_key, status, created_at')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false });

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });

            return NextResponse.json(data || []);
        }

        return NextResponse.json([]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
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
        const { error: deleteError } = await supabase
            .from('attendance')
            .delete()
            .eq('student_id', studentId)
            .eq('date', dateStr);
        if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

        const { data, error } = await supabase
            .from('attendance')
            .insert([{ student_id: studentId, date: dateStr, month_key: month, status }])
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, record: data }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

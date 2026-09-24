import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const monthKey = searchParams.get('monthKey');
        const teacherId = searchParams.get('teacherId');

        if (!monthKey) return NextResponse.json({ error: 'monthKey required' }, { status: 400 });

        const [year, month] = monthKey.split('-');
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const supabase = createServerSupabase();
        let query = supabase
            .from('teacher_attendance')
            .select('teacher_id, date, status')
            .gte('date', `${monthKey}-01`)
            .lte('date', `${monthKey}-${lastDay}`);

        if (teacherId) query = query.eq('teacher_id', teacherId);

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { teacherId, date, status, notes } = await request.json();
        if (!teacherId || !date || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        await supabase.from('teacher_attendance').delete().eq('teacher_id', teacherId).eq('date', date);

        const { error } = await supabase
            .from('teacher_attendance')
            .insert({ teacher_id: teacherId, date, status, notes: notes || null });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

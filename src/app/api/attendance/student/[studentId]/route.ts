import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const { pathname } = new URL(request.url);
        const segments = pathname.split('/');
        const studentId = segments[segments.length - 2]; // /api/attendance/student/[studentId]

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('attendance')
            .select('id, student_id, date, month_key, status, created_at')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

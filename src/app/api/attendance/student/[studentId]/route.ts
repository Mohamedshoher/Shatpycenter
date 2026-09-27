import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

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
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

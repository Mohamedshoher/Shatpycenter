import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const studentIdsParam = searchParams.get('studentIds');

        if (!studentIdsParam) {
            return NextResponse.json({ fees: [], attendance: [], exemptions: [] });
        }

        const studentIds = studentIdsParam.split(',').filter(Boolean);
        if (studentIds.length === 0) {
            return NextResponse.json({ fees: [], attendance: [], exemptions: [] });
        }

        const supabase = createServerSupabase();

        // 1. Fees
        type FeeRow = { id: string; student_id: string | null; month: string | null; amount: number | null; date: string | null; created_by: string | null };
        let allFees: FeeRow[] = [];
        const chunkSize = 100;
        for (let i = 0; i < studentIds.length; i += chunkSize) {
            const chunk = studentIds.slice(i, i + chunkSize);
            let from = 0;
            const step = 1000;
            while (true) {
                const { data, error } = await supabase
                    .from('fees')
                    .select('id, student_id, month, amount, date, created_by')
                    .in('student_id', chunk)
                    .range(from, from + step - 1);
                if (error || !data || data.length === 0) break;
                allFees = [...allFees, ...data];
                if (data.length < step) break;
                from += step;
            }
        }

        // 2. Attendance
        type AttendanceRow = { student_id: string | null; month_key: string | null; status: string | null; date: string | null };
        let allAttendance: AttendanceRow[] = [];
        for (let i = 0; i < studentIds.length; i += chunkSize) {
            const chunk = studentIds.slice(i, i + chunkSize);
            let from = 0;
            const step = 1000;
            while (true) {
                const { data, error } = await supabase
                    .from('attendance')
                    .select('student_id, month_key, status, date')
                    .in('student_id', chunk)
                    .range(from, from + step - 1);
                if (error || !data || data.length === 0) break;
                allAttendance = [...allAttendance, ...data];
                if (data.length < step) break;
                from += step;
            }
        }

        // 3. Exemptions
        type ExemptionRow = { id: string; student_id: string | null; student_name: string | null; month: string | null; amount: number | null; exempted_by: string | null; created_at: string | null };
        let allExemptions: ExemptionRow[] = [];
        for (let i = 0; i < studentIds.length; i += chunkSize) {
            const chunk = studentIds.slice(i, i + chunkSize);
            const { data } = await supabase
                .from('free_exemptions')
                .select('id, student_id, student_name, month, amount, exempted_by, created_at')
                .in('student_id', chunk);
            if (data) allExemptions = [...allExemptions, ...data];
        }

        return NextResponse.json({
            fees: allFees,
            attendance: allAttendance,
            exemptions: allExemptions,
        });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

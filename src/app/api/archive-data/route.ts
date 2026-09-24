import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
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
        let allFees: any[] = [];
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
        let allAttendance: any[] = [];
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
        let allExemptions: any[] = [];
        for (let i = 0; i < studentIds.length; i += chunkSize) {
            const chunk = studentIds.slice(i, i + chunkSize);
            const { data, error } = await supabase
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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

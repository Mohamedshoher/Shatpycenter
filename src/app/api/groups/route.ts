import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { Group } from '@/types';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');

        const supabase = createServerSupabase();
        const buildQuery = (cols: string) => {
            let q = supabase.from('groups').select(cols).order('name', { ascending: true });
            if (teacherId) q = q.eq('teacher_id', teacherId);
            return q;
        };

        let { data, error } = await buildQuery('id, name, teacher_id, schedule, max_students_per_hour, hours');

        // إذا كان عمود "hours" غير موجود بعد في قاعدة البيانات، نعيد الاستعلام بدونه
        if (error) {
            ({ data, error } = await buildQuery('id, name, teacher_id, schedule, max_students_per_hour'));
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const groups: Group[] = (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            teacherId: row.teacher_id,
            schedule: row.schedule || '',
            maxStudentsPerHour: row.max_students_per_hour || 5,
            hours: Number(row.hours) || 4,
            students: [],
        })) as unknown as Group[];

        return NextResponse.json(groups);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

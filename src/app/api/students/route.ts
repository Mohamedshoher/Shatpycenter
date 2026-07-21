import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { Student } from '@/types';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const groupIds = searchParams.get('groupIds');
        const status = searchParams.get('status');

        const supabase = createServerSupabase();
        const isListView = !searchParams.get('full');
        let query = supabase
            .from('students')
            .select(isListView
                ? 'id, full_name, group_id, parent_phone, status, appointment, monthly_amount, enrollment_date'
                : '*'
            );

        if (groupIds) {
            const ids = groupIds.split(',');
            query = query.in('group_id', ids);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const students: Student[] = (data || []).map((row: any) => ({
            id: row.id,
            fullName: row.full_name,
            groupId: row.group_id,
            parentPhone: row.parent_phone || row.phone || '',
            status: row.status,
            isArchived: row.status === 'archived',
            monthlyAmount: Number(row.monthly_amount) || 0,
            birthDate: row.birth_date || undefined,
            address: row.address || '',
            appointment: row.appointment || '',
            notes: row.notes || '',
            enrollmentDate: row.enrollment_date || (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            archivedDate: row.archived_date || undefined,
            whatsapp: row.parent_phone || row.phone || '',
            email: '',
            password: '',
            role: 'student',
            attendance: [],
            exams: []
        })) as unknown as Student[];

        return NextResponse.json(students);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

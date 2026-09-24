import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { Teacher } from '@/types';

export async function GET(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        let { data, error } = await supabase
            .from('teachers')
            .select('id, full_name, phone, role, accounting_type, salary, partnership_percentage, daily_hours, weekly_working_days, password, responsible_sections, status, created_at');

        // إذا كانت أعمدة ساعات العمل غير موجودة بعد في قاعدة البيانات، نعيد الاستعلام بدونها
        if (error) {
            ({ data, error } = await supabase
                .from('teachers')
                .select('id, full_name, phone, role, accounting_type, salary, partnership_percentage, password, responsible_sections, status, created_at'));
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const teachers: Teacher[] = (data || []).map((row: any) => ({
            id: row.id,
            fullName: row.full_name,
            phone: row.phone,
            email: '',
            role: row.role || 'teacher',
            accountingType: row.accounting_type || 'fixed',
            salary: row.salary || 0,
            partnershipPercentage: row.partnership_percentage || 0,
            dailyHours: Number(row.daily_hours) || 4,
            weeklyWorkingDays: Number(row.weekly_working_days) || 5,
            password: row.password || '',
            responsibleSections: row.responsible_sections || [],
            status: row.status,
            joinDate: row.created_at,
            assignedGroups: []
        })) as Teacher[];

        return NextResponse.json(teachers);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';
import { Teacher } from '@/types';

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('teachers')
            .select('id, full_name, phone, role, accounting_type, salary, partnership_percentage, daily_hours, weekly_working_days, responsible_sections, status, created_at');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // ملاحظة أمنية: لا يُعاد عمود password إطلاقاً في استجابة الـ API.
        const teachers: Teacher[] = (data || []).map((row) => ({
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
            responsibleSections: row.responsible_sections || [],
            status: row.status,
            joinDate: row.created_at,
            assignedGroups: []
        })) as Teacher[];

        return NextResponse.json(teachers);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireSession(request, ['director']);
    if (session instanceof NextResponse) return session;

    try {
        const body = await request.json();
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('teachers')
            .insert([{
                full_name: body.fullName,
                phone: body.phone,
                role: body.role || 'teacher',
                accounting_type: body.accountingType || 'fixed',
                salary: body.salary || 0,
                partnership_percentage: body.partnershipPercentage || 0,
                daily_hours: body.dailyHours || 4,
                weekly_working_days: body.weeklyWorkingDays || 5,
                password: body.password,
                responsible_sections: body.responsibleSections || [],
                status: body.status || 'active'
            }])
            .select('id')
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ id: data.id });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const session = await requireSession(request, ['director']);
    if (session instanceof NextResponse) return session;

    try {
        const { id, ...body } = await request.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const supabase = createServerSupabase();

        // نجلب القيم الحالية للراتب/النسبة قبل التعديل، لإرسال إشعار للمدرس لو اتغيّرت
        const { data: existing } = await supabase.from('teachers').select('salary, partnership_percentage').eq('id', id).single();

        const updates: Record<string, unknown> = {};
        if (body.fullName !== undefined) updates.full_name = body.fullName;
        if (body.phone !== undefined) updates.phone = body.phone;
        if (body.role !== undefined) updates.role = body.role;
        if (body.accountingType !== undefined) updates.accounting_type = body.accountingType;
        if (body.salary !== undefined) updates.salary = body.salary;
        if (body.partnershipPercentage !== undefined) updates.partnership_percentage = body.partnershipPercentage;
        if (body.dailyHours !== undefined) updates.daily_hours = body.dailyHours;
        if (body.weeklyWorkingDays !== undefined) updates.weekly_working_days = body.weeklyWorkingDays;
        // كلمة المرور تُحدَّث فقط إن أُرسلت فعلياً (لا نفرغها بقيمة فارغة)
        if (body.password) updates.password = body.password;
        if (body.responsibleSections !== undefined) updates.responsible_sections = body.responsibleSections;
        if (body.status !== undefined) updates.status = body.status;

        const { error } = await supabase.from('teachers').update(updates).eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // إشعار واضح للمدرس عند تغيير راتبه الثابت أو نسبة شراكته
        if (existing) {
            const oldSalary = Number(existing.salary) || 0;
            const newSalary = body.salary !== undefined ? Number(body.salary) || 0 : oldSalary;
            const oldPercentage = Number(existing.partnership_percentage) || 0;
            const newPercentage = body.partnershipPercentage !== undefined ? Number(body.partnershipPercentage) || 0 : oldPercentage;

            if (newSalary !== oldSalary || newPercentage !== oldPercentage) {
                const message = newSalary !== oldSalary
                    ? `تم تغيير راتبك من ${oldSalary} إلى ${newSalary} جنيه`
                    : `تم تغيير نسبة شراكتك من ${oldPercentage}% إلى ${newPercentage}%`;
                const { error: notifyError } = await supabase.from('notifications').insert([{
                    teacher_id: id,
                    type: 'salary_change',
                    title: 'تغيير الراتب',
                    message,
                    amount: newSalary - oldSalary,
                    related_date: new Date().toISOString().split('T')[0],
                }]);
                if (notifyError) console.error('teachers PUT salary notification error:', notifyError.message);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const session = await requireSession(request, ['director']);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const supabase = createServerSupabase();
        const { error } = await supabase.from('teachers').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

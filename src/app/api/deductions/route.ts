import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');
        const year = searchParams.get('year');
        const month = searchParams.get('month');
        const date = searchParams.get('date');
        const appliedBy = searchParams.get('appliedBy');

        const supabase = createServerSupabase();
        let query = supabase
            .from('deductions')
            .select('*, teachers(full_name)');

        if (teacherId) query = query.eq('teacher_id', teacherId);
        if (date) query = query.eq('date', date);
        if (appliedBy) query = query.eq('applied_by', appliedBy);
        if (year && month) {
            const startDate = `${year}-${String(parseInt(month)).padStart(2, '0')}-01`;
            const nextM = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
            const nextY = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
            const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
            query = query.gte('date', startDate).lt('date', endDate);
        }

        query = query.order('date', { ascending: false });

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data || []);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    // خصم/مكافأة يدوية: للمدير فقط. خصم تلقائي من نظام الأتمتة (appliedBy
    // = 'system-automation'): مسموح لأي مستخدم مسجّل (نفس صلاحية تشغيل
    // صفحة الأتمتة حالياً)، مع تجاهل أي اسم آخر يرسله العميل لمنع التزوير.
    const body = await request.json();
    const isAutomated = body.appliedBy === 'system-automation';
    const session = await requireSession(request, isAutomated ? undefined : ['director']);
    if (session instanceof NextResponse) return session;

    try {
        const { teacherId, amount, reason, customDate } = body;
        if (!teacherId || !amount || !reason) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const dateStr = customDate || new Date().toISOString().split('T')[0];
        const appliedBy = isAutomated ? 'system-automation' : (session.displayName || 'system');
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('deductions')
            .insert([{
                teacher_id: teacherId,
                date: dateStr,
                amount,
                reason,
                applied_by: appliedBy,
                is_automatic: isAutomated,
            }])
            .select('*, teachers(full_name)')
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    // حذف خصم يدوي: للمدير فقط. حذف خصم تلقائي أنشأه نظام الأتمتة (لعكسه
    // عند تصحيح غياب مثلاً): مسموح لأي مستخدم مسجّل، بعد التحقق من السجل
    // نفسه (وليس من كلام العميل) أنه فعلاً خصم تلقائي.
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const supabase = createServerSupabase();
        const { data: existing } = await supabase.from('deductions').select('is_automatic').eq('id', id).maybeSingle();
        if (!existing?.is_automatic && session.role !== 'director') {
            return NextResponse.json({ error: 'لا تملك صلاحية حذف هذا الخصم' }, { status: 403 });
        }

        const { error } = await supabase.from('deductions').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const session = await requireSession(request, ['director']);
    if (session instanceof NextResponse) return session;

    try {
        const { id, status, notes } = await request.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const supabase = createServerSupabase();
        const updates: Record<string, unknown> = {};
        if (status) updates.status = status;
        if (notes !== undefined) updates.notes = notes;

        const { error } = await supabase.from('deductions').update(updates).eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

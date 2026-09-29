import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';

// بنود اتفاق العمل بين الإدارة والمعلمين — قابلة للتعديل من المدير فقط،
// وأي تعديل يُرسل إشعاراً عاماً لكل المعلمين بمراجعة التقرير.
export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('agreement_terms')
            .select('id, order_index, icon, title, content, updated_at, updated_by')
            .order('order_index', { ascending: true });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const terms = (data || []).map((row) => ({
            id: row.id,
            orderIndex: row.order_index,
            icon: row.icon || '',
            title: row.title,
            content: row.content,
            updatedAt: row.updated_at,
            updatedBy: row.updated_by || '',
        }));

        return NextResponse.json(terms);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const session = await requireSession(request, ['director']);
    if (session instanceof NextResponse) return session;

    try {
        const { id, title, content } = await request.json();
        if (!id || !title?.trim() || !content?.trim()) {
            return NextResponse.json({ error: 'بيانات البند غير مكتملة' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        const { error } = await supabase
            .from('agreement_terms')
            .update({
                title: title.trim(),
                content: content.trim(),
                updated_at: new Date().toISOString(),
                updated_by: session.displayName || null,
            })
            .eq('id', id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // إشعار عام لكل المعلمين (teacher_id: null) بمراجعة التقرير
        await supabase.from('notifications').insert([{
            teacher_id: null,
            type: 'system',
            title: 'تحديث في بنود الاتفاق',
            message: `تم تعديل بند "${title.trim()}" في تقرير بنود الاتفاق، رجاء راجع التقرير.`,
        }]);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

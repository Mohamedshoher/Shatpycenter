import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/error-message';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';

// ==========================================================
// ملحوظات المدرّس: نوعان - "عام" يراه المدير والمدرس نفسه، و"خاص" لا يراه إلا المدير.
// التصفية حسب الصلاحية تتم هنا على الخادم فقط (وليس فقط في الواجهة).
// ==========================================================

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');
        if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 });

        const supabase = createServerSupabase();
        let query = supabase
            .from('teacher_notes')
            .select('*')
            .eq('teacher_id', teacherId)
            .order('created_at', { ascending: false });

        if (session.role === 'director') {
            // المدير يرى كل الملحوظات (عامة وخاصة)
        } else if (session.teacherId === teacherId) {
            // المدرّس يرى ملحوظاته الخاصة به فقط من النوع "عام"
            query = query.eq('visibility', 'general');
        } else {
            // أي مستخدم آخر (مدرس تاني، مشرف، سكرتارية) لا يرى شيئاً
            return NextResponse.json([]);
        }

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data || []);
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireSession(request, ['director']);
    if (session instanceof NextResponse) return session;

    try {
        const body = await request.json();
        const { teacherId, content, visibility } = body;
        if (!teacherId || !content) {
            return NextResponse.json({ error: 'teacherId and content required' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('teacher_notes')
            .insert([{
                teacher_id: teacherId,
                content,
                visibility: visibility === 'private' ? 'private' : 'general',
                created_by: session.displayName || 'المدير',
            }])
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
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
        const { error } = await supabase.from('teacher_notes').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

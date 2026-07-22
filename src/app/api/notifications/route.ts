import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');
        const limit = parseInt(searchParams.get('limit') || '20');

        const supabase = createServerSupabase();
        let query = supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (teacherId) {
            query = query.or(`teacher_id.is.null,teacher_id.eq.${teacherId}`);
        }

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const notifications = (data || []).map((row: any) => ({
            id: row.id,
            teacherId: row.teacher_id,
            type: row.type,
            title: row.title,
            message: row.message,
            reason: row.reason || '',
            amount: Number(row.amount) || 0,
            relatedDate: row.related_date || '',
            isRead: row.is_read || false,
            createdAt: row.created_at,
        }));

        return NextResponse.json(notifications);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { teacherId, type, title, message, reason, amount, relatedDate } = body;

        if (!type || !title || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('notifications')
            .insert([{
                teacher_id: teacherId || null,
                type,
                title,
                message,
                reason: reason || '',
                amount: Number(amount) || 0,
                related_date: relatedDate || '',
            }])
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({
            id: data.id,
            teacherId: data.teacher_id,
            type: data.type,
            title: data.title,
            message: data.message,
            reason: data.reason || '',
            amount: Number(data.amount) || 0,
            relatedDate: data.related_date || '',
            isRead: data.is_read || false,
            createdAt: data.created_at,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, all, teacherId } = body;

        const supabase = createServerSupabase();

        if (all && teacherId) {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .or(`teacher_id.is.null,teacher_id.eq.${teacherId}`)
                .eq('is_read', false);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        } else if (id) {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const all = searchParams.get('all');
        const teacherId = searchParams.get('teacherId');

        const supabase = createServerSupabase();

        if (all === 'true' && teacherId) {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .or(`teacher_id.is.null,teacher_id.eq.${teacherId}`);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        } else if (id) {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        } else {
            return NextResponse.json({ error: 'Missing id or all parameter' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

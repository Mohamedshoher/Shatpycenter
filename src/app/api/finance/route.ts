import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth-server';
import { FinancialTransaction } from '@/types';

const mapTransaction = (row: any): FinancialTransaction => ({
    id: row.id,
    amount: Number(row.amount),
    type: row.type,
    category: row.category,
    date: row.date,
    description: row.description,
    relatedUserId: row.related_user_id,
    performedBy: row.performed_by,
    timestamp: new Date(row.created_at).getTime()
});

export async function GET(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');
        const month = searchParams.get('month');
        const type = searchParams.get('type');
        const category = searchParams.get('category');
        const teacherId = searchParams.get('teacherId');

        const supabase = createServerSupabase();
        let query = supabase
            .from('financial_transactions')
            .select('id, amount, type, category, date, description, related_user_id, performed_by, created_at');

        if (year && month) {
            const y = parseInt(year);
            const m = parseInt(month);
            const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
            const nextMonth = m === 12 ? 1 : m + 1;
            const nextYear = m === 12 ? y + 1 : y;
            const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
            query = query.gte('date', startDate).lt('date', endDate);
        }

        if (type) {
            query = query.eq('type', type);
        }

        if (category) {
            query = query.eq('category', category);
        }

        if (teacherId) {
            query = query.eq('related_user_id', teacherId);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const transactions: FinancialTransaction[] = (data || []).map(mapTransaction);
        return NextResponse.json(transactions);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const body = await request.json();
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('financial_transactions')
            .insert([{
                amount: Number(body.amount),
                type: body.type,
                category: body.category,
                date: body.date,
                description: body.description,
                related_user_id: body.relatedUserId ? String(body.relatedUserId).trim() : null,
                performed_by: body.performedBy
            }])
            .select('id')
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ id: data.id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const session = await requireSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const descriptionLike = searchParams.get('descriptionLike');
        const relatedUserId = searchParams.get('relatedUserId');

        const supabase = createServerSupabase();

        if (id) {
            const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        if (descriptionLike || relatedUserId) {
            let query = supabase.from('financial_transactions').delete();
            if (descriptionLike) query = query.ilike('description', `%${descriptionLike}%`);
            if (relatedUserId) query = query.eq('related_user_id', relatedUserId);
            const { error } = await query;
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'id or a filter is required' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

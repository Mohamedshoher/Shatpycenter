import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
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

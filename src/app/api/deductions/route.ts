import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');
        const year = searchParams.get('year');
        const month = searchParams.get('month');

        const supabase = createServerSupabase();
        let query = supabase
            .from('deductions')
            .select('*, teachers(full_name)');

        if (teacherId) query = query.eq('teacher_id', teacherId);
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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { teacherId, amount, reason, appliedBy, customDate } = await request.json();
        if (!teacherId || !amount || !reason) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const dateStr = customDate || new Date().toISOString().split('T')[0];
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('deductions')
            .insert([{ teacher_id: teacherId, date: dateStr, amount, reason, applied_by: appliedBy || 'system' }])
            .select('*, teachers(full_name)')
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const supabase = createServerSupabase();
        const { error } = await supabase.from('deductions').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { id, status, notes } = await request.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const supabase = createServerSupabase();
        const updates: any = {};
        if (status) updates.status = status;
        if (notes !== undefined) updates.notes = notes;

        const { error } = await supabase.from('deductions').update(updates).eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

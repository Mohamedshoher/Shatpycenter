import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const date = searchParams.get('date');

        const supabase = createServerSupabase();
        let query = supabase.from('automation_logs').select('*').order('created_at', { ascending: false }).limit(limit);

        if (date) {
            const dayStart = `${date}T00:00:00`;
            const dayEnd = `${date}T23:59:59.999`;
            query = query.gte('triggered_at', dayStart).lte('triggered_at', dayEnd);
        }

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = createServerSupabase();
        const { data, error } = await supabase.from('automation_logs').insert([body]).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

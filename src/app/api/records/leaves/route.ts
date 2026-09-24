import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .order('created_at', { ascending: false });

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
        const { data, error } = await supabase.from('leave_requests').insert([body]).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { id, status } = await request.json();
        if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

        const supabase = createServerSupabase();
        const { error } = await supabase.from('leave_requests').update({ status }).eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

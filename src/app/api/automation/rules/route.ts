import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = createServerSupabase();
        const { data, error } = await supabase.from('automation_rules').select('*').order('created_at', { ascending: false });
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
        const { data, error } = await supabase.from('automation_rules').insert([body]).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

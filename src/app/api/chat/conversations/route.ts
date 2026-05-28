import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .contains('participant_ids', [userId])
            .order('last_message_at', { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { participantIds } = await request.json();
        if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 2) {
            return NextResponse.json({ error: 'participantIds array with at least 2 ids required' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        const { data: existing } = await supabase
            .from('conversations')
            .select('*')
            .contains('participant_ids', participantIds)
            .limit(1);

        if (existing && existing.length > 0) return NextResponse.json(existing[0]);

        const { data, error } = await supabase
            .from('conversations')
            .insert([{ participant_ids: participantIds, last_message_at: new Date().toISOString() }])
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

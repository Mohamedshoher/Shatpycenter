import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversationId');

        if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { conversationId, senderId, senderName, senderRole, content } = await request.json();
        if (!conversationId || !senderId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('messages')
            .insert([{
                conversation_id: conversationId,
                sender_id: senderId,
                sender_name: senderName || '',
                sender_role: senderRole || '',
                content,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await supabase.from('conversations').update({
            last_message: content,
            last_message_at: new Date().toISOString(),
            last_sender_name: senderName || ''
        }).eq('id', conversationId);

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

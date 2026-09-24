import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createServerSupabase() {
    return createClient(supabaseUrl || '', supabaseKey || '', {
        global: {
            headers: { 'x-client-info': 'shatbi-lms-server' },
        },
    });
}

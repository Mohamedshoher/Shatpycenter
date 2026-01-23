
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Please check your .env.local file.');
} else {
    console.log('✅ Supabase initialized with URL:', supabaseUrl);
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);

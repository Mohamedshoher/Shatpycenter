
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Please check your .env.local file.');
}

// ✨ إعدادات Realtime محسّنة للحصول على أداء فوري
export const supabase = createClient<Database>(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
        realtime: {
            params: {
                eventsPerSecond: 10, // زيادة عدد الأحداث في الثانية
            },
        },
        global: {
            headers: {
                'x-client-info': 'shatbi-lms-v2',
            },
        },
    }
);

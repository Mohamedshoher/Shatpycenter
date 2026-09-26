import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * عميل Supabase على جانب الخادم فقط.
 * يستخدم Service Role Key (يتجاوز RLS بالكامل) لأنه لا يصل أبداً للمتصفح،
 * وكل استدعاء له يمر أولاً عبر requireSession() في الـ route نفسه.
 * إن لم يُضبط SUPABASE_SERVICE_ROLE_KEY بعد، نتراجع مؤقتاً لمفتاح anon
 * (نفس السلوك القديم) حتى لا يتعطل الموقع، مع تحذير واضح في السجلات.
 */
export function createServerSupabase() {
    if (!serviceRoleKey) {
        console.warn(
            '⚠️ SUPABASE_SERVICE_ROLE_KEY غير مضبوط؛ يعمل الخادم مؤقتاً بمفتاح anon العام. ' +
            'اضبط المتغير في بيئة النشر ثم أعد النشر، وإلا فستفشل بعض العمليات بعد إغلاق RLS.'
        );
    }
    return createClient(supabaseUrl || '', serviceRoleKey || anonKey || '', {
        auth: { persistSession: false },
        global: {
            headers: { 'x-client-info': 'shatbi-lms-server' },
        },
    });
}

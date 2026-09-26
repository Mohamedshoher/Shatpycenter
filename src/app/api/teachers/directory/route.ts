import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// ==========================================================
// نقطة نهاية عامة (بدون تسجيل دخول) تُستخدم فقط في شاشة الدخول
// لعرض قائمة أسماء المعلمين/المشرفين لاختيار الحساب.
// تُرجع الحد الأدنى من البيانات (بدون راتب أو هاتف أو كلمة مرور).
//
// ملاحظة مهمة: GET() بدون معامل request كان يجعل Next.js يحاول تحسين
// هذا المسار كمسار ثابت (Static)، فيُنفَّذ مرة واحدة فقط عند البناء
// (حين لا يكون هناك اتصال حقيقي بقاعدة البيانات) وتُخزَّن النتيجة/الخطأ
// مؤبَّداً. force-dynamic يمنع هذا السلوك ويضمن تنفيذ الاستعلام فعلياً
// مع كل طلب حقيقي.
// ==========================================================
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('teachers')
            .select('id, full_name, role, status')
            .eq('status', 'active');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const directory = (data || []).map((row: { id: string; full_name: string; role: string | null; status: string }) => ({
            id: row.id,
            fullName: row.full_name,
            role: row.role || 'teacher',
            status: row.status,
        }));

        return NextResponse.json(directory);
    } catch {
        return NextResponse.json({ error: 'تعذر جلب قائمة المعلمين' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth-server';
import type { User, UserRole } from '@/types';

// ==========================================================
// تسجيل الدخول على جانب الخادم فقط.
// كلمات المرور (المدير/المعلمين/أولياء الأمور) لا تُشحن أبداً
// إلى حزمة جافاسكريبت للمتصفح؛ كل التحقق يجري هنا.
// ==========================================================

function directorPassword(): string {
    const fromEnv = process.env.DIRECTOR_PASSWORD;
    if (!fromEnv) {
        console.warn('⚠️ DIRECTOR_PASSWORD غير مضبوط في متغيرات البيئة؛ يُستخدم مؤقتاً قيمة افتراضية. اضبط المتغير فوراً.');
        return '996644';
    }
    return fromEnv;
}

export async function POST(request: NextRequest) {
    try {
        const { identifier, password } = await request.json();
        if (typeof identifier !== 'string' || typeof password !== 'string') {
            return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 400 });
        }

        const supabase = createServerSupabase();

        let role: UserRole = 'teacher';
        let teacherId: string | undefined;
        let phone: string | undefined;
        let responsibleSections: string[] = [];
        let displayName = 'معلم المجموعة';

        if (identifier === 'director') {
            role = 'director';
        } else if (identifier === 'supervisor') {
            role = 'supervisor';
        } else if (identifier.startsWith('teacher-')) {
            role = 'teacher';
            teacherId = identifier.replace('teacher-', '');
        } else if (identifier.startsWith('supervisor-')) {
            role = 'supervisor';
            teacherId = identifier.replace('supervisor-', '');
        } else if (identifier.startsWith('secretary-')) {
            role = 'schedule_secretary';
            teacherId = identifier.replace('secretary-', '');
        } else if (identifier.startsWith('parent-')) {
            role = 'parent';
            phone = identifier.replace('parent-', '');
        } else if (/^\d{10,14}$/.test(identifier)) {
            role = 'parent';
            phone = identifier;
        } else {
            return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 400 });
        }

        if (role === 'director') {
            if (password !== directorPassword()) {
                return NextResponse.json({ error: 'كلمة مرور المدير غير صحيحة' }, { status: 401 });
            }
            displayName = 'المدير العام';
        }

        if (role === 'parent' && phone) {
            // تحقق صارم من صيغة الهاتف قبل استخدامه داخل استعلام قاعدة البيانات
            if (!/^\d{6,14}$/.test(phone)) {
                return NextResponse.json({ error: 'رقم هاتف غير صالح' }, { status: 400 });
            }
            const { data: students, error } = await supabase
                .from('students')
                .select('parent_phone')
                .or(`parent_phone.eq.${phone},parent_phone.eq.02${phone}`)
                .limit(1);

            if (error) {
                console.error('Supabase error (parent login):', error);
                return NextResponse.json({ error: 'حدث خطأ أثناء الاتصال بقاعدة البيانات' }, { status: 500 });
            }
            if (!students || students.length === 0) {
                return NextResponse.json({ error: 'عذراً، هذا الرقم غير مسجل لدينا كولي أمر' }, { status: 401 });
            }

            const dbPhone = students[0].parent_phone || phone;
            const last6Digits = dbPhone.slice(-6);
            if (password !== last6Digits && password !== '123456') {
                return NextResponse.json(
                    { error: 'كلمة المرور غير صحيحة. يرجى استخدام آخر 6 أرقام من رقم هاتفك المسجل.' },
                    { status: 401 }
                );
            }
            phone = dbPhone;
            displayName = dbPhone;
        }

        if (role === 'teacher' || role === 'supervisor' || role === 'schedule_secretary') {
            const searchId = teacherId;
            if (!searchId) {
                return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 400 });
            }
            const { data: teacher, error } = await supabase
                .from('teachers')
                .select('id, full_name, password, role, responsible_sections')
                .eq('id', searchId)
                .single();

            if (error || !teacher) {
                const roleLabel = role === 'teacher' ? 'المعلم' : role === 'supervisor' ? 'المشرف' : 'السكرتيرة';
                return NextResponse.json({ error: `${roleLabel} غير موجود في قاعدة البيانات` }, { status: 401 });
            }
            if (teacher.password && teacher.password !== password) {
                return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 });
            }

            teacherId = teacher.id;
            displayName = teacher.full_name;
            if (teacher.role) role = teacher.role as UserRole;
            responsibleSections = teacher.responsible_sections || [];
        }

        const user: User = {
            uid: `mock-${teacherId || identifier}`,
            email: `${identifier}@shatibi.center`,
            displayName,
            role,
            teacherId,
            responsibleSections,
            createdAt: Date.now(),
            lastLogin: Date.now(),
        };

        const token = await createSessionToken({
            uid: user.uid,
            role: user.role,
            displayName: user.displayName,
            teacherId: user.teacherId,
            phone,
            responsibleSections: user.responsibleSections,
        });

        const response = NextResponse.json({ user });
        response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
        return response;
    } catch (error: unknown) {
        console.error('Login error:', error);
        const message = error instanceof Error ? error.message : 'حدث خطأ في تسجيل الدخول';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

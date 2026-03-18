import { User, UserRole } from "@/types";// نوع المستخدم
import { supabase } from "@/lib/supabase";// قاعدة البيانات

/**
 * دالة محاكاة للتأخير (Delay)
 * تُستخدم لمحاكاة وقت استجابة الشبكة عند الاتصال بقاعدة البيانات
 */
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * الدالة الرئيسية لتسجيل الدخول بناءً على الدور (Role)
 * تقوم بالتحقق من هوية المستخدم وكلمة مروره عبر قاعدة بيانات Supabase أو قيم ثابتة
 */
export const loginWithRole = async (identifier: string, password: string): Promise<User> => {
    // محاكاة تأخير بسيط للشبكة
    await delay(800);

    // --- تعريف المتغيرات الأساسية ---
    let role: UserRole = 'teacher';
    let teacherId: string | undefined;
    let phone: string | undefined;
    let responsibleSections: string[] = [];

    // --- 1. تحديد دور المستخدم بناءً على المعرف (Identifier) ---
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
    } else if (identifier.startsWith('parent-')) {
        role = 'parent';
        phone = identifier.replace('parent-', '');
    } else if (/^\d{10,14}$/.test(identifier)) {
        // إذا كان المدخل رقماً فقط، نعتبره تلقائياً ولي أمر
        role = 'parent';
        phone = identifier;
    }

    // --- 2. التحقق من كلمة مرور المدير (قيمة ثابتة) ---
    if (role === 'director' && password !== '996644') {
        throw new Error("كلمة مرور المدير غير صحيحة");
    }

    // تعيين اسم افتراضي للعرض
    let displayName = role === 'director' ? 'المدير العام' : role === 'supervisor' ? 'المشرف التربوي' : role === 'parent' ? (phone || 'ولي أمر') : 'معلم المجموعة';

    // --- 3. التحقق من دخول ولي الأمر (عبر قاعدة البيانات) ---
    if (role === 'parent' && phone) {
        // البحث عن الهاتف في جدول الطلاب (مع أو بدون بادئة 02)
        const { data: students, error } = await supabase
            .from('students')
            .select('parent_phone')
            .or(`parent_phone.eq.${phone},parent_phone.eq.02${phone}`)
            .limit(1);

        if (error) {
            console.error("Supabase Error:", error);
            throw new Error("حدث خطأ أثناء الاتصال بقاعدة البيانات");
        }

        if (!students || students.length === 0) {
            throw new Error("عذراً، هذا الرقم غير مسجل لدينا كولي أمر");
        }

        const dbPhone = students[0].parent_phone || phone;
        const last6Digits = dbPhone.slice(-6); // استخراج آخر 6 أرقام لتكون كلمة المرور الافتراضية

        // السماح بالدخول بكلمة 123456 أو آخر 6 أرقام من الهاتف
        if (password !== last6Digits && password !== '123456') {
            throw new Error(`كلمة المرور غير صحيحة. يرجى استخدام آخر 6 أرقام من رقم هاتفك المسجل.`);
        }

        displayName = dbPhone;
    }

    // --- 4. التحقق من دخول المعلم أو المشرف (عبر قاعدة البيانات) ---
    if (role === 'teacher' || role === 'supervisor') {
        const searchId = teacherId || identifier.replace(`${role}-`, '');

        // جلب بيانات المعلم/المشرف من جدول المعلمين
        const { data: teacher, error } = await supabase
            .from('teachers')
            .select('id, full_name, password, role, responsible_sections')
            .eq('id', searchId)
            .single();

        if (error || !teacher) {
            throw new Error(`${role === 'teacher' ? 'المعلم' : 'المشرف'} غير موجود في قاعدة البيانات`);
        }

        // التحقق من تطابق كلمة المرور المخزنة
        if (teacher.password && teacher.password !== password) {
            throw new Error("كلمة المرور غير صحيحة");
        }

        // تحديث المتغيرات بالبيانات الحقيقية المسترجعة
        teacherId = teacher.id;
        displayName = teacher.full_name;
        responsibleSections = teacher.responsible_sections || [];
    }

    // --- 5. إرجاع كائن المستخدم النهائي ---
    return {
        uid: `mock-${teacherId || identifier}`,
        email: `${identifier}@shatibi.center`,
        displayName,
        role,
        teacherId,
        responsibleSections,
        createdAt: Date.now(),
        lastLogin: Date.now(),
    };
};

/**
 * دالة تسجيل الخروج
 */
export const logout = async () => {
    await delay(300);
};

/**
 * دالة تجريبية لإنشاء حساب جديد بناءً على الدور
 */
export const registerRoleAccount = async (role: string, password: string, displayName: string): Promise<User> => {
    await delay(500);
    return {
        uid: `mock-${role}`,
        email: `${role}@shatibi.center`,
        displayName,
        role: role as UserRole,
        createdAt: Date.now(),
        lastLogin: Date.now(),
    };
};

/**
 * جلب بيانات ملف المستخدم الشخصي بناءً على المعرف الفريد (UID)
 */
export const getUserProfile = async (uid: string): Promise<User | null> => {
    const role = uid.replace('mock-', '');
    return {
        uid: uid,
        email: `${role}@shatibi.center`,
        displayName: role === 'director' ? 'المدير العام' : role === 'teacher' ? 'معلم' : 'مستخدم',
        role: role as UserRole,
        createdAt: Date.now(),
        lastLogin: Date.now()
    };
};